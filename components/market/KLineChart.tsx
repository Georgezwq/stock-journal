'use client'

import { useEffect, useRef, useState } from 'react'
import { KLineCandle } from '@/types'

interface KLineChartProps {
  symbol: string
  candles: KLineCandle[]
  period: '101' | '102' | '103'
  onPeriodChange: (p: '101' | '102' | '103') => void
  buyPoints?: { date: string; price: number }[]
  sellPoints?: { date: string; price: number }[]
}

const PERIOD_LABELS: Record<string, string> = { '101': '日K', '102': '周K', '103': '月K' }

export default function KLineChart({
  symbol,
  candles,
  period,
  onPeriodChange,
  buyPoints = [],
  sellPoints = [],
}: KLineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function init() {
      if (!containerRef.current || candles.length === 0) return

      const lc = await import('lightweight-charts')
      if (cancelled) return

      // Remove old chart
      if (chartRef.current) {
        try { chartRef.current.remove() } catch { /* ignore */ }
        chartRef.current = null
      }

      const chart = lc.createChart(containerRef.current, {
        width: containerRef.current.clientWidth,
        height: 420,
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

      // v5 API: use addSeries with series class
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const CandlestickSeries = (lc as any).CandlestickSeries || (lc as any).candlestickSeries
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const HistogramSeries = (lc as any).HistogramSeries || (lc as any).histogramSeries

      let candleSeries: ReturnType<typeof chart.addSeries>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let volumeSeries: any

      if (CandlestickSeries && typeof chart.addSeries === 'function') {
        // v5 API
        candleSeries = chart.addSeries(CandlestickSeries, {
          upColor: '#ef4444',
          downColor: '#22c55e',
          borderUpColor: '#ef4444',
          borderDownColor: '#22c55e',
          wickUpColor: '#ef4444',
          wickDownColor: '#22c55e',
        })
        if (HistogramSeries) {
          volumeSeries = chart.addSeries(HistogramSeries, {
            color: '#93c5fd',
            priceFormat: { type: 'volume' },
            priceScaleId: 'volume',
          })
        }
      } else {
        // v4 fallback
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        candleSeries = (chart as any).addCandlestickSeries({
          upColor: '#ef4444',
          downColor: '#22c55e',
          borderUpColor: '#ef4444',
          borderDownColor: '#22c55e',
          wickUpColor: '#ef4444',
          wickDownColor: '#22c55e',
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        volumeSeries = (chart as any).addHistogramSeries({
          color: '#93c5fd',
          priceFormat: { type: 'volume' },
          priceScaleId: 'volume',
        })
      }

      // Set candle data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formatted: any[] = candles.map((c) => ({
        time: c.time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
      candleSeries.setData(formatted)

      // Set volume data
      if (volumeSeries) {
        chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const volData: any[] = candles.map((c) => ({
          time: c.time,
          value: c.volume,
          color: c.close >= c.open ? '#fecaca' : '#bbf7d0',
        }))
        volumeSeries.setData(volData)
      }

      // Markers (v5 uses createSeriesMarkers plugin)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const markers: any[] = []
      for (const bp of buyPoints) {
        markers.push({ time: bp.date, position: 'belowBar', color: '#ef4444', shape: 'arrowUp', text: 'B', size: 1 })
      }
      for (const sp of sellPoints) {
        markers.push({ time: sp.date, position: 'aboveBar', color: '#22c55e', shape: 'arrowDown', text: 'S', size: 1 })
      }
      if (markers.length > 0) {
        markers.sort((a, b) => (a.time < b.time ? -1 : 1))
        // v5 uses createSeriesMarkers, v4 has setMarkers on series
        if (typeof lc.createSeriesMarkers === 'function') {
          lc.createSeriesMarkers(candleSeries, markers)
        } else if (typeof (candleSeries as any).setMarkers === 'function') {
          ;(candleSeries as any).setMarkers(markers)
        }
      }

      chart.timeScale().fitContent()

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
  }, [candles, buyPoints, sellPoints])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">{symbol} K线图</h3>
        <div className="flex gap-1">
          {(['101', '102', '103'] as const).map((p) => (
            <button
              key={p}
              onClick={() => onPeriodChange(p)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                period === p ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        {!ready && candles.length > 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-xl z-10">
            <div className="text-gray-400">加载图表中...</div>
          </div>
        )}
        {candles.length === 0 && (
          <div className="flex items-center justify-center h-96 bg-gray-50 rounded-xl text-gray-400">
            暂无K线数据
          </div>
        )}
        <div ref={containerRef} className="w-full rounded-xl overflow-hidden border border-gray-200" />
      </div>
    </div>
  )
}
