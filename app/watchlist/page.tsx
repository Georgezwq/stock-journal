'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Quote } from '@/types'
import IndexBar from '@/components/market/IndexBar'
import { useMarket } from '@/hooks/useMarket'
import {
  Star, Trash2, RefreshCw, TrendingUp, TrendingDown,
  Search, X, Plus, Moon, Sunrise,
} from 'lucide-react'
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

  // 搜索状态
  const [searchText, setSearchText] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResult, setSearchResult] = useState<Quote | null | 'notfound'>( null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 弹窗状态
  const [modalQuote, setModalQuote] = useState<Quote | null>(null)
  const [adding, setAdding] = useState(false)

  // 加载自选股列表
  const loadWatchlist = useCallback(async () => {
    try {
      const res = await fetch('/api/watchlist')
      if (res.ok) setWatchlist(await res.json())
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  // 拉取所有自选股实时报价
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

  // 搜索框输入 → 防抖查询
  const handleSearchChange = (val: string) => {
    setSearchText(val.toUpperCase())
    setSearchResult(null)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    const trimmed = val.trim().toUpperCase()
    if (!trimmed) return
    searchTimer.current = setTimeout(async () => {
      setSearching(true)
      const q = await fetchQuote(trimmed)
      setSearchResult(q ?? 'notfound')
      setSearching(false)
    }, 500)
  }

  // 点击搜索结果 → 打开弹窗
  const handleResultClick = (q: Quote) => {
    setModalQuote(q)
  }

  // 弹窗内确认添加
  const handleConfirmAdd = async () => {
    if (!modalQuote) return
    setAdding(true)
    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: modalQuote.symbol, name: modalQuote.name }),
      })
      if (res.ok) {
        toast.success(`${modalQuote.symbol} 已加入自选`)
        setModalQuote(null)
        setSearchText('')
        setSearchResult(null)
        await loadWatchlist()
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err?.error ?? '添加失败')
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

  const alreadyAdded = modalQuote
    ? watchlist.some(w => w.symbol === modalQuote.symbol)
    : false

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

        {/* 搜索框 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchText}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="输入股票代码搜索，如 TSLA"
            className="w-full pl-9 pr-9 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchText && (
            <button
              onClick={() => { setSearchText(''); setSearchResult(null) }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* 搜索结果下拉 */}
          {searchText && (
            <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
              {searching ? (
                <div className="px-4 py-3 text-sm text-gray-400">搜索中...</div>
              ) : searchResult === 'notfound' ? (
                <div className="px-4 py-3 text-sm text-gray-400">未找到股票 "{searchText}"</div>
              ) : searchResult ? (
                <button
                  onClick={() => handleResultClick(searchResult)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                >
                  <div>
                    <span className="font-bold text-gray-900">{searchResult.symbol}</span>
                    {searchResult.name && (
                      <span className="ml-2 text-sm text-gray-400">{searchResult.name}</span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-semibold text-gray-900">${searchResult.price.toFixed(2)}</div>
                    <div className={`text-xs font-medium ${searchResult.changePercent >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {searchResult.changePercent >= 0 ? '+' : ''}{searchResult.changePercent.toFixed(2)}%
                    </div>
                  </div>
                </button>
              ) : null}
            </div>
          )}
        </div>

        {/* 自选股列表 */}
        {loading ? (
          <div className="py-16 text-center text-gray-400">加载中...</div>
        ) : watchlist.length === 0 ? (
          <div className="py-16 text-center">
            <Star className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">还没有自选股</p>
            <p className="text-gray-300 text-xs mt-1">搜索股票代码添加</p>
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
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{item.symbol}</span>
                      {item.name && (
                        <span className="text-xs text-gray-400 truncate max-w-[80px] md:max-w-none">{item.name}</span>
                      )}
                    </div>
                    {hasExt && (
                      <div className="text-xs text-gray-400 mt-0.5">
                        {q.extType === 'pre' ? '盘前' : '盘后'} {q.extTime}
                        <span className={`ml-1.5 font-medium ${(q.extChangePercent ?? 0) >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                          {(q.extChangePercent ?? 0) >= 0 ? '+' : ''}{q.extChangePercent?.toFixed(2)}%
                        </span>
                      </div>
                    )}
                  </div>

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

      {/* 弹窗遮罩 */}
      {modalQuote && (
        <div
          className="fixed inset-0 bg-black/40 z-40 flex items-end md:items-center justify-center"
          onClick={() => setModalQuote(null)}
        >
          <div
            className="bg-white w-full md:w-96 rounded-t-2xl md:rounded-2xl p-5 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            {/* 弹窗标题 */}
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xl font-bold text-gray-900">{modalQuote.symbol}</div>
                {modalQuote.name && <div className="text-sm text-gray-500 mt-0.5">{modalQuote.name}</div>}
              </div>
              <button onClick={() => setModalQuote(null)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 价格区 */}
            <div className="flex items-end gap-3">
              <span className="text-3xl font-bold text-gray-900">${modalQuote.price.toFixed(2)}</span>
              <span className={`text-base font-medium mb-0.5 ${
                modalQuote.changePercent > 0 ? 'text-red-500' : modalQuote.changePercent < 0 ? 'text-green-500' : 'text-gray-400'
              }`}>
                {modalQuote.changePercent > 0 ? '+' : ''}{modalQuote.change.toFixed(2)}
                &nbsp;({modalQuote.changePercent > 0 ? '+' : ''}{modalQuote.changePercent.toFixed(2)}%)
              </span>
            </div>

            {/* 盘前/盘后 */}
            {modalQuote.extPrice !== undefined && (
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 text-sm">
                {modalQuote.extType === 'pre'
                  ? <Sunrise className="w-3.5 h-3.5 text-orange-400" />
                  : <Moon className="w-3.5 h-3.5 text-indigo-400" />}
                <span className="text-gray-500">{modalQuote.extType === 'pre' ? '盘前' : '盘后'}</span>
                {modalQuote.extTime && <span className="text-gray-400 text-xs">{modalQuote.extTime}</span>}
                <span className="font-mono font-semibold text-gray-800 ml-auto">${modalQuote.extPrice.toFixed(2)}</span>
                <span className={`font-medium ${(modalQuote.extChangePercent ?? 0) >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {(modalQuote.extChangePercent ?? 0) >= 0 ? '+' : ''}{modalQuote.extChangePercent?.toFixed(2)}%
                </span>
              </div>
            )}

            {/* OHLV */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[
                { label: '今开', value: `$${modalQuote.open.toFixed(2)}` },
                { label: '最高', value: `$${modalQuote.high.toFixed(2)}`, color: 'text-red-500' },
                { label: '最低', value: `$${modalQuote.low.toFixed(2)}`, color: 'text-green-500' },
                { label: '成交量', value: modalQuote.volume >= 1e6 ? `${(modalQuote.volume / 1e6).toFixed(1)}M` : modalQuote.volume.toLocaleString() },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-gray-50 rounded-lg px-3 py-2">
                  <div className="text-gray-400 text-xs">{label}</div>
                  <div className={`font-semibold ${color ?? 'text-gray-800'}`}>{value}</div>
                </div>
              ))}
            </div>

            {/* 底部按钮 */}
            <div className="flex justify-end pt-1">
              <button
                onClick={handleConfirmAdd}
                disabled={adding || alreadyAdded}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
                {alreadyAdded ? '已在自选' : adding ? '添加中...' : '添加自选'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
