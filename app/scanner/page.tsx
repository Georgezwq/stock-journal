'use client'

import { useState, useRef, useCallback } from 'react'
import ScannerFilter, { ScannerFilters } from '@/components/scanner/ScannerFilter'
import ScannerResults from '@/components/scanner/ScannerResults'
import { useMarket } from '@/hooks/useMarket'
import IndexBar from '@/components/market/IndexBar'

interface ScanResult {
  symbol: string
  name: string
  price: number
  changePercent: number
  volume: number
  marketCapUSD: number  // 市值（美元），f20 对美股直接是 USD
  prevDayChange?: number   // 前一交易日涨跌幅（%），通过K线计算
  prevWeekChange?: number  // 前一周涨跌幅（%），~5个交易日前
  prevMonthChange?: number // 前一个月涨跌幅（%），~22个交易日前
}

// 杠杆/做空ETF关键词过滤（名称含这些词的直接排除）
const LEVERAGED_KEYWORDS = [
  '2X', '2x', '1.5x', '1.5X', '3X', '3x', 'Bull 2', 'Bear', 'Inverse', 'Short',
  '做空', '做多', '杠杆', '二倍', '三倍',
  'Daily Target', 'Direxion', 'ProShares Ultra', 'T-Rex', 'T-REX',
  'Tradr 2X', 'Defiance Daily', 'GraniteShares 2x', 'Leverage Shares 2X',
  'ETRACS', 'Leveraged',
]

function isLeveragedETF(name: string): boolean {
  return LEVERAGED_KEYWORDS.some((kw) => name.includes(kw))
}

// 单次请求：po=1 降序 / po=0 升序，fid 指定排序字段（f3=涨跌幅, f20=市值）
async function fetchOnePage(page: number, order: 0 | 1, sortField = 'f3'): Promise<ScanResult[]> {
  const url = `https://push2delay.eastmoney.com/api/qt/clist/get?pn=${page}&pz=200&po=${order}&np=1&fltt=2&invt=2&fid=${sortField}&fs=m:105,m:106,m:107&fields=f2,f3,f12,f14,f20,f47&ut=fa5fd1943c7b386f172d6893dbfba10b`
  try {
    const res = await fetch(url, { headers: { 'Referer': 'https://quote.eastmoney.com/' } })
    const data = await res.json()
    if (!data?.data?.diff || !Array.isArray(data.data.diff)) return []
    return data.data.diff
      .filter((item: Record<string, unknown>) => item.f2 && item.f2 !== '-' && item.f12)
      .map((item: Record<string, unknown>) => ({
        symbol: item.f12 as string,
        name: (item.f14 as string) || (item.f12 as string),
        price: parseFloat(String(item.f2)) || 0,
        changePercent: parseFloat(String(item.f3)) || 0,
        volume: typeof item.f47 === 'number' ? item.f47 : 0,
        marketCapUSD: typeof item.f20 === 'number' ? item.f20 : 0,
      }))
  } catch {
    return []
  }
}

// 并发抓取，带进度回调
async function fetchStockListBrowser(
  onProgress: (done: number, total: number) => void
): Promise<ScanResult[]> {
  const requests: Promise<ScanResult[]>[] = []
  for (let p = 1; p <= 5; p++) {
    requests.push(fetchOnePage(p, 1, 'f3'))
    requests.push(fetchOnePage(p, 0, 'f3'))
  }
  for (let p = 1; p <= 15; p++) {
    requests.push(fetchOnePage(p, 1, 'f20'))
  }
  for (let p = 1; p <= 3; p++) {
    requests.push(fetchOnePage(p, 0, 'f2'))
    requests.push(fetchOnePage(p, 1, 'f2'))
  }

  const total = requests.length
  let done = 0
  const results: ScanResult[][] = []

  // 逐个追踪完成进度
  const tracked = requests.map((p) =>
    p.then((r) => {
      done++
      onProgress(done, total)
      return r
    })
  )
  const pages = await Promise.all(tracked)
  const all = pages.flat()

  // 去重
  const seen = new Set<string>()
  return all.filter((s) => {
    if (seen.has(s.symbol)) return false
    seen.add(s.symbol)
    return true
  })
}

// 批量获取历史涨跌幅（前一日/前一周/前一月），带进度回调
async function fetchHistoricalChanges(
  stocks: ScanResult[],
  onProgress: (done: number, total: number) => void
): Promise<ScanResult[]> {
  const BATCH = 30
  const result = [...stocks]
  const total = result.length
  let done = 0

  for (let i = 0; i < result.length; i += BATCH) {
    const batch = result.slice(i, i + BATCH)
    const promises = batch.map(async (s, idx) => {
      try {
        // limit=25 足够覆盖约一个月的交易日
        const res = await fetch(`/api/market/kline?symbol=${s.symbol}&period=101&limit=25`)
        const data = await res.json()
        if (data && data.length >= 3) {
          const len = data.length
          const prevDay = data[len - 2]    // 前一交易日
          const twoDaysAgo = data[len - 3] // 前两天

          // 前一交易日涨跌幅
          const prevDayChange = parseFloat(((prevDay.close - twoDaysAgo.close) / twoDaysAgo.close * 100).toFixed(2))

          // 前一周涨跌幅（约5个交易日前 vs 前一交易日收盘）
          let prevWeekChange: number | undefined
          if (len >= 7) {
            const weekAgo = data[len - 7]  // ~5个交易日前（从prevDay往前数5天）
            prevWeekChange = parseFloat(((prevDay.close - weekAgo.close) / weekAgo.close * 100).toFixed(2))
          }

          // 前一个月涨跌幅（约22个交易日前 vs 前一交易日收盘）
          let prevMonthChange: number | undefined
          if (len >= 23) {
            const monthAgo = data[len - 23] // ~22个交易日前
            prevMonthChange = parseFloat(((prevDay.close - monthAgo.close) / monthAgo.close * 100).toFixed(2))
          } else if (len >= 7) {
            // 数据不足一个月但超过一周，用最早的数据点
            const earliest = data[0]
            prevMonthChange = parseFloat(((prevDay.close - earliest.close) / earliest.close * 100).toFixed(2))
          }

          result[i + idx] = {
            ...s,
            prevDayChange,
            prevWeekChange,
            prevMonthChange,
          }
        }
      } catch { /* ignore */ }
      done++
      onProgress(done, total)
    })
    await Promise.all(promises)
  }
  return result
}

export interface ScanProgress {
  percent: number   // 0~100
  text: string      // 进度描述
}

export default function ScannerPage() {
  const [results, setResults] = useState<ScanResult[]>([])
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState<ScanProgress | null>(null)
  const { indices, indicesLoading, refreshIndices } = useMarket()

  const handleScan = async (filters: ScannerFilters) => {
    setScanning(true)
    setProgress({ percent: 0, text: '正在抓取市场数据...' })
    try {
      // 阶段 1：抓取市场数据（占 0~30%）
      const stocks = await fetchStockListBrowser((done, total) => {
        const p = Math.round((done / total) * 30)
        setProgress({ percent: p, text: `抓取市场数据 ${done}/${total}` })
      })

      setProgress({ percent: 30, text: '筛选中...' })

      let filtered = stocks.filter((s) =>
        s.changePercent >= filters.minChange &&
        s.changePercent <= filters.maxChange &&
        s.price >= filters.minPrice &&
        s.price <= filters.maxPrice &&
        s.volume >= filters.minVolume &&
        (filters.minMarketCap === 0 || (s.marketCapUSD > 0 && s.marketCapUSD >= filters.minMarketCap)) &&
        !isLeveragedETF(s.name)
      )

      // 阶段 2：获取历史涨跌幅数据（占 30~95%）
      const needHistorical =
        filters.prevDayMinChange > -999 || filters.prevDayMaxChange < 999 ||
        filters.prevWeekMinChange > -999 || filters.prevWeekMaxChange < 999 ||
        filters.prevMonthMinChange > -999 || filters.prevMonthMaxChange < 999
      if (needHistorical) {
        setProgress({ percent: 32, text: `查询历史数据 0/${filtered.length}` })
        filtered = await fetchHistoricalChanges(filtered, (done, total) => {
          const p = 32 + Math.round((done / total) * 63)
          setProgress({ percent: p, text: `查询历史数据 ${done}/${total}` })
        })
        filtered = filtered.filter((s) => {
          // 前一日筛选
          if (filters.prevDayMinChange > -999 || filters.prevDayMaxChange < 999) {
            if (s.prevDayChange === undefined) return false
            if (s.prevDayChange < filters.prevDayMinChange || s.prevDayChange > filters.prevDayMaxChange) return false
          }
          // 前一周筛选
          if (filters.prevWeekMinChange > -999 || filters.prevWeekMaxChange < 999) {
            if (s.prevWeekChange === undefined) return false
            if (s.prevWeekChange < filters.prevWeekMinChange || s.prevWeekChange > filters.prevWeekMaxChange) return false
          }
          // 前一月筛选
          if (filters.prevMonthMinChange > -999 || filters.prevMonthMaxChange < 999) {
            if (s.prevMonthChange === undefined) return false
            if (s.prevMonthChange < filters.prevMonthMinChange || s.prevMonthChange > filters.prevMonthMaxChange) return false
          }
          return true
        })
      }

      setProgress({ percent: 100, text: '完成' })
      setResults(filtered)
    } catch (e) {
      console.error('Scanner fetch error:', e)
      try {
        const params = new URLSearchParams({
          minChange: filters.minChange.toString(),
          maxChange: filters.maxChange.toString(),
          minPrice: filters.minPrice.toString(),
          maxPrice: filters.maxPrice.toString(),
          minVolume: filters.minVolume.toString(),
        })
        const res = await fetch(`/api/scanner?${params}`)
        if (res.ok) {
          const data = await res.json()
          setResults(data)
        }
      } catch {
        // ignore
      }
    } finally {
      setScanning(false)
      setProgress(null)
    }
  }

  return (
    <div className="flex flex-col flex-1">
      <IndexBar indices={indices} loading={indicesLoading} onRefresh={refreshIndices} />

      <div className="p-4 md:p-6 space-y-4 md:space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">选股扫描器</h1>
          <p className="text-sm text-gray-500 mt-0.5">设置筛选条件，扫描符合条件的美股</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          <div className="lg:col-span-1">
            <ScannerFilter onScan={handleScan} loading={scanning} />
          </div>
          <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 p-5">
            <ScannerResults results={results} loading={scanning} progress={progress} />
          </div>
        </div>
      </div>
    </div>
  )
}
