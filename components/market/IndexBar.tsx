'use client'

import { Quote } from '@/types'
import { TrendingUp, TrendingDown, RefreshCw, Moon, Sunrise } from 'lucide-react'

interface IndexBarProps {
  indices: Quote[]
  loading: boolean
  onRefresh: () => void
}

// 手机端简短名称
const SHORT_NAME: Record<string, string> = {
  '纳斯达克100': '纳指',
  '标普500': '标普',
  '道琼斯': '道指',
}

export default function IndexBar({ indices, loading, onRefresh }: IndexBarProps) {
  return (
    <div className="sticky top-0 z-10 bg-gray-900 text-white px-3 md:px-6 py-2 md:py-3 flex items-center gap-2 md:gap-6">
      <span className="text-xs text-gray-400 font-medium whitespace-nowrap hidden sm:inline">大盘指数</span>

      {loading && indices.length === 0 ? (
        <span className="text-xs text-gray-400">加载中...</span>
      ) : (
        <div className="flex items-center gap-3 md:gap-6 flex-1 min-w-0">
          {indices.map((idx) => {
            const isUp = idx.changePercent >= 0
            const hasExt = idx.extPrice !== undefined
            const extIsUp = (idx.extChangePercent ?? 0) >= 0
            const ExtIcon = idx.extType === 'pre' ? Sunrise : Moon
            const extLabel = idx.extType === 'pre' ? '盘前' : '盘后'
            const fullName = (idx as Quote & { displayName?: string }).displayName || idx.name || idx.symbol
            const shortName = SHORT_NAME[fullName] ?? fullName

            return (
              <div key={idx.symbol} className="flex items-center gap-1.5 whitespace-nowrap min-w-0">
                {/* 名称：手机用短名，桌面用全名 */}
                <span className="text-xs text-gray-400">
                  <span className="sm:hidden">{shortName}</span>
                  <span className="hidden sm:inline">{fullName}</span>
                </span>

                {/* 价格：手机省略小数，桌面完整显示 */}
                <span className="font-mono font-semibold text-sm">
                  <span className="sm:hidden">
                    {idx.price >= 1000
                      ? idx.price.toLocaleString('en-US', { maximumFractionDigits: 0 })
                      : idx.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="hidden sm:inline">
                    {idx.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </span>

                <span className={`flex items-center gap-0.5 text-xs font-medium ${isUp ? 'text-red-400' : 'text-green-400'}`}>
                  <span className="hidden sm:inline">
                    {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  </span>
                  {isUp ? '+' : ''}{idx.changePercent.toFixed(2)}%
                </span>

                {/* 盘前/盘后：手机隐藏 */}
                {hasExt && (
                  <span className="hidden sm:flex items-center gap-1 text-xs text-gray-400 border-l border-gray-700 pl-2">
                    <ExtIcon className="w-2.5 h-2.5" />
                    <span className="text-gray-500">{extLabel}</span>
                    <span className="font-mono text-gray-200">{idx.extPrice!.toFixed(2)}</span>
                    <span className={extIsUp ? 'text-red-400' : 'text-green-400'}>
                      {extIsUp ? '+' : ''}{idx.extChangePercent!.toFixed(2)}%
                    </span>
                  </span>
                )}
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
        className="ml-auto text-gray-400 hover:text-white transition-colors shrink-0"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
      </button>
    </div>
  )
}
