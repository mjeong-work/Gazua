// Feature flags for functionality that's built but not ready to ship yet.
// Flip a flag to re-enable the corresponding feature — no need to hunt through components.

/** Subscribe buttons on creator profile pages. Disabled for MVP. */
export const SUBSCRIBE_ENABLED = false;

/**
 * Actual Portfolio view + the Simulator/Actual toggle on the Investment tab
 * (/my-profile and /profile/:id/investment). Disabled for MVP — Portfolio
 * Simulator is locked on as the only view.
 */
export const ACTUAL_PORTFOLIO_ENABLED = false;

/**
 * Finance Models (upload/download Excel templates, Python scripts, calculators) — the whole
 * /models surface (ModelHubPage) plus the "Finance Model" option on /create. Intentionally out
 * of MVP scope, not a wiring gap — the feature itself (upload, download, browse) is fully built,
 * just not part of this launch. Route redirects to /main and the Create tile is hidden while off.
 */
export const MODELS_ENABLED = false;

/**
 * Real Stripe checkout for paid tiers (PricingPage's "Start Free Trial"/"Start Creating").
 * Disabled during closed beta — the checkout Edge Function creates a real Stripe Checkout
 * session against whatever price is configured server-side (STRIPE_PRICE_ID_ANALYST /
 * _EDUCATOR), with no code-level guarantee it's actually $0, so leaving this on risks a beta
 * tester being charged real money despite the page's "Beta: $0/month" copy. All premium
 * features are already available on the Free plan during beta, so paid checkout isn't needed
 * for testers to use the app. Flip this back on once pricing is ready for real billing.
 */
export const PAID_CHECKOUT_ENABLED = false;
