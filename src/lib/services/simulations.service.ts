import { supabase } from '../supabase'
import type { ServiceResult } from '../supabase'
import type { Json } from '../../types/database'
import { getCurrentPrices } from '../market.service'

export interface SimulationHolding {
  symbol: string
  amount: number
  expectedReturnPercent: number
  /** Live price at the moment the simulation was created. Null when a quote genuinely wasn't
   * available then (no API key configured, or the fetch failed) — never guessed. */
  entryPrice: number | null
}

export interface Simulation {
  id: string
  userId: string
  name: string
  startDate: string
  endDate: string | null
  capital: number
  holdings: SimulationHolding[]
  rationale: string | null
  createdAt: string
  updatedAt: string
}

// ── Row <-> domain mapping ──────────────────────────────────────
/** Tolerates malformed/legacy entries rather than throwing — same defensive shape-checking
 * parseAllocation() uses for profiles.portfolio_allocation. */
function parseHoldings(raw: Json | null | undefined): SimulationHolding[] {
  if (!Array.isArray(raw)) return []
  return raw.map((h): SimulationHolding => {
    const s = (h ?? {}) as Record<string, unknown>
    return {
      symbol: typeof s.symbol === 'string' ? s.symbol : '',
      amount: typeof s.amount === 'number' ? s.amount : 0,
      expectedReturnPercent: typeof s.expectedReturnPercent === 'number' ? s.expectedReturnPercent : 0,
      entryPrice: typeof s.entryPrice === 'number' ? s.entryPrice : null,
    }
  }).filter(h => h.symbol)
}

function holdingsToJson(holdings: SimulationHolding[]): Json {
  return holdings as unknown as Json
}

function mapRow(row: {
  id: string; user_id: string; name: string; start_date: string; end_date: string | null
  capital: number; holdings: Json; rationale: string | null; created_at: string; updated_at: string
}): Simulation {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    capital: row.capital,
    holdings: parseHoldings(row.holdings),
    rationale: row.rationale,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// ── getSimulations ────────────────────────────────────────────
/** All of a user's simulations, newest first. Public read (RLS) — used both for a creator's own
 * editable list (myProfile/InvestmentTab.tsx) and the read-only view on their public profile
 * (CreatorProfileInvestment.tsx). */
export async function getSimulations(userId: string): Promise<ServiceResult<Simulation[]>> {
  const { data, error } = await supabase
    .from('simulations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) return { data: null, error: error.message }
  return { data: (data ?? []).map(mapRow), error: null }
}

// ── createSimulation ──────────────────────────────────────────
export interface CreateSimulationInput {
  userId: string
  name: string
  startDate?: string
  endDate?: string
  capital: number
  holdings: { symbol: string; amount: number; expectedReturnPercent: number }[]
  rationale?: string
}

/** Fetches a live entry price for every holding (best-effort — a failed quote leaves that
 * holding's entryPrice null rather than blocking creation) before inserting, so "actual
 * performance" has a real baseline to compare against later. */
export async function createSimulation(input: CreateSimulationInput): Promise<ServiceResult<Simulation>> {
  const symbols = input.holdings.map(h => h.symbol)
  const prices = await getCurrentPrices(symbols)

  const holdings: SimulationHolding[] = input.holdings.map(h => ({
    symbol: h.symbol,
    amount: h.amount,
    expectedReturnPercent: h.expectedReturnPercent,
    entryPrice: prices.get(h.symbol) ?? null,
  }))

  const { data, error } = await supabase
    .from('simulations')
    .insert({
      user_id: input.userId,
      name: input.name,
      start_date: input.startDate,
      end_date: input.endDate,
      capital: input.capital,
      holdings: holdingsToJson(holdings),
      rationale: input.rationale,
    })
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data: mapRow(data), error: null }
}

// ── deleteSimulation ──────────────────────────────────────────
export async function deleteSimulation(id: string): Promise<ServiceResult<void>> {
  const { error } = await supabase.from('simulations').delete().eq('id', id)
  if (error) return { data: null, error: error.message }
  return { data: null, error: null }
}

// ── getSimulationPerformance ──────────────────────────────────
export interface SimulationPerformance {
  /** Capital-weighted average of each holding's own expected_return_percent — the user's own
   * stated prediction. Always available immediately; no market data involved. */
  hypothesisPercent: number
  hypothesisValue: number
  /** Capital-weighted average of (current live price - entry price) / entry price. Null when it
   * can't be computed honestly — a real quote is missing for one or more holdings (no API key,
   * or a fetch failed) — never partially blended from incomplete data. */
  actualPercent: number | null
  actualValue: number | null
}

/** Computes performance for one simulation, fetching current prices live. Cash (capital not
 * allocated to any holding) contributes 0% to both figures, same as a real portfolio. */
export async function getSimulationPerformance(sim: Simulation): Promise<SimulationPerformance> {
  if (sim.holdings.length === 0 || sim.capital <= 0) {
    return { hypothesisPercent: 0, hypothesisValue: sim.capital, actualPercent: 0, actualValue: sim.capital }
  }

  const hypothesisPercent = sim.holdings.reduce(
    (sum, h) => sum + (h.amount / sim.capital) * h.expectedReturnPercent, 0
  )

  const symbols = sim.holdings.map(h => h.symbol)
  const currentPrices = await getCurrentPrices(symbols)

  const allPriced = sim.holdings.every(h => h.entryPrice !== null && currentPrices.has(h.symbol))
  let actualPercent: number | null = null
  if (allPriced) {
    actualPercent = sim.holdings.reduce((sum, h) => {
      const current = currentPrices.get(h.symbol)!
      const returnPct = ((current - h.entryPrice!) / h.entryPrice!) * 100
      return sum + (h.amount / sim.capital) * returnPct
    }, 0)
  }

  return {
    hypothesisPercent,
    hypothesisValue: sim.capital * (1 + hypothesisPercent / 100),
    actualPercent,
    actualValue: actualPercent === null ? null : sim.capital * (1 + actualPercent / 100),
  }
}
