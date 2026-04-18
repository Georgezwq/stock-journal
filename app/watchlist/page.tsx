'use client'

import { useState, useEffect, useCallback } from 'react'
import { Quote } from '@/types'
import IndexBar from '@/components/market/IndexBar'
import { useMarket } from '@/hooks/useMarket'
import { Star, Trash2, Plus, RefreshCw, TrendingUp, TrendingDown, Search } from 'lucide-react'
import toast from 'react-hot-toast'

interface WatchItem {
  id: string
  symbol: string
  name?: string | null
  notes?: string | null
  addedAt: string
}

export default function WatchlistPage() {
  const { indices, indicesLoading, refreshIndices, fetchQuote } = useMarket()
  const [watchlist, setWatchlist] = useState<WatchItem[]>([])
  const [quotes, setQuotes] = useState<Record<string, Quote>>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [addSymbol, setAddSymbol] = useState('')
  const [adding, setAdding] = useState(false)

  // 加载自选股列表
  const loadWatchlist = useCallback(async () => {
    try {
      const res = await fetch('/api/watchlist')
      if (res.ok) setWatchlist(await res.json())
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  // 拉取所有自选股的实时报价
  const refreshQuotes = useCallback(async (list: WatchItem[]) => {
    if (list.length === 0) return
    setRefreshing(true)
    const results = await Promise.all(list.map(item => fetchQuote(item.symbol)))
    const map: Record<string, Quote> = {}
    results.forEach((q, i) => { if (q) map[list[i].symbol] = q })
    setQuotes(map)
    setRefreshing(false)
  }, [fetchQuote])

  useEffect(() => { loadWatchlist() }, [loadWatchlist])
  useEffect(() => { if (watchlist.length > 0) refreshQuotes(watchlist) }, [watchlist, refreshQuotes])

  // 添加自选股
  const handleAdd = async () => {
    const symbol = addSymbol.trim().toUpperCase()
    if (!symbol) return
    setAdding(true)
    try {
      // 先查报价确认股票存在
      const quote = await fetchQuote(symbol)
      if (!quote) {
        toast.error(`未找到股票：${symbol}`)
        return
      }
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, name: quote.name }),
      })
      if (res.ok) {
        toast.success(`${symbol} 已加入自选`)
        setAddSymbol('')
        await loadWatchlist()
      }
    } catch {
      toast.error('添加失败，请重试')
    } finally {
      setAdding(false)
    }
  }

  // 删除自选股
  const handleDelete = async (symbol: string) => {
    try {
      await fetch(`/api/watchlist?symbol=${symbol}`, { method: 'DELETE' })
      setWatchlist(prev => prev.filter(w => w.symbol !== symbol))
      setQuotes(prev => { const n = { ...prev }; delete n[symbol]; return n })
      toast.success(`${symbol} 已移出自选`)
    } catch {
      toast.error('删除失败')
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <IndexBar indices={indices} loading={indicesLoading} onRefresh={refreshIndices} />

      <div className="flex-1 p-4 md:p-6 space-y-4 md:space-y-5">
        {/* 标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
              自选股
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">共 {watchlist.length} 只</p>
          </div>
          <button
            onClick={() => refreshQuotes(watchlist)}
            disabled={refreshing}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* 添加输入框 */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={addSymbol}
              onChange={e => setAddSymbol(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="输入股票代码，如 TSLA"
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={adding || !addSymbol.trim()}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {adding ? '查询中...' : '添加'}
          </button>
        </div>

        {/* 自选股列表 */}
        {loading ? (
          <div className="py-16 text-center text-gray-400">加载中...</div>
        ) : watchlist.length === 0 ? (
          <div className="py-16 text-center">
            <Star className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">还没有自选股</p>
            <p className="text-gray-300 text-xs mt-1">输入股票代码添加</p>
          </div>
        ) : (
          <div className="space-y-2">
            {watchlist.map(item => {
              const q = quotes[item.symbol]
              const isUp = (q?.changePercent ?? 0) > 0
              const isFlat = (q?.changePercent ?? 0) === 0
              const hasExt = q?.extPrice !== undefined

              return (
                <div
                  key={item.symbol}
                  className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between"
                >
                  {/* 左：股票信息 */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{item.symbol}</span>
                      {item.name && (
                        <span className="text-xs text-gray-400 truncate max-w-[80px] md:max-w-none">{item.name}</span>
                      )}
                    </div>
                    {/* 盘前盘后小标签 */}
                    {hasExt && (
                      <div className="text-xs text-gray-400 mt-0.5">
                        {q.extType === 'pre' ? '盘前' : '盘后'} {q.extTime}
                        <span className={`ml-1.5 font-medium ${(q.extChangePercent ?? 0) >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                          {(q.extChangePercent ?? 0) >= 0 ? '+' : ''}{q.extChangePercent?.toFixed(2)}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 中：价格和涨跌 */}
                  <div className="flex-1 text-right mx-4">
                    {q ? (
                      <>
                        <div className="font-mono font-bold text-gray-900">${q.price.toFixed(2)}</div>
                        <div className={`flex items-center justify-end gap-0.5 text-sm font-medium ${
                          isUp ? 'text-red-600' : isFlat ? 'text-gray-400' : 'text-green-600'
                        }`}>
                          {isUp ? <TrendingUp className="w-3 h-3" /> : isFlat ? null : <TrendingDown className="w-3 h-3" />}
                          {isUp ? '+' : ''}{q.changePercent.toFixed(2)}%
                        </div>
                      </>
                    ) : (
                      <div className="text-gray-300 text-sm">--</div>
                    )}
                  </div>

                  {/* 右：删除 */}
                  <button
                    onClick={() => handleDelete(item.symbol)}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
