// Supabase Edge Function — claude-insights
// Uses the Anthropic REST API via direct fetch — no npm imports.
// Deploy: supabase functions deploy claude-insights --project-ref <your-project-ref>
// Secrets: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//          supabase secrets set ALLOWED_ORIGIN=https://yourdomain.com

// ── System prompt ─────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are Gazua AI, an educational investment insight engine embedded in a social finance learning platform. Your role is to analyze patterns in a user's in-app engagement and surface personalized educational observations.

ABSOLUTE CONSTRAINTS — violate none of these:
• All output is for educational purposes only. Never provide financial advice.
• Never recommend buying, selling, or holding any specific security.
• Never predict price movements, future returns, or performance outcomes.
• Never include dollar amounts, price targets, or return percentages.
• Never frame observations as investment recommendations.
• Ground all observations strictly in the behavioral data provided. Do not invent signals.

TONE: Write like a thoughtful friend who noticed what the user has been reading. Be specific, warm, and curious. Avoid generic platitudes. Avoid robotic or robo-advisor phrasing. Avoid urgency or hype.

INPUT: You will receive a JSON object describing the user's watchlist, saved content patterns, content engagement by category, and onboarding profile.

OUTPUT: Respond with a single valid JSON object — no markdown fences, no preamble, no trailing explanation. Match this schema exactly:

{
  "personality": {
    "title": "2-5 word phrase describing their investment learning style",
    "summary": "2-3 sentences in second person describing their apparent approach, grounded in their data",
    "traits": ["3-4 short phrases under 8 words each describing distinct observed patterns"]
  },
  "trendingAssets": [
    { "ticker": "ticker from their watchlist", "context": "under 15 words — why relevant to them" }
  ],
  "recommendations": [
    { "type": "creator | post | model", "title": "specific content title", "creator": "creator name", "reason": "under 15 words" }
  ],
  "styleBreakdown": [
    { "label": "Plain-English category name", "percentage": 0 }
  ]
}

Rules for styleBreakdown: 3-5 items, integer percentages only, must sum to exactly 100.
Rules for trendingAssets: return 3-4 items.
Rules for recommendations: return 3-4 items.`

// ── CORS ──────────────────────────────────────────────────────────
// Both env reads are inside the handler to avoid module-level permission issues.
function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  const alwaysAllowed = 'http://localhost:5173'
  const prodOrigin = Deno.env.get('ALLOWED_ORIGIN') ?? ''

  const allowed =
    requestOrigin === alwaysAllowed || (prodOrigin && requestOrigin === prodOrigin)
      ? requestOrigin!
      : alwaysAllowed

  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  }
}

// ── Handler ───────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const origin = req.headers.get('Origin')
  const cors = getCorsHeaders(origin)

  // Preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors })
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: cors })
  }

  // API key — read inside handler, not at module level
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) {
    console.error('[claude-insights] ANTHROPIC_API_KEY secret is not set.')
    return new Response(
      JSON.stringify({ error: 'Server configuration error.' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }

  // Parse request body
  let userActivity: unknown
  try {
    const body = await req.json()
    userActivity = body.userActivity
    if (!userActivity) throw new Error('Missing userActivity in request body.')
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `Bad request: ${(err as Error).message}` }),
      { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }

  // Call Anthropic REST API
  // system is a plain string — no beta header, no cache_control array.
  // The prompt-caching beta requires a minimum token threshold (2048 tokens for
  // Claude 4 models) that this system prompt does not meet, causing a 400 error.
  let claudeRes: Response
  try {
    claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-opus-5',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: JSON.stringify(userActivity, null, 2),
          },
        ],
      }),
    })
  } catch (err) {
    console.error('[claude-insights] Network error calling Anthropic:', err)
    return new Response(
      JSON.stringify({ error: 'Failed to reach Anthropic API.' }),
      { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }

  if (!claudeRes.ok) {
    const errBody = await claudeRes.text()
    console.error(`[claude-insights] Anthropic ${claudeRes.status}:`, errBody)
    return new Response(
      JSON.stringify({ error: `Anthropic API error (${claudeRes.status}).` }),
      { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }

  // Extract text block from response
  const claudeBody = await claudeRes.json() as {
    content: Array<{ type: string; text?: string }>
  }

  const block = claudeBody.content?.find((b) => b.type === 'text')
  if (!block?.text) {
    console.error('[claude-insights] No text block in Claude response:', JSON.stringify(claudeBody))
    return new Response(
      JSON.stringify({ error: 'Unexpected response format from Claude.' }),
      { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }

  // Parse JSON — strip markdown fences if Claude wrapped it despite instructions
  const raw = block.text.trim()
  const jsonStr = raw.startsWith('```')
    ? raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    : raw

  let insights: unknown
  try {
    insights = JSON.parse(jsonStr)
  } catch {
    console.error('[claude-insights] Malformed JSON from Claude:', raw)
    return new Response(
      JSON.stringify({ error: 'Claude returned malformed JSON.' }),
      { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }

  return new Response(
    JSON.stringify({ insights }),
    { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
  )
})
