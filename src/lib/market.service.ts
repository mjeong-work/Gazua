/**
 * market.service.ts
 *
 * Endpoints used — both confirmed free-tier on Polygon.io:
 *
 *   /v2/aggs/ticker/{symbol}/range/{mult}/{span}/{from}/{to}
 *     → historical OHLC bars (daily, hourly, minute)
 *     → used for: price + % change (last 2 daily bars), all chart ranges
 *
 *   /v2/aggs/ticker/{symbol}/prev
 *     → NOT used (only returns 1 bar — can't derive % change from it alone)
 *
 * Snapshot endpoints (/v2/snapshot/...) require Starter plan — intentionally avoided.
 *
 * Crypto tickers use the X: prefix (e.g. X:BTCUSD) with the same endpoints.
 * 15-minute in-memory cache per ticker/range to stay within the free rate limit.
 */

import { MARKET_INDICES, TICKER_CHART_DATA } from '../app/data/marketData'
import type { MarketIndex } from '../app/data/marketData'

const API_KEY = import.meta.env.VITE_POLYGON_API_KEY as string | undefined
const BASE = 'https://api.polygon.io'
const TTL = 15 * 60 * 1000

// ── Types ────────────────────────────────────────────────────────────────────

export interface LiveTickerInfo {
  price: string
  changeAmt: string
  change: string
  positive: boolean
}

export interface TickerPrice {
  price: string
  change1D: number
}

export type TimeRange = '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL'

interface Bar { t: number; o: number; c: number }

interface Snapshot {
  price: number   // most recent close
  change: number  // absolute day-over-day change
  changePct: number
}

interface CacheEntry<T> { data: T; ts: number }

// ── Caches ───────────────────────────────────────────────────────────────────

const snapshotCache = new Map<string, CacheEntry<Snapshot>>()
const chartCache    = new Map<string, CacheEntry<{ time: string; value: number }[]>>()
let   indicesCache: CacheEntry<MarketIndex[]> | null = null

// ── Helpers ───────────────────────────────────────────────────────────────────

function fresh<T>(e: CacheEntry<T> | null | undefined): e is CacheEntry<T> {
  return !!e && Date.now() - e.ts < TTL
}

function toSymbol(ticker: string): string {
  if (ticker === 'BTC') return 'X:BTCUSD'
  if (ticker === 'ETH') return 'X:ETHUSD'
  return ticker
}

function isCrypto(ticker: string): boolean {
  return ticker === 'BTC' || ticker === 'ETH'
}

function fmtDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return fmtDate(d)
}

function fmtPrice(price: number, crypto: boolean): string {
  if (crypto) {
    return price >= 1000
      ? `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
      : `$${price.toFixed(2)}`
  }
  return price >= 1000
    ? `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `$${price.toFixed(2)}`
}

function fmtLabel(ts: number, span: string): string {
  const d = new Date(ts)
  if (span === 'minute') {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }
  if (span === 'hour') {
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric' })
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Core fetch ────────────────────────────────────────────────────────────────

async function fetchBars(
  symbol: string,
  mult: number,
  span: string,
  from: string,
  to: string,
): Promise<Bar[] | null> {
  if (!API_KEY) return null
  const url =
    `${BASE}/v2/aggs/ticker/${symbol}/range/${mult}/${span}/${from}/${to}` +
    `?adjusted=true&sort=asc&limit=500&apiKey=${API_KEY}`
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const json = await res.json()
    return (json.results as Bar[]) ?? null
  } catch {
    return null
  }
}

// ── Snapshot: price + day-over-day % change ───────────────────────────────────
//
// Fetches the last 7 calendar days of daily bars (covers weekends + any
// trading gap) and compares the two most-recent trading day closes.

async function fetchSnapshot(ticker: string): Promise<Snapshot | null> {
  const cached = snapshotCache.get(ticker)
  if (fresh(cached)) return cached.data

  const bars = await fetchBars(toSymbol(ticker), 1, 'day', daysAgo(7), fmtDate(new Date()))
  if (!bars || bars.length < 2) return null

  const prev = bars[bars.length - 2]
  const curr = bars[bars.length - 1]
  const changePct = ((curr.c - prev.c) / prev.c) * 100
  const snap: Snapshot = { price: curr.c, change: curr.c - prev.c, changePct }
  snapshotCache.set(ticker, { data: snap, ts: Date.now() })
  return snap
}

// ── Public: ticker price info ─────────────────────────────────────────────────

export async function getTickerInfo(ticker: string): Promise<LiveTickerInfo | null> {
  if (!API_KEY) return null
  const snap = await fetchSnapshot(ticker)
  if (!snap) return null
  const crypto = isCrypto(ticker)
  const sign = snap.change >= 0 ? '+' : '-'
  return {
    price:     fmtPrice(snap.price, crypto),
    changeAmt: `${sign}${fmtPrice(Math.abs(snap.change), crypto)}`,
    change:    `${sign}${Math.abs(snap.changePct).toFixed(2)}%`,
    positive:  snap.changePct >= 0,
  }
}

// ── Public: chart data ────────────────────────────────────────────────────────
//
// 1D  → 5-minute intraday bars (yesterday → today; covers last trading session)
// 1W  → 1-hour bars
// 1M+ → 1-day bars
// ALL → 1-week bars

function rangeParams(range: TimeRange): { mult: number; span: string; from: string } {
  switch (range) {
    case '1D':  return { mult: 5, span: 'minute', from: daysAgo(2)    }
    case '1W':  return { mult: 1, span: 'hour',   from: daysAgo(7)    }
    case '1M':  return { mult: 1, span: 'day',    from: daysAgo(30)   }
    case '3M':  return { mult: 1, span: 'day',    from: daysAgo(90)   }
    case '1Y':  return { mult: 1, span: 'day',    from: daysAgo(365)  }
    case 'ALL': return { mult: 1, span: 'week',   from: daysAgo(1825) }
  }
}

export async function getTickerChart(
  ticker: string,
  range: TimeRange,
): Promise<{ time: string; value: number }[]> {
  const fallback = TICKER_CHART_DATA[ticker]?.chartData ?? []
  if (!API_KEY) return fallback

  const key = `${ticker}:${range}`
  const cached = chartCache.get(key)
  if (fresh(cached)) return cached.data

  const { mult, span, from } = rangeParams(range)
  const bars = await fetchBars(toSymbol(ticker), mult, span, from, fmtDate(new Date()))
  if (!bars?.length) return fallback

  const data = bars.map(b => ({ time: fmtLabel(b.t, span), value: b.c }))
  chartCache.set(key, { data, ts: Date.now() })
  return data
}

// ── Public: market indices (SPY, BTC, GLD) ────────────────────────────────────

const INDEX_TICKERS = ['SPY', 'QQQ', 'BTC', 'GLD'] as const
const INDEX_LABELS: Record<string, string> = { SPY: 'S&P 500', QQQ: 'Nasdaq', BTC: 'Bitcoin', GLD: 'Gold' }
const INDEX_IDS:    Record<string, string> = { SPY: 'sp500',   QQQ: 'qqq',    BTC: 'btc',     GLD: 'gold'  }

export async function getMarketIndices(): Promise<MarketIndex[]> {
  if (fresh(indicesCache)) return indicesCache.data
  if (!API_KEY) return MARKET_INDICES

  const snaps = await Promise.allSettled(INDEX_TICKERS.map(fetchSnapshot))

  const indices: MarketIndex[] = INDEX_TICKERS.map((t, i) => {
    const fallback = MARKET_INDICES.find(m => m.id === INDEX_IDS[t]) ?? MARKET_INDICES[0]
    const r = snaps[i]
    if (r.status !== 'fulfilled' || !r.value) return fallback
    const snap = r.value
    const sign = snap.changePct >= 0 ? '+' : ''
    return {
      id:            INDEX_IDS[t],
      name:          INDEX_LABELS[t],
      value:         fmtPrice(snap.price, t === 'BTC'),
      change:        `${sign}${snap.changePct.toFixed(2)}%`,
      changePercent: snap.changePct,
      positive:      snap.changePct >= 0,
    }
  })

  indicesCache = { data: indices, ts: Date.now() }
  return indices
}

// ── Public: watchlist prices ──────────────────────────────────────────────────

export async function getWatchlistPrices(tickers: string[]): Promise<Map<string, TickerPrice>> {
  const map = new Map<string, TickerPrice>()
  if (!API_KEY || !tickers.length) return map

  await Promise.allSettled(
    [...new Set(tickers)].map(async ticker => {
      const snap = await fetchSnapshot(ticker)
      if (!snap) return
      map.set(ticker, {
        price:    fmtPrice(snap.price, isCrypto(ticker)),
        change1D: parseFloat(snap.changePct.toFixed(2)),
      })
    }),
  )
  return map
}
