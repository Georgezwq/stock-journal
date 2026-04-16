'use client'

import { useEffect, useRef, useState } from 'react'
import { Trade, KLineCandle } from '@/types'
import { X, TrendingUp } from 'lucide-react'

interface TradeReviewModalProps {
  trade: Trade
  onClose: () => void
}

interface HoverInfo {
  date: string
  open: number
  high: number
  low: number
  close: number
  change: number      // 当天涨跌额
  changePct: number   // 当天涨跌幅 %
}

function MiniKLineChart({
  title,
  candles,
  loading,
  tradeDate,
  tradePrice,
  tradeDirection,
}: {
  title: string
  candles: KLineCandle[]
  loading: boolean
  tradeDate?: string
  tradePrice?: number
  tradeDirection?: 'BUY' | 'SELL'
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null)
  const [ready, setReady] = useState(false)
  const [hover, setHover] = useState<HoverInfo | null>(null)

  useEffect(() => {
    let cancelled = false

    async function init() {
      if (!containerRef.current || candles.length === 0) return

      const lc = await import('lightweight-charts')
      if (cancelled) return

      if (chartRef.current) {
        try { chartRef.current.remove() } catch { /* ignore */ }
        chartRef.current = null
      }
      setReady(false)
      setHover(null)

      const chart = lc.createChart(containerRef.current, {
        width: containerRef.current.clientWidth,
        height: 300,
        layout: {
          background: { type: lc.ColorType.Solid, color: '#ffffff' },
          textColor: '#6b7280',
        },
        grid: {
          vertLines: { color: '#f3f4f6' },
          horzLines: { color: '#f3f4f6' },
        },
        crosshair: { mode: lc.CrosshairMode.Normal },
        rightPriceScale: { borderColor: '#e5e7eb' },
        timeScale: { borderColor: '#e5e7eb', timeVisible: true },
      })

      chartRef.current = chart

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const CandlestickSeries = (lc as any).CandlestickSeries || (lc as any).candlestickSeries

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let candleSeries: any
      if (CandlestickSeries && typeof chart.addSeries === 'function') {
        candleSeries = chart.addSeries(CandlestickSeries, {
          upColor: '#ef4444',
          downColor: '#22c55e',
          borderUpColor: '#ef4444',
          borderDownColor: '#22c55e',
          wickUpColor: '#ef4444',
          wickDownColor: '#22c55e',
        })
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        candleSeries = (chart as any).addCandlestickSeries({
          upColor: '#ef4444',
          downColor: '#22c55e',
          borderUpColor: '#ef4444',
          borderDownColor: '#22c55e',
          wickUpColor: '#ef4444',
          wickDownColor: '#22c55e',
        })
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formatted: any[] = candles.map((c) => ({
        time: c.time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
      candleSeries.setData(formatted)

      // 订阅 crosshair 移动，计算涨跌幅并 setHover
      chart.subscribeCrosshairMove((param: any) => {  // eslint-disable-line @typescript-eslint/no-explicit-any
        if (!param || !param.time || !param.seriesData) {
          setHover(null)
          return
        }
        const bar = param.seriesData.get(candleSeries)
        if (!bar) { setHover(null); return }

        // 找到前一天的收盘价，用于计算涨跌幅
        const idx = candles.findIndex((c) => c.time === param.time)
        const prevClose = idx > 0 ? candles[idx - 1].close : bar.open
        const change = bar.close - prevClose
        const changePct = prevClose !== 0 ? (change / prevClose) * 100 : 0

        setHover({
          date: typeof param.time === 'string' ? param.time : String(param.time),
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
          change: parseFloat(change.toFixed(3)),
          changePct: parseFloat(changePct.toFixed(2)),
        })
      })

      // Add trade marker
      if (tradeDate && tradePrice !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const markers: any[] = [
          tradeDirection === 'BUY'
            ? { time: tradeDate, position: 'belowBar', color: '#ef4444', shape: 'arrowUp', text: 'B', size: 1 }
            : { time: tradeDate, position: 'aboveBar', color: '#22c55e', shape: 'arrowDown', text: 'S', size: 1 }
        ]
        if (typeof lc.createSeriesMarkers === 'function') {
          lc.createSeriesMarkers(candleSeries, markers)
        } else if (typeof candleSeries.setMarkers === 'function') {
          candleSeries.setMarkers(markers)
        }
      }

      // 右边留 8 格空白，让标记文字完整显示
      chart.timeScale().applyOptions({ rightOffset: 8 })

      // 默认只显示最近 60 根 K 线，保留全部数据可缩放查看
      if (formatted.length > 0) {
        const from = formatted[Math.max(0, formatted.length - 60)].time as string
        const to = formatted[formatted.length - 1].time as string
        chart.timeScale().setVisibleRange({ from, to })
      } else {
        chart.timeScale().fitContent()
      }

      const observer = new ResizeObserver(() => {
        if (containerRef.current && chartRef.current) {
          chartRef.current.applyOptions({ width: containerRef.current.clientWidth })
        }
      })
      observer.observe(containerRef.current)
      setReady(true)

      return () => observer.disconnect()
    }

    init()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candles, tradeDate, tradePrice, tradeDirection])

  const isUp = hover ? hover.changePct >= 0 : null

  return (
    <div className="space-y-1">
      {/* 标题行（固定高度，不随内容变化） */}
      <div className="text-sm font-semibold text-gray-700">{title}</div>

      {/* hover 数据行（固定高度 20px，内容用 opacity 切换避免跳动） */}
      <div className="h-5 flex items-center gap-2 text-xs font-mono overflow-hidden">
        {hover ? (
          <>
            <span className="text-gray-400 shrink-0">{hover.date}</span>
            <span className="text-gray-400 shrink-0">开<span className="text-gray-600 ml-0.5">{hover.open.toFixed(3)}</span></span>
            <span className="text-gray-400 shrink-0">高<span className="text-gray-600 ml-0.5">{hover.high.toFixed(3)}</span></span>
            <span className="text-gray-400 shrink-0">低<span className="text-gray-600 ml-0.5">{hover.low.toFixed(3)}</span></span>
            <span className="text-gray-400 shrink-0">收<span className="text-gray-600 ml-0.5">{hover.close.toFixed(3)}</span></span>
            <span className={`shrink-0 font-semibold px-1.5 rounded ${
              isUp ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
            }`}>
              {isUp ? '+' : ''}{hover.change.toFixed(3)}&nbsp;({isUp ? '+' : ''}{hover.changePct.toFixed(2)}%)
            </span>
          </>
        ) : (
          <span className="text-gray-300">移入K线查看涨跌幅</span>
        )}
      </div>

      {/* Chart */}
      <div className="relative min-h-[300px]">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-xl z-10">
            <div className="text-gray-400 text-sm animate-pulse">加载K线数据...</div>
          </div>
        )}
        {!loading && candles.length === 0 && (
          <div className="flex items-center justify-center h-[300px] bg-gray-50 rounded-xl text-gray-400 text-sm">
            暂无K线数据
          </div>
        )}
        {!loading && !ready && candles.length > 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-xl z-10">
            <div className="text-gray-400 text-sm">渲染中...</div>
          </div>
        )}
        <div ref={containerRef} className="w-full rounded-xl overflow-hidden border border-gray-200" />
      </div>
    </div>
  )
}

export default function TradeReviewModal({ trade, onClose }: TradeReviewModalProps) {
  const [stockCandles, setStockCandles] = useState<KLineCandle[]>([])
  const [ndxCandles, setNdxCandles] = useState<KLineCandle[]>([])
  const [stockLoading, setStockLoading] = useState(true)
  const [ndxLoading, setNdxLoading] = useState(true)

  // 直接从 ISO 字符串里读取字面时间（存储时已是北京时间字面值，无需时区转换）
  // 格式: "2025-09-30T22:16:00.000Z" → date="2025-09-30", time="22:16"
  const dateStr = String(trade.date)
  const tradeDate = dateStr.slice(0, 10)         // "2025-09-30"（北京时间日期，用于显示）
  const tradeTime = dateStr.slice(11, 16)        // "22:16"（北京时间，用于显示）
  const literalHour = parseInt(dateStr.slice(11, 13), 10)
  const literalMinute = parseInt(dateStr.slice(14, 16), 10)

  // 美股交易日判断：
  // 北京时间 00:00~09:29 对应美东前一天（凌晨尚未开盘）
  // 北京时间 09:30+ 对应当天美股盘中/盘后
  const isBeforeMarketOpen = literalHour < 9 || (literalHour === 9 && literalMinute < 30)

  // 计算对应美股交易日（仅用于 K 线数据请求，不影响显示）
  let marketDate: string
  if (isBeforeMarketOpen) {
    // 前一天日期：直接字符串运算，避免时区问题
    const d = new Date(`${tradeDate}T12:00:00Z`)  // 用正午 UTC 避免跨日
    d.setUTCDate(d.getUTCDate() - 1)
    marketDate = d.toISOString().slice(0, 10)
  } else {
    marketDate = tradeDate
  }
  // end 参数多加一天，避免东方财富把当天数据排除在外
  const endDateObj = new Date(`${marketDate}T12:00:00Z`)
  endDateObj.setUTCDate(endDateObj.getUTCDate() + 1)
  const endDateParam = endDateObj.toISOString().slice(0, 10).replace(/-/g, '')  // 往后一天

  useEffect(() => {
    setStockLoading(true)
    fetch(`/api/market/kline?symbol=${trade.symbol}&period=101&limit=365&end=${endDateParam}`)
      .then((r) => r.json())
      .then((data) => setStockCandles(Array.isArray(data) ? data : []))
      .catch(() => setStockCandles([]))
      .finally(() => setStockLoading(false))

    setNdxLoading(true)
    fetch(`/api/market/kline?symbol=NDX&period=101&limit=365&end=${endDateParam}`)
      .then((r) => r.json())
      .then((data) => setNdxCandles(Array.isArray(data) ? data : []))
      .catch(() => setNdxCandles([]))
      .finally(() => setNdxLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trade.id])

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-gray-900">{trade.symbol}</span>
            {trade.name && <span className="text-sm text-gray-400">{trade.name}</span>}
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              trade.direction === 'BUY' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
            }`}>
              {trade.direction === 'BUY' ? '买入' : '卖出'}
            </span>
            <span className="text-gray-600 font-mono text-sm">${trade.price.toFixed(3)}</span>
            <span className="text-gray-400 text-sm">·</span>
            <span className="text-gray-500 text-sm">{tradeDate} {tradeTime}</span>
            {isBeforeMarketOpen && (
              <span className="text-xs text-blue-400 bg-blue-50 px-1.5 py-0.5 rounded">
                K线对应 {marketDate}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Charts */}
        <div className="p-5 grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-3">
            <MiniKLineChart
              title={`${trade.symbol} 日K · 交易前365天`}
              candles={stockCandles}
              loading={stockLoading}
              tradeDate={marketDate}
              tradePrice={trade.price}
              tradeDirection={trade.direction as 'BUY' | 'SELL'}
            />
          </div>
          <div className="lg:col-span-2">
            <MiniKLineChart
              title="纳斯达克100 同期对比"
              candles={ndxCandles}
              loading={ndxLoading}
            />
          </div>
        </div>

        {/* Notes */}
        {(trade.notes || trade.strategy || trade.emotion) && (
          <div className="px-5 pb-5 space-y-2 border-t pt-4">
            <div className="flex items-center gap-2 flex-wrap text-sm">
              {trade.strategy && trade.strategy.split(',').map((s, i) => (
                <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">{s}</span>
              ))}
              {trade.emotion && trade.emotion.split(',').map((e, i) => (
                <span key={i} className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded text-xs">{e}</span>
              ))}
              <span className="text-gray-400 text-xs">数量: {trade.quantity} 股</span>
              {trade.fee > 0 && <span className="text-gray-400 text-xs">手续费: ${trade.fee}</span>}
            </div>
            {trade.notes && (
              <div className="flex items-start gap-2">
                <TrendingUp className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <p className="text-sm text-gray-600 leading-relaxed">{trade.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
