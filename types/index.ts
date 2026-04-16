// Global TypeScript types

export type Direction = 'BUY' | 'SELL'
export type Emotion = '感觉不错' | '牛刀小试' | '恐慌' | '贪婪' | '犹豫' | '挺难受的' | '特别难受' | '纯属贪婪' | '又追高了' | '买完就知道又追高了' | '极其后悔'

export interface Trade {
  id: string
  symbol: string
  name?: string | null
  direction: Direction
  price: number
  quantity: number
  fee: number
  date: string
  strategy?: string | null
  notes?: string | null
  emotion?: string | null
  account: string
  createdAt: string
  updatedAt: string
}

export interface TradeFormData {
  symbol: string
  name?: string
  direction: Direction
  price: number
  quantity: number
  fee: number
  date: string
  time: string   // HH:mm，与 date 拼合后存入数据库
  strategy?: string
  notes?: string
  emotion?: string
  account: string
}

export interface Watchlist {
  id: string
  symbol: string
  name?: string | null
  notes?: string | null
  addedAt: string
}

// Position calculated from trades
export interface Position {
  symbol: string
  name?: string | null
  quantity: number
  avgCost: number
  totalCost: number
  currentPrice?: number
  unrealizedPnL?: number
  unrealizedPnLPct?: number
}

// Closed trade pair (BUY + SELL matched)
export interface ClosedTrade {
  symbol: string
  name?: string | null
  buyDate: string
  sellDate: string
  buyPrice: number
  sellPrice: number
  quantity: number
  pnl: number
  pnlPct: number
  holdingDays: number
  strategy?: string | null
  emotion?: string | null
}

// Stats
export interface TradeStats {
  totalTrades: number
  totalPnL: number
  winRate: number
  avgWin: number
  avgLoss: number
  profitFactor: number
  maxDrawdown: number
  bestTrade: number
  worstTrade: number
  totalFees: number
}

// Market Quote
export interface Quote {
  symbol: string
  name?: string
  price: number
  change: number
  changePercent: number
  open: number
  high: number
  low: number
  volume: number
  timestamp?: number
}

// K-Line candle
export interface KLineCandle {
  time: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

// Equity curve point
export interface EquityPoint {
  date: string
  equity: number
  pnl: number
}

// Strategy stats
export interface StrategyStats {
  strategy: string
  count: number
  totalPnL: number
  winRate: number
  avgPnL: number
}
