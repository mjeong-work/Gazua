// Supabase Edge Function — stripe-billing-portal
// Creates a Stripe Billing Portal session for an existing subscriber.
// Deploy: supabase functions deploy stripe-billing-portal --project-ref <your-project-ref>
// Secrets: supabase secrets set STRIPE_SECRET_KEY=sk_...
//          supabase secrets set ALLOWED_ORIGIN=https://yourdomain.com

// deno-lint-ignore-file no-explicit-any

import Stripe from 'npm:stripe'
import { createClient } from 'npm:@supabase/supabase-js'

function getCorsHeaders(origin: string | null): Record<string, string> {
  const alwaysAllowed = 'http://localhost:5173'
  const prodOrigin = Deno.env.get('ALLOWED_ORIGIN') ?? ''
  const allowed =
    origin === alwaysAllowed || (prodOrigin && origin === prodOrigin)
      ? origin!
      : alwaysAllowed
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  }
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin')
  const cors = getCorsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors })
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: cors })
  }

  const secretKey = Deno.env.get('STRIPE_SECRET_KEY')
  if (!secretKey) {
    console.error('[stripe-billing-portal] STRIPE_SECRET_KEY secret is not set.')
    return new Response(
      JSON.stringify({ error: 'Server configuration error.' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }

  // Derive userId from the verified JWT — never trust it from the request body.
  // Without this, any authenticated user could open another user's billing portal.
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single()

  if (!profile?.stripe_customer_id) {
    return new Response(
      JSON.stringify({ error: 'No billing account found. Please subscribe first.' }),
      { status: 404, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }

  const frontendOrigin =
    (origin && (origin === 'http://localhost:5173' || origin === (Deno.env.get('ALLOWED_ORIGIN') ?? '')))
      ? origin
      : (Deno.env.get('ALLOWED_ORIGIN') ?? 'http://localhost:5173')

  const stripe = new Stripe(secretKey)

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${frontendOrigin}/account`,
    })

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('[stripe-billing-portal] Stripe error:', err)
    return new Response(
      JSON.stringify({ error: 'Failed to create billing portal session.' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }
})
