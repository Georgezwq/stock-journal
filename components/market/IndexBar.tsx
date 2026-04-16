'use client'

import { Quote } from '@/types'
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react'

interface IndexBarProps {
  indices: Quote[]
  loading: boolean
  onRefresh: () => void
}

export default function IndexBar({ indices, loading, onRefresh }: IndexBarProps) {
  return (
    <div className="bg-gray-900 text-white px-3 md:px-6 py-2 md:py-3 flex items-center gap-3 md:gap-6">
      <span className="text-xs text-gray-400 font-medium whitespace-nowrap hidden sm:inline">大盘指数</span>

      {loading && indices.length === 0 ? (
        <span className="text-xs text-gray-400">加载中...</span>
      ) : (
        <div className="flex items-center gap-4 md:gap-6 overflow-x-auto scrollbar-none flex-1">
          {indices.map((idx) => {
            const isUp = idx.changePercent >= 0
            return (
              <div key={idx.symbol} className="flex items-center gap-2 whitespace-nowrap">
                <span className="text-xs text-gray-400">{(idx as Quote & { displayName?: string }).displayName || idx.name || idx.symbol}</span>
                <span className="font-mono font-semibold">{idx.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                <span className={`flex items-center gap-0.5 text-xs font-medium ${isUp ? 'text-red-400' : 'text-green-400'}`}>
                  {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {isUp ? '+' : ''}{idx.changePercent.toFixed(2)}%
                </span>
              </div>
            )
          })}
          {indices.length === 0 && (
            <span className="text-xs text-gray-500">行情数据不可用（市场可能已休市）</span>
          )}
        </div>
      )}

      <button
        onClick={onRefresh}
        className="ml-auto text-gray-400 hover:text-white transition-colors"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
      </button>
    </div>
  )
}
