// Supabase Edge Function — stripe-webhook
// Handles Stripe billing events and keeps the DB in sync.
// Deploy: supabase functions deploy stripe-webhook --project-ref <your-project-ref>
// Secrets: supabase secrets set STRIPE_SECRET_KEY=sk_...
//          supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
//          supabase secrets set STRIPE_PRICE_ID_ANALYST=price_...
//          supabase secrets set STRIPE_PRICE_ID_EDUCATOR=price_...
// Then register the webhook URL in Stripe Dashboard:
//   https://<project-ref>.supabase.co/functions/v1/stripe-webhook

// deno-lint-ignore-file no-explicit-any

import Stripe from 'npm:stripe'
import { createClient } from 'npm:@supabase/supabase-js'

type SubscriptionTier = 'free' | 'analyst' | 'educator'
type SubscriptionStatus =
  | 'active' | 'trialing' | 'past_due' | 'canceled'
  | 'incomplete' | 'incomplete_expired' | 'paused' | 'unpaid'

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const secretKey = Deno.env.get('STRIPE_SECRET_KEY')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  if (!secretKey || !webhookSecret) {
    console.error('[stripe-webhook] Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET.')
    return new Response('Server configuration error.', { status: 500 })
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return new Response('Missing stripe-signature header.', { status: 400 })
  }

  const body = await req.text()
  const stripe = new Stripe(secretKey)

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)
  } catch (err) {
    console.error('[stripe-webhook] Signature verification failed:', err)
    return new Response(`Webhook signature verification failed: ${(err as Error).message}`, { status: 400 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const analystPriceId = Deno.env.get('STRIPE_PRICE_ID_ANALYST') ?? ''
  const educatorPriceId = Deno.env.get('STRIPE_PRICE_ID_EDUCATOR') ?? ''

  function getTier(priceId: string): SubscriptionTier {
    if (priceId === analystPriceId) return 'analyst'
    if (priceId === educatorPriceId) return 'educator'
    return 'free'
  }

  async function getUserByCustomerId(customerId: string): Promise<string | null> {
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single()
    return data?.id ?? null
  }

  try {
    switch (event.type) {

      // ── Payment completed: sync customer ID + tier immediately ──
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.client_reference_id
        const customerId = typeof session.customer === 'string' ? session.customer : null

        if (!userId) {
          console.warn('[stripe-webhook] checkout.session.completed missing client_reference_id')
          break
        }

        // tier was stored in session metadata at checkout creation time — no extra API call needed
        const tier = (session.metadata?.tier ?? 'free') as SubscriptionTier

        // Always update profiles — this is the critical path; run it first and unconditionally
        const profileUpdates: Record<string, unknown> = { subscription_tier: tier }
        if (customerId) profileUpdates.stripe_customer_id = customerId

        const { error: profileErr } = await supabase
          .from('profiles')
          .update(profileUpdates)
          .eq('id', userId)

        if (profileErr) {
          console.error('[stripe-webhook] Failed to update profile:', profileErr.message)
        } else {
          console.log(`[stripe-webhook] checkout.session.completed: user ${userId} → tier=${tier}`)
        }

        // Best-effort: sync the subscriptions table. Failures here do NOT block the profile update.
        const subId = typeof session.subscription === 'string' ? session.subscription : null
        if (subId) {
          try {
            const sub = await stripe.subscriptions.retrieve(subId)
            const priceId = (sub.items.data[0]?.price as any)?.id ?? ''
            const status = sub.status as SubscriptionStatus
            await supabase.from('subscriptions').upsert(
              {
                user_id: userId,
                stripe_customer_id: customerId ?? '',
                stripe_subscription_id: sub.id,
                stripe_price_id: priceId,
                tier,
                status,
                current_period_start: sub.current_period_start
                  ? new Date((sub.current_period_start as number) * 1000).toISOString()
                  : null,
                current_period_end: sub.current_period_end
                  ? new Date((sub.current_period_end as number) * 1000).toISOString()
                  : null,
                cancel_at_period_end: sub.cancel_at_period_end ?? false,
                canceled_at: sub.canceled_at
                  ? new Date((sub.canceled_at as number) * 1000).toISOString()
                  : null,
                trial_end: sub.trial_end
                  ? new Date((sub.trial_end as number) * 1000).toISOString()
                  : null,
              },
              { onConflict: 'stripe_subscription_id' },
            )
          } catch (subErr) {
            console.error('[stripe-webhook] subscriptions upsert failed (non-fatal):', subErr)
          }
        }
        break
      }

      // ── Subscription created or updated: sync subscriptions table + tier ──
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = typeof sub.customer === 'string' ? sub.customer : ''
        const priceId = (sub.items.data[0]?.price as any)?.id ?? ''
        const tier = getTier(priceId)
        const status = sub.status as SubscriptionStatus

        const userId = await getUserByCustomerId(customerId)
        if (!userId) {
          console.warn(`[stripe-webhook] No profile found for customer ${customerId}`)
          break
        }

        await supabase.from('subscriptions').upsert(
          {
            user_id: userId,
            stripe_customer_id: customerId,
            stripe_subscription_id: sub.id,
            stripe_price_id: priceId,
            tier,
            status,
            current_period_start: sub.current_period_start
              ? new Date((sub.current_period_start as number) * 1000).toISOString()
              : null,
            current_period_end: sub.current_period_end
              ? new Date((sub.current_period_end as number) * 1000).toISOString()
              : null,
            cancel_at_period_end: sub.cancel_at_period_end ?? false,
            canceled_at: sub.canceled_at
              ? new Date((sub.canceled_at as number) * 1000).toISOString()
              : null,
            trial_end: sub.trial_end
              ? new Date((sub.trial_end as number) * 1000).toISOString()
              : null,
          },
          { onConflict: 'stripe_subscription_id' },
        )

        await supabase
          .from('profiles')
          .update({ subscription_tier: tier })
          .eq('id', userId)

        break
      }

      // ── Subscription deleted: set tier back to free ──
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = typeof sub.customer === 'string' ? sub.customer : ''

        const userId = await getUserByCustomerId(customerId)
        if (!userId) break

        await supabase
          .from('subscriptions')
          .update({ status: 'canceled', canceled_at: new Date().toISOString() })
          .eq('stripe_subscription_id', sub.id)

        await supabase
          .from('profiles')
          .update({ subscription_tier: 'free' })
          .eq('id', userId)

        break
      }

      // ── Invoice paid: ensure subscription is marked active ──
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        const subId = typeof invoice.subscription === 'string' ? invoice.subscription : null
        if (subId) {
          await supabase
            .from('subscriptions')
            .update({ status: 'active' })
            .eq('stripe_subscription_id', subId)
        }
        break
      }

      // ── Invoice payment failed: mark as past_due ──
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subId = typeof invoice.subscription === 'string' ? invoice.subscription : null
        if (subId) {
          await supabase
            .from('subscriptions')
            .update({ status: 'past_due' })
            .eq('stripe_subscription_id', subId)
        }
        break
      }

      default:
        console.log(`[stripe-webhook] Unhandled event type: ${event.type}`)
    }
  } catch (err) {
    console.error(`[stripe-webhook] Error handling ${event.type}:`, err)
    return new Response('Internal server error.', { status: 500 })
  }

  return new Response(
    JSON.stringify({ received: true }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
})
