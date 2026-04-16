'use client'

import { Quote } from '@/types'
import { TrendingUp, TrendingDown, Minus, Moon, Sunrise } from 'lucide-react'

interface QuoteCardProps {
  quote: Quote
  onAddToWatchlist?: () => void
}

export default function QuoteCard({ quote, onAddToWatchlist }: QuoteCardProps) {
  const isUp = quote.changePercent > 0
  const isFlat = quote.changePercent === 0

  const hasExt = quote.extPrice !== undefined && quote.extPrice !== null
  const extIsUp = (quote.extChangePercent ?? 0) > 0
  const extLabel = quote.extType === 'pre' ? '盘前' : '盘后'
  const ExtIcon = quote.extType === 'pre' ? Sunrise : Moon

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-2xl font-bold text-gray-900">{quote.symbol}</div>
          <div className="text-sm text-gray-500">{quote.name}</div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-gray-900">
            ${quote.price.toFixed(2)}
          </div>
          <div className={`flex items-center justify-end gap-1 font-medium ${
            isUp ? 'text-red-600' : isFlat ? 'text-gray-500' : 'text-green-600'
          }`}>
            {isUp ? <TrendingUp className="w-4 h-4" /> : isFlat ? <Minus className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>{isUp ? '+' : ''}{quote.change.toFixed(2)}</span>
            <span>({isUp ? '+' : ''}{quote.changePercent.toFixed(2)}%)</span>
          </div>
        </div>
      </div>

      {/* 盘前/盘后 */}
      {hasExt && (
        <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-100">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <ExtIcon className="w-3.5 h-3.5" />
            <span>{extLabel}</span>
            {quote.extTime && <span className="text-gray-400">{quote.extTime}</span>}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900">${quote.extPrice!.toFixed(2)}</span>
            <span className={`text-sm font-medium ${extIsUp ? 'text-red-600' : 'text-green-600'}`}>
              {extIsUp ? '+' : ''}{quote.extChangePercent!.toFixed(2)}%
            </span>
          </div>
        </div>
      )}

      {/* OHLV grid */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        {[
          { label: '今开', value: `$${quote.open.toFixed(2)}` },
          { label: '最高', value: `$${quote.high.toFixed(2)}`, color: 'text-red-600' },
          { label: '最低', value: `$${quote.low.toFixed(2)}`, color: 'text-green-600' },
          { label: '成交量', value: quote.volume >= 1e6 ? `${(quote.volume / 1e6).toFixed(1)}M` : quote.volume.toLocaleString() },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-gray-50 rounded-lg px-3 py-2">
            <div className="text-gray-500 text-xs">{label}</div>
            <div className={`font-semibold ${color || 'text-gray-800'}`}>{value}</div>
          </div>
        ))}
      </div>

      {onAddToWatchlist && (
        <button
          onClick={onAddToWatchlist}
          className="w-full py-2 border border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium"
        >
          + 加入观察名单
        </button>
      )}
    </div>
  )
}
