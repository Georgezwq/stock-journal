'use client'

import { useState, useEffect, useCallback } from 'react'
import { useMarket } from '@/hooks/useMarket'
import { useTrades } from '@/hooks/useTrades'
import IndexBar from '@/components/market/IndexBar'
import KLineChart from '@/components/market/KLineChart'
import QuoteCard from '@/components/market/QuoteCard'
import { Quote, KLineCandle } from '@/types'
import { Search } from 'lucide-react'
import toast from 'react-hot-toast'

export default function MarketPage() {
  const { indices, indicesLoading, refreshIndices, fetchQuote, fetchKLine } = useMarket()
  const { trades } = useTrades()

  const [symbol, setSymbol] = useState('AAPL')
  const [inputSymbol, setInputSymbol] = useState('AAPL')
  const [quote, setQuote] = useState<Quote | null>(null)
  const [klines, setKlines] = useState<KLineCandle[]>([])
  const [period, setPeriod] = useState<'101' | '102' | '103'>('101')
  const [searchLoading, setSearchLoading] = useState(false)

  const loadData = useCallback(async (sym: string, per: '101' | '102' | '103') => {
    setSearchLoading(true)
    try {
      const [q, k] = await Promise.all([
        fetchQuote(sym),
        fetchKLine(sym, per, 365),
      ])
      if (!q) {
        toast.error(`未找到 ${sym}，请确认代码正确`)
      }
      setQuote(q)
      setKlines(k)
    } finally {
      setSearchLoading(false)
    }
  }, [fetchQuote, fetchKLine])

  useEffect(() => {
    loadData('AAPL', '101')
  }, [loadData])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const s = inputSymbol.trim().toUpperCase()
    if (!s) return
    setSymbol(s)
    loadData(s, period)
  }

  const handlePeriodChange = (p: '101' | '102' | '103') => {
    setPeriod(p)
    loadData(symbol, p)
  }

  const handleAddToWatchlist = async () => {
    if (!quote) return
    try {
      await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: quote.symbol, name: quote.name }),
      })
      toast.success(`${quote.symbol} 已加入观察名单`)
    } catch {
      toast.error('添加失败')
    }
  }

  // Get buy/sell points for the current symbol from trade records
  const buyPoints = trades
    .filter((t) => t.symbol === symbol && t.direction === 'BUY')
    .map((t) => ({ date: String(t.date).slice(0, 10), price: t.price }))

  const sellPoints = trades
    .filter((t) => t.symbol === symbol && t.direction === 'SELL')
    .map((t) => ({ date: String(t.date).slice(0, 10), price: t.price }))

  return (
    <div className="flex flex-col min-h-screen">
      <IndexBar indices={indices} loading={indicesLoading} onRefresh={refreshIndices} />

      <div className="p-4 md:p-6 space-y-4 md:space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">行情数据</h1>
          <p className="text-sm text-gray-500 mt-0.5">搜索美股代码查看K线和实时报价</p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={inputSymbol}
              onChange={(e) => setInputSymbol(e.target.value.toUpperCase())}
              placeholder="输入股票代码，如 AAPL"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
            />
          </div>
          <button
            type="submit"
            disabled={searchLoading}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
          >
            {searchLoading ? '搜索中...' : '搜索'}
          </button>
        </form>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          {/* K-Line (wide) */}
          <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 p-5">
            <KLineChart
              symbol={symbol}
              candles={klines}
              period={period}
              onPeriodChange={handlePeriodChange}
              buyPoints={buyPoints}
              sellPoints={sellPoints}
            />
            {(buyPoints.length > 0 || sellPoints.length > 0) && (
              <div className="mt-2 text-xs text-gray-400 flex gap-4">
                {buyPoints.length > 0 && <span className="text-green-600">▲ 买入点 ({buyPoints.length})</span>}
                {sellPoints.length > 0 && <span className="text-red-600">▼ 卖出点 ({sellPoints.length})</span>}
              </div>
            )}
          </div>

          {/* Quote card */}
          <div className="lg:col-span-1">
            {quote ? (
              <QuoteCard quote={quote} onAddToWatchlist={handleAddToWatchlist} />
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-center h-64 text-gray-400">
                {searchLoading ? '加载中...' : '暂无报价'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
