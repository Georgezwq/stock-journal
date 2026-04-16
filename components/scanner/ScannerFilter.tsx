'use client'

import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'

export interface ScannerFilters {
  minChange: number
  maxChange: number
  minPrice: number
  maxPrice: number
  minVolume: number
  minMarketCap: number  // 最低市值（美元），0 = 不限
  prevDayMinChange: number   // 前一交易日最小涨跌幅，-999 = 不限
  prevDayMaxChange: number   // 前一交易日最大涨跌幅，999 = 不限
  prevWeekMinChange: number  // 前一周最小涨跌幅，-999 = 不限
  prevWeekMaxChange: number  // 前一周最大涨跌幅，999 = 不限
  prevMonthMinChange: number // 前一月最小涨跌幅，-999 = 不限
  prevMonthMaxChange: number // 前一月最大涨跌幅，999 = 不限
}

interface ScannerFilterProps {
  onScan: (filters: ScannerFilters) => void
  loading: boolean
}

export default function ScannerFilter({ onScan, loading }: ScannerFilterProps) {
  const [filters, setFilters] = useState<ScannerFilters>({
    minChange: -15,
    maxChange: 15,
    minPrice: 5,
    maxPrice: 999999,
    minVolume: 0,
    minMarketCap: 0,
    prevDayMinChange: -999,
    prevDayMaxChange: 999,
    prevWeekMinChange: -999,
    prevWeekMaxChange: 999,
    prevMonthMinChange: -999,
    prevMonthMaxChange: 999,
  })

  const set = (key: keyof ScannerFilters, value: number) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <SlidersHorizontal className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold">筛选条件</h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">最小涨跌幅 (%)</label>
          <input
            type="number"
            value={filters.minChange}
            onChange={(e) => set('minChange', parseFloat(e.target.value))}
            step="0.5"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">最大涨跌幅 (%)</label>
          <input
            type="number"
            value={filters.maxChange}
            onChange={(e) => set('maxChange', parseFloat(e.target.value))}
            step="0.5"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">最低价格 (USD)</label>
          <input
            type="number"
            value={filters.minPrice}
            onChange={(e) => set('minPrice', parseFloat(e.target.value))}
            min="0"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">最高价格 (USD)</label>
          <input
            type="number"
            value={filters.maxPrice === 999999 ? '' : filters.maxPrice}
            onChange={(e) => set('maxPrice', e.target.value ? parseFloat(e.target.value) : 999999)}
            min="0"
            placeholder="不限"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* 市值筛选 */}
      <div>
        <label className="block text-xs text-gray-500 mb-1.5">最低市值</label>
        <div className="flex flex-wrap gap-1.5">
          {([
            { label: '不限', value: 0 },
            { label: '10亿+', value: 1e9 },
            { label: '50亿+', value: 5e9 },
            { label: '100亿+', value: 10e9 },
            { label: '500亿+', value: 50e9 },
          ] as const).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => set('minMarketCap', opt.value)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                filters.minMarketCap === opt.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 前一交易日涨跌幅 */}
      <div>
        <label className="block text-xs text-gray-500 mb-1.5">前一交易日涨跌幅 (%)</label>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="number"
            value={filters.prevDayMinChange === -999 ? '' : filters.prevDayMinChange}
            onChange={(e) => set('prevDayMinChange', e.target.value ? parseFloat(e.target.value) : -999)}
            step="0.5"
            placeholder="不限"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            value={filters.prevDayMaxChange === 999 ? '' : filters.prevDayMaxChange}
            onChange={(e) => set('prevDayMaxChange', e.target.value ? parseFloat(e.target.value) : 999)}
            step="0.5"
            placeholder="不限"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex justify-between text-[10px] text-gray-400 mt-0.5 px-1">
          <span>最小</span><span>最大</span>
        </div>
      </div>

      {/* 前一周涨跌幅 */}
      <div>
        <label className="block text-xs text-gray-500 mb-1.5">前一周涨跌幅 (%)</label>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="number"
            value={filters.prevWeekMinChange === -999 ? '' : filters.prevWeekMinChange}
            onChange={(e) => set('prevWeekMinChange', e.target.value ? parseFloat(e.target.value) : -999)}
            step="1"
            placeholder="不限"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            value={filters.prevWeekMaxChange === 999 ? '' : filters.prevWeekMaxChange}
            onChange={(e) => set('prevWeekMaxChange', e.target.value ? parseFloat(e.target.value) : 999)}
            step="1"
            placeholder="不限"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex justify-between text-[10px] text-gray-400 mt-0.5 px-1">
          <span>最小</span><span>最大</span>
        </div>
      </div>

      {/* 前一个月涨跌幅 */}
      <div>
        <label className="block text-xs text-gray-500 mb-1.5">前一个月涨跌幅 (%)</label>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="number"
            value={filters.prevMonthMinChange === -999 ? '' : filters.prevMonthMinChange}
            onChange={(e) => set('prevMonthMinChange', e.target.value ? parseFloat(e.target.value) : -999)}
            step="1"
            placeholder="不限"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            value={filters.prevMonthMaxChange === 999 ? '' : filters.prevMonthMaxChange}
            onChange={(e) => set('prevMonthMaxChange', e.target.value ? parseFloat(e.target.value) : 999)}
            step="1"
            placeholder="不限"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex justify-between text-[10px] text-gray-400 mt-0.5 px-1">
          <span>最小</span><span>最大</span>
        </div>
      </div>

      {/* Quick presets */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-gray-500 self-center">快捷:</span>
        <button
          onClick={() => setFilters({ minChange: 3, maxChange: 10, minPrice: 10, maxPrice: 999999, minVolume: 100000, minMarketCap: 5e9, prevDayMinChange: -999, prevDayMaxChange: 999, prevWeekMinChange: -999, prevWeekMaxChange: 999, prevMonthMinChange: -999, prevMonthMaxChange: 999 })}
          className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs hover:bg-green-100"
        >强势上涨股</button>
        <button
          onClick={() => setFilters({ minChange: -10, maxChange: -3, minPrice: 5, maxPrice: 999999, minVolume: 0, minMarketCap: 5e9, prevDayMinChange: -999, prevDayMaxChange: 999, prevWeekMinChange: -999, prevWeekMaxChange: 999, prevMonthMinChange: -999, prevMonthMaxChange: 999 })}
          className="px-2 py-1 bg-red-50 text-red-700 rounded text-xs hover:bg-red-100"
        >超跌股</button>
        <button
          onClick={() => setFilters({ minChange: -1, maxChange: 1, minPrice: 50, maxPrice: 999999, minVolume: 0, minMarketCap: 50e9, prevDayMinChange: -999, prevDayMaxChange: 999, prevWeekMinChange: -999, prevWeekMaxChange: 999, prevMonthMinChange: -999, prevMonthMaxChange: 999 })}
          className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100"
        >横盘整理</button>
        <button
          onClick={() => setFilters({ minChange: 3, maxChange: 15, minPrice: 5, maxPrice: 999999, minVolume: 0, minMarketCap: 5e9, prevDayMinChange: -10, prevDayMaxChange: -3, prevWeekMinChange: -999, prevWeekMaxChange: 999, prevMonthMinChange: -999, prevMonthMaxChange: 999 })}
          className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs hover:bg-purple-100"
        >昨跌今涨</button>
        <button
          onClick={() => setFilters({ minChange: 3, maxChange: 15, minPrice: 5, maxPrice: 999999, minVolume: 0, minMarketCap: 5e9, prevDayMinChange: -999, prevDayMaxChange: 999, prevWeekMinChange: -999, prevWeekMaxChange: -5, prevMonthMinChange: -999, prevMonthMaxChange: 999 })}
          className="px-2 py-1 bg-orange-50 text-orange-700 rounded text-xs hover:bg-orange-100"
        >周跌反弹</button>
      </div>

      <button
        onClick={() => onScan(filters)}
        disabled={loading}
        className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading ? '扫描中...' : '开始扫描'}
      </button>
    </div>
  )
}
