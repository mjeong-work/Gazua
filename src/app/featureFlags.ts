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
