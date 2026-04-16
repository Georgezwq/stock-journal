'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { TrendingUp, TrendingDown, PlusCircle, ChevronUp, ChevronDown, ChevronsUpDown, X } from 'lucide-react'
import toast from 'react-hot-toast'

interface ScanResult {
  symbol: string
  name: string
  price: number
  changePercent: number
  volume: number
  marketCapUSD: number
  prevDayChange?: number
  prevWeekChange?: number
  prevMonthChange?: number
}

type SortKey = 'price' | 'changePercent' | 'marketCapUSD' | 'prevDayChange' | 'prevWeekChange' | 'prevMonthChange'
type SortDir = 'asc' | 'desc'

interface ScanProgress {
  percent: number
  text: string
}

interface ScannerResultsProps {
  results: ScanResult[]
  loading: boolean
  progress?: ScanProgress | null
}

// ─── K线弹窗 ───────────────────────────────────────────────
function KLineModal({ symbol, name, onClose }: { symbol: string; name: string; onClose: () => void }) {
  const chartRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seriesRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartInstanceRef = useRef<any>(null)
  const [days, setDays] = useState<60 | 365>(60)
  const [kloading, setKloading] = useState(true)
  const [kerror, setKerror] = useState(false)
  const daysRef = useRef(60)

  // 初始化图表 + 加载数据（async 模式，等 import 完成后再操作 DOM）
  useEffect(() => {
    let cancelled = false

    async function init() {
      const lc = await import('lightweight-charts')
      if (cancelled || !chartRef.current) return

      const chart = lc.createChart(chartRef.current, {
        autoSize: true,
        height: 340,
        layout: { background: { color: '#ffffff' }, textColor: '#374151' },
        grid: { vertLines: { color: '#f3f4f6' }, horzLines: { color: '#f3f4f6' } },
        rightPriceScale: { borderColor: '#e5e7eb' },
        timeScale: { borderColor: '#e5e7eb', timeVisible: true },
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const CandlestickSeriesCls = (lc as any).CandlestickSeries || (lc as any).candlestickSeries
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const series = CandlestickSeriesCls && typeof chart.addSeries === 'function'
        ? chart.addSeries(CandlestickSeriesCls, {
            upColor: '#ef4444', downColor: '#22c55e',
            borderUpColor: '#ef4444', borderDownColor: '#22c55e',
            wickUpColor: '#ef4444', wickDownColor: '#22c55e',
          })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        : (chart as any).addCandlestickSeries({
            upColor: '#ef4444', downColor: '#22c55e',
            borderUpColor: '#ef4444', borderDownColor: '#22c55e',
            wickUpColor: '#ef4444', wickDownColor: '#22c55e',
          })

      chartInstanceRef.current = chart
      seriesRef.current = series

      // 图表就绪后立即加载数据
      if (!cancelled) fetchKline(daysRef.current)
    }

    init()

    return () => {
      cancelled = true
      if (chartInstanceRef.current) { chartInstanceRef.current.remove(); chartInstanceRef.current = null }
      seriesRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol])

  // 拉K线数据（直接从浏览器请求东方财富，绕过后端代理问题）
  const fetchKline = async (d: number) => {
    setKloading(true)
    setKerror(false)

    const prefixes = ['105', '106', '107']
    const servers = ['push2his', 'push2delay']
    let klines: { time: string; open: number; high: number; low: number; close: number }[] = []

    // 优先直接从东方财富获取（浏览器走系统代理，更可靠）
    for (const server of servers) {
      if (klines.length > 0) break
      const fetches = prefixes.map(async (prefix) => {
        try {
          const url = `https://${server}.eastmoney.com/api/qt/stock/kline/get?secid=${prefix}.${symbol}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&klt=101&fqt=1&end=20500101&lmt=${d}&ut=fa5fd1943c7b386f172d6893dbfba10b`
          const res = await fetch(url, { headers: { 'Referer': 'https://quote.eastmoney.com/' } })
          const data = await res.json()
          if (data?.data?.klines && Array.isArray(data.data.klines) && data.data.klines.length > 0) {
            return data.data.klines.map((line: string) => {
              const p = line.split(',')
              return { time: p[0], open: parseFloat(p[1]), high: parseFloat(p[3]), low: parseFloat(p[4]), close: parseFloat(p[2]) }
            })
          }
        } catch { /* ignore */ }
        return []
      })
      const results = await Promise.all(fetches)
      const found = results.find((r) => r.length > 0)
      if (found) klines = found
    }

    // 回退到后端 API
    if (klines.length === 0) {
      try {
        const res = await fetch(`/api/market/kline?symbol=${symbol}&period=101&limit=${d}`)
        const data = await res.json()
        if (data && Array.isArray(data) && data.length > 0) klines = data
      } catch { /* ignore */ }
    }

    if (klines.length === 0) { setKerror(true); setKloading(false); return }
    if (!seriesRef.current || !chartInstanceRef.current) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const candles: any[] = klines.map((k) => ({
      time: k.time, open: k.open, high: k.high, low: k.low, close: k.close,
    }))
    seriesRef.current.setData(candles)
    chartInstanceRef.current.timeScale().fitContent()
    setKloading(false)
  }

  // 切换天数时重新拉数据
  useEffect(() => {
    daysRef.current = days
    if (!seriesRef.current) return
    fetchKline(days)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days])

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header — 固定不滚动 */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <div>
            <span className="text-lg font-bold text-gray-900">{symbol}</span>
            <span className="ml-2 text-sm text-gray-500">{name}</span>
          </div>
          <div className="flex items-center gap-3">
            {/* 天数切换 */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
              {([60, 365] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`px-3 py-1.5 font-medium transition-colors ${
                    days === d ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {d === 60 ? '60天' : '365天'}
                </button>
              ))}
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
        {/* Chart area — 可滚动区域 */}
        <div className="overflow-y-auto flex-1">
          <div className="p-4 relative">
            {kloading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                <div className="text-gray-400 animate-pulse">加载K线中...</div>
              </div>
            )}
            {kerror && !kloading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                <div className="text-gray-400">暂无K线数据</div>
              </div>
            )}
            <div ref={chartRef} style={{ width: '100%', height: '340px' }} />
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── 排序图标 ──────────────────────────────────────────────
function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown className="w-3.5 h-3.5 opacity-40" />
  return sortDir === 'desc'
    ? <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
    : <ChevronUp className="w-3.5 h-3.5 text-blue-600" />
}

// ─── 主组件 ───────────────────────────────────────────────
export default function ScannerResults({ results, loading, progress }: ScannerResultsProps) {
  const [sortKey, setSortKey] = useState<SortKey>('changePercent')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [selected, setSelected] = useState<ScanResult | null>(null)

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sorted = [...results].sort((a, b) => {
    const va = a[sortKey] ?? 0
    const vb = b[sortKey] ?? 0
    const v = (va as number) - (vb as number)
    return sortDir === 'desc' ? -v : v
  })

  const addToWatchlist = async (e: React.MouseEvent, item: ScanResult) => {
    e.stopPropagation()
    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: item.symbol, name: item.name }),
      })
      if (res.ok) toast.success(`${item.symbol} 已加入观察名单`)
    } catch {
      toast.error('添加失败')
    }
  }

  const fmtCap = (v: number) =>
    v >= 1e12 ? `$${(v / 1e12).toFixed(2)}T`
    : v >= 1e9 ? `$${(v / 1e9).toFixed(1)}B`
    : `$${(v / 1e6).toFixed(0)}M`

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        {progress ? (
          <>
            <div className="w-full max-w-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">{progress.text}</span>
                <span className="text-sm font-mono font-semibold text-blue-600">{progress.percent}%</span>
              </div>
              <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-200 ease-out"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="text-gray-400 animate-pulse">扫描市场中...</div>
        )}
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        点击&ldquo;开始扫描&rdquo;查找符合条件的股票
      </div>
    )
  }

  const hasPrevDay = results.some((r) => r.prevDayChange !== undefined)
  const hasPrevWeek = results.some((r) => r.prevWeekChange !== undefined)
  const hasPrevMonth = results.some((r) => r.prevMonthChange !== undefined)

  const thClass = 'px-4 py-3 text-right cursor-pointer select-none hover:text-blue-600 transition-colors'

  return (
    <>
      <div className="space-y-2">
        <div className="text-sm text-gray-500 mb-3">
          找到 <span className="font-semibold text-gray-800">{results.length}</span> 支股票
          <span className="ml-2 text-xs text-gray-400">· 点击行查看K线 · 点击列头排序</span>
        </div>
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs">
              <tr>
                <th className="px-4 py-3 text-left">代码</th>
                <th className="px-4 py-3 text-left">名称</th>
                <th className={thClass} onClick={() => toggleSort('price')}>
                  <span className="inline-flex items-center justify-end gap-1">
                    价格 <SortIcon col="price" sortKey={sortKey} sortDir={sortDir} />
                  </span>
                </th>
                <th className={thClass} onClick={() => toggleSort('changePercent')}>
                  <span className="inline-flex items-center justify-end gap-1">
                    涨跌幅 <SortIcon col="changePercent" sortKey={sortKey} sortDir={sortDir} />
                  </span>
                </th>
                {hasPrevDay && (
                  <th className={thClass} onClick={() => toggleSort('prevDayChange')}>
                    <span className="inline-flex items-center justify-end gap-1">
                      昨日 <SortIcon col="prevDayChange" sortKey={sortKey} sortDir={sortDir} />
                    </span>
                  </th>
                )}
                {hasPrevWeek && (
                  <th className={thClass} onClick={() => toggleSort('prevWeekChange')}>
                    <span className="inline-flex items-center justify-end gap-1">
                      前一周 <SortIcon col="prevWeekChange" sortKey={sortKey} sortDir={sortDir} />
                    </span>
                  </th>
                )}
                {hasPrevMonth && (
                  <th className={thClass} onClick={() => toggleSort('prevMonthChange')}>
                    <span className="inline-flex items-center justify-end gap-1">
                      前一月 <SortIcon col="prevMonthChange" sortKey={sortKey} sortDir={sortDir} />
                    </span>
                  </th>
                )}
                <th className="px-4 py-3 text-right">成交量</th>
                <th className={thClass} onClick={() => toggleSort('marketCapUSD')}>
                  <span className="inline-flex items-center justify-end gap-1">
                    市值 <SortIcon col="marketCapUSD" sortKey={sortKey} sortDir={sortDir} />
                  </span>
                </th>
                <th className="px-4 py-3 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map((item) => {
                const isUp = item.changePercent >= 0
                return (
                  <tr
                    key={item.symbol}
                    className="hover:bg-blue-50 transition-colors cursor-pointer"
                    onClick={() => setSelected(item)}
                  >
                    <td className="px-4 py-3 font-semibold text-gray-900">{item.symbol}</td>
                    <td className="px-4 py-3 text-gray-600">{item.name}</td>
                    <td className="px-4 py-3 text-right font-mono">${item.price.toFixed(2)}</td>
                    <td className={`px-4 py-3 text-right font-medium ${isUp ? 'text-red-600' : 'text-green-600'}`}>
                      <span className="inline-flex items-center justify-end gap-1">
                        {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        {isUp ? '+' : ''}{item.changePercent.toFixed(2)}%
                      </span>
                    </td>
                    {hasPrevDay && (
                      <td className={`px-4 py-3 text-right font-medium ${
                        (item.prevDayChange ?? 0) >= 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {item.prevDayChange !== undefined
                          ? `${item.prevDayChange >= 0 ? '+' : ''}${item.prevDayChange.toFixed(2)}%`
                          : '-'}
                      </td>
                    )}
                    {hasPrevWeek && (
                      <td className={`px-4 py-3 text-right font-medium ${
                        (item.prevWeekChange ?? 0) >= 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {item.prevWeekChange !== undefined
                          ? `${item.prevWeekChange >= 0 ? '+' : ''}${item.prevWeekChange.toFixed(2)}%`
                          : '-'}
                      </td>
                    )}
                    {hasPrevMonth && (
                      <td className={`px-4 py-3 text-right font-medium ${
                        (item.prevMonthChange ?? 0) >= 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {item.prevMonthChange !== undefined
                          ? `${item.prevMonthChange >= 0 ? '+' : ''}${item.prevMonthChange.toFixed(2)}%`
                          : '-'}
                      </td>
                    )}
                    <td className="px-4 py-3 text-right text-gray-500">
                      {item.volume >= 1e6 ? `${(item.volume / 1e6).toFixed(1)}M` : item.volume.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">{fmtCap(item.marketCapUSD)}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={(e) => addToWatchlist(e, item)}
                        className="text-blue-500 hover:text-blue-700 transition-colors"
                        title="加入观察名单"
                      >
                        <PlusCircle className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <KLineModal symbol={selected.symbol} name={selected.name} onClose={() => setSelected(null)} />
      )}
    </>
  )
}
