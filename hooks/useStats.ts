'use client'

import { useMemo } from 'react'
import { Trade, TradeStats, ClosedTrade, EquityPoint, StrategyStats } from '@/types'
import { matchTrades, calcStats, buildEquityCurve, calcStrategyStats, calcPositions } from '@/lib/calc'

export function useStats(trades: Trade[]) {
  const closedTrades = useMemo<ClosedTrade[]>(() => matchTrades(trades), [trades])

  const stats = useMemo<TradeStats>(() => calcStats(closedTrades), [closedTrades])

  const equityCurve = useMemo<EquityPoint[]>(() => buildEquityCurve(closedTrades), [closedTrades])

  const strategyStats = useMemo<StrategyStats[]>(() => calcStrategyStats(closedTrades), [closedTrades])

  const positions = useMemo(() => calcPositions(trades), [trades])

  return { closedTrades, stats, equityCurve, strategyStats, positions }
}
