// Supabase Edge Function — stripe-checkout
// Creates a Stripe Checkout session for platform subscriptions.
// Deploy: supabase functions deploy stripe-checkout --project-ref <your-project-ref>
// Secrets: supabase secrets set STRIPE_SECRET_KEY=sk_...
//          supabase secrets set STRIPE_PRICE_ID_ANALYST=price_...
//          supabase secrets set STRIPE_PRICE_ID_EDUCATOR=price_...
//          supabase secrets set ALLOWED_ORIGIN=https://yourdomain.com

// deno-lint-ignore-file no-explicit-any

import Stripe from 'npm:stripe'
import { createClient } from 'npm:@supabase/supabase-js'

const LOCALHOST = 'http://localhost:5173'

function resolveOrigin(origin: string | null): string {
  if (!origin) return LOCALHOST
  const prod = Deno.env.get('ALLOWED_ORIGIN') ?? ''
  if (origin === LOCALHOST || (prod !== '' && origin === prod)) return origin
  return LOCALHOST
}

function corsHeaders(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': resolveOrigin(origin),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
    'Access-Control-Max-Age': '86400',
  }
}

type Tier = 'analyst' | 'educator'

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin')

  // OPTIONS preflight must be first — before any env reads or logic
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders(origin) })
  }

  const cors = corsHeaders(origin)

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: cors })
  }

  // Verify the caller's JWT and derive userId from it.
  // Never trust userId from the request body — a client could pass any UUID.
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized.' }),
      { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }
  const userId = user.id
  const email = user.email ?? ''

  const secretKey = Deno.env.get('STRIPE_SECRET_KEY')
  if (!secretKey) {
    console.error('[stripe-checkout] STRIPE_SECRET_KEY secret is not set.')
    return new Response(
      JSON.stringify({ error: 'Server configuration error.' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }

  let tier: Tier
  try {
    const body = await req.json()
    tier = body.tier
    if (!tier) throw new Error('Missing required field: tier')
    if (tier !== 'analyst' && tier !== 'educator') throw new Error('tier must be "analyst" or "educator"')
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `Bad request: ${(err as Error).message}` }),
      { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }

  const analystPriceId = Deno.env.get('STRIPE_PRICE_ID_ANALYST')
  const educatorPriceId = Deno.env.get('STRIPE_PRICE_ID_EDUCATOR')
  const priceId = tier === 'analyst' ? analystPriceId : educatorPriceId

  if (!priceId) {
    console.error(`[stripe-checkout] STRIPE_PRICE_ID_${tier.toUpperCase()} secret is not set.`)
    return new Response(
      JSON.stringify({ error: 'Server configuration error.' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }

  const frontendOrigin = resolveOrigin(origin)
  const stripe = new Stripe(secretKey)

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${frontendOrigin}/subscription/welcome?tier=${tier}`,
      cancel_url: `${frontendOrigin}/pricing`,
      client_reference_id: userId,
      customer_email: email,
      metadata: { type: 'platform', tier },
    } as any)

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[stripe-checkout] Stripe error:', message)
    return new Response(
      JSON.stringify({ error: 'Failed to create checkout session.', detail: message }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }
})
