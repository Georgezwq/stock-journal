import { Trade, ClosedTrade, TradeStats, EquityPoint, StrategyStats, Position } from '@/types'
import { differenceInCalendarDays, parseISO } from 'date-fns'

/**
 * Match BUY/SELL trades to compute closed positions (FIFO)
 * 支持做多（先买后卖）和做空（先卖后买）两种方向
 */
export function matchTrades(trades: Trade[]): ClosedTrade[] {
  const closed: ClosedTrade[] = []

  // Group by symbol
  const bySymbol = trades.reduce<Record<string, Trade[]>>((acc, t) => {
    acc[t.symbol] = acc[t.symbol] || []
    acc[t.symbol].push(t)
    return acc
  }, {})

  for (const [, symbolTrades] of Object.entries(bySymbol)) {
    const sorted = [...symbolTrades].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    // 做多队列：持有买入仓位等待卖出
    const longQueue: Array<{ trade: Trade; remainingQty: number }> = []
    // 做空队列：持有卖出仓位等待平仓买入
    const shortQueue: Array<{ trade: Trade; remainingQty: number }> = []

    for (const trade of sorted) {
      if (trade.direction === 'BUY') {
        // 先尝试平掉做空仓位
        let buyQty = trade.quantity
        while (buyQty > 0 && shortQueue.length > 0) {
          const front = shortQueue[0]
          const matchedQty = Math.min(buyQty, front.remainingQty)

          // 做空：开仓是 SELL，平仓是 BUY；盈利 = 开仓价 - 平仓价
          const openFeeAlloc = front.trade.fee * (matchedQty / front.trade.quantity)
          const closeFeeAlloc = trade.fee * (matchedQty / trade.quantity)

          const pnl =
            (front.trade.price - trade.price) * matchedQty -
            openFeeAlloc -
            closeFeeAlloc

          const realCost = front.trade.price * matchedQty + openFeeAlloc
          const pnlPct = realCost !== 0 ? (pnl / realCost) * 100 : 0

          const holdingDays = differenceInCalendarDays(
            parseISO(trade.date.split('T')[0]),
            parseISO(front.trade.date.split('T')[0])
          )

          closed.push({
            symbol: trade.symbol,
            name: trade.name || front.trade.name,
            buyDate: trade.date,        // 平仓买入日
            sellDate: front.trade.date, // 开仓卖出日
            buyPrice: trade.price,
            sellPrice: front.trade.price,
            quantity: matchedQty,
            pnl: parseFloat(pnl.toFixed(2)),
            pnlPct: parseFloat(pnlPct.toFixed(2)),
            holdingDays,
            strategy: trade.strategy || front.trade.strategy,
            emotion: trade.emotion || front.trade.emotion,
          })

          front.remainingQty -= matchedQty
          buyQty -= matchedQty
          if (front.remainingQty <= 0) shortQueue.shift()
        }

        // 剩余买入数量进入做多队列
        if (buyQty > 0) {
          longQueue.push({ trade, remainingQty: buyQty })
        }

      } else if (trade.direction === 'SELL') {
        // 先尝试平掉做多仓位
        let sellQty = trade.quantity
        while (sellQty > 0 && longQueue.length > 0) {
          const front = longQueue[0]
          const matchedQty = Math.min(sellQty, front.remainingQty)

          const buyFeeAlloc = front.trade.fee * (matchedQty / front.trade.quantity)
          const sellFeeAlloc = trade.fee * (matchedQty / trade.quantity)

          const pnl =
            (trade.price - front.trade.price) * matchedQty -
            buyFeeAlloc -
            sellFeeAlloc

          const realCost = front.trade.price * matchedQty + buyFeeAlloc
          const pnlPct = realCost !== 0 ? (pnl / realCost) * 100 : 0

          const holdingDays = differenceInCalendarDays(
            parseISO(trade.date.split('T')[0]),
            parseISO(front.trade.date.split('T')[0])
          )

          closed.push({
            symbol: trade.symbol,
            name: trade.name || front.trade.name,
            buyDate: front.trade.date,
            sellDate: trade.date,
            buyPrice: front.trade.price,
            sellPrice: trade.price,
            quantity: matchedQty,
            pnl: parseFloat(pnl.toFixed(2)),
            pnlPct: parseFloat(pnlPct.toFixed(2)),
            holdingDays,
            strategy: trade.strategy || front.trade.strategy,
            emotion: trade.emotion || front.trade.emotion,
          })

          front.remainingQty -= matchedQty
          sellQty -= matchedQty
          if (front.remainingQty <= 0) longQueue.shift()
        }

        // 剩余卖出数量进入做空队列
        if (sellQty > 0) {
          shortQueue.push({ trade, remainingQty: sellQty })
        }
      }
    }
  }

  return closed.sort((a, b) => new Date(a.sellDate).getTime() - new Date(b.sellDate).getTime())
}

/**
 * Calculate current open positions
 * 支持做多净持仓（正）和做空净持仓（负）
 */
export function calcPositions(trades: Trade[]): Position[] {
  const bySymbol = trades.reduce<Record<string, Trade[]>>((acc, t) => {
    acc[t.symbol] = acc[t.symbol] || []
    acc[t.symbol].push(t)
    return acc
  }, {})

  const positions: Position[] = []

  for (const [symbol, symbolTrades] of Object.entries(bySymbol)) {
    const sorted = [...symbolTrades].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    // 做多仓位（持有买入）
    let longCost = 0
    let longQty = 0
    // 做空仓位（持有卖出）
    let shortCost = 0
    let shortQty = 0

    for (const trade of sorted) {
      if (trade.direction === 'BUY') {
        if (shortQty > 0) {
          // 先平掉做空仓位
          const closeQty = Math.min(trade.quantity, shortQty)
          const avgShort = shortCost / shortQty
          shortCost -= avgShort * closeQty
          shortQty -= closeQty
          // 剩余买入加入做多仓位
          const remaining = trade.quantity - closeQty
          if (remaining > 0) {
            longCost += trade.price * remaining + trade.fee * (remaining / trade.quantity)
            longQty += remaining
          }
        } else {
          longCost += trade.price * trade.quantity + trade.fee
          longQty += trade.quantity
        }
      } else if (trade.direction === 'SELL') {
        if (longQty > 0) {
          // 先平掉做多仓位
          const avgCost = longCost / longQty
          const soldQty = Math.min(trade.quantity, longQty)
          longCost -= avgCost * soldQty
          longQty -= soldQty
          // 剩余卖出加入做空仓位
          const remaining = trade.quantity - soldQty
          if (remaining > 0) {
            shortCost += trade.price * remaining + trade.fee * (remaining / trade.quantity)
            shortQty += remaining
          }
        } else {
          shortCost += trade.price * trade.quantity + trade.fee
          shortQty += trade.quantity
        }
      }
    }

    if (longQty > 0) {
      positions.push({
        symbol,
        name: symbolTrades[symbolTrades.length - 1].name,
        quantity: longQty,
        avgCost: parseFloat((longCost / longQty).toFixed(4)),
        totalCost: parseFloat(longCost.toFixed(2)),
      })
    }

    if (shortQty > 0) {
      positions.push({
        symbol,
        name: symbolTrades[symbolTrades.length - 1].name,
        quantity: -shortQty,  // 负数表示做空持仓
        avgCost: parseFloat((shortCost / shortQty).toFixed(4)),
        totalCost: parseFloat(shortCost.toFixed(2)),
      })
    }
  }

  return positions
}

/**
 * Calculate overall stats from closed trades
 */
export function calcStats(closedTrades: ClosedTrade[]): TradeStats {
  if (closedTrades.length === 0) {
    return {
      totalTrades: 0,
      totalPnL: 0,
      winRate: 0,
      avgWin: 0,
      avgLoss: 0,
      profitFactor: 0,
      maxDrawdown: 0,
      bestTrade: 0,
      worstTrade: 0,
      totalFees: 0,
    }
  }

  const wins = closedTrades.filter((t) => t.pnl > 0)
  const losses = closedTrades.filter((t) => t.pnl < 0)

  const totalPnL = closedTrades.reduce((s, t) => s + t.pnl, 0)
  const totalWin = wins.reduce((s, t) => s + t.pnl, 0)
  const totalLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0))

  const winRate = closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0
  const avgWin = wins.length > 0 ? totalWin / wins.length : 0
  const avgLoss = losses.length > 0 ? totalLoss / losses.length : 0
  const profitFactor = totalLoss > 0 ? totalWin / totalLoss : totalWin > 0 ? Infinity : 0

  // Max drawdown via equity curve
  const equityCurve = buildEquityCurve(closedTrades)
  const maxDrawdown = calcMaxDrawdown(equityCurve)

  const pnls = closedTrades.map((t) => t.pnl)

  return {
    totalTrades: closedTrades.length,
    totalPnL: parseFloat(totalPnL.toFixed(2)),
    winRate: parseFloat(winRate.toFixed(1)),
    avgWin: parseFloat(avgWin.toFixed(2)),
    avgLoss: parseFloat(avgLoss.toFixed(2)),
    profitFactor: parseFloat(profitFactor.toFixed(2)),
    maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
    bestTrade: parseFloat(Math.max(...pnls, 0).toFixed(2)),
    worstTrade: parseFloat(Math.min(...pnls, 0).toFixed(2)),
    totalFees: 0, // fees tracked separately
  }
}

/**
 * Build equity curve from closed trades sorted by sell date
 */
export function buildEquityCurve(closedTrades: ClosedTrade[]): EquityPoint[] {
  const sorted = [...closedTrades].sort(
    (a, b) => new Date(a.sellDate).getTime() - new Date(b.sellDate).getTime()
  )

  let equity = 0
  return sorted.map((t) => {
    equity += t.pnl
    return {
      date: t.sellDate.split('T')[0],
      equity: parseFloat(equity.toFixed(2)),
      pnl: t.pnl,
    }
  })
}

/**
 * Calculate maximum drawdown from equity curve
 */
export function calcMaxDrawdown(equityCurve: EquityPoint[]): number {
  if (equityCurve.length === 0) return 0

  let peak = -Infinity
  let maxDD = 0

  for (const point of equityCurve) {
    if (point.equity > peak) peak = point.equity
    const dd = peak - point.equity
    if (dd > maxDD) maxDD = dd
  }

  return maxDD
}

/**
 * Strategy stats breakdown
 * 一笔交易有多个策略时，按逗号拆分后每个策略都计入对应统计桶
 */
export function calcStrategyStats(closedTrades: ClosedTrade[]): StrategyStats[] {
  const byStrategy = closedTrades.reduce<Record<string, ClosedTrade[]>>((acc, t) => {
    const keys = t.strategy
      ? t.strategy.split(',').map((s) => s.trim()).filter(Boolean)
      : ['未分类']
    for (const key of keys) {
      acc[key] = acc[key] || []
      acc[key].push(t)
    }
    return acc
  }, {})

  return Object.entries(byStrategy)
    .map(([strategy, trades]) => {
      const wins = trades.filter((t) => t.pnl > 0).length
      const totalPnL = trades.reduce((s, t) => s + t.pnl, 0)
      return {
        strategy,
        count: trades.length,
        totalPnL: parseFloat(totalPnL.toFixed(2)),
        winRate: parseFloat(((wins / trades.length) * 100).toFixed(1)),
        avgPnL: parseFloat((totalPnL / trades.length).toFixed(2)),
      }
    })
    .sort((a, b) => b.totalPnL - a.totalPnL)
}
