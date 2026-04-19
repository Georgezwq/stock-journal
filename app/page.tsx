'use client'

import { useTrades } from '@/hooks/useTrades'
import { useStats } from '@/hooks/useStats'
import { useMarket } from '@/hooks/useMarket'
import IndexBar from '@/components/market/IndexBar'
import Link from 'next/link'
import { BookOpen, BarChart2, TrendingUp, Search, ArrowUpRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Quote } from '@/types'

export default function DashboardPage() {
  const { trades, loading } = useTrades()
  const { stats, positions } = useStats(trades)
  const { indices, indicesLoading, refreshIndices, fetchQuote } = useMarket()

  // 持仓实时报价
  const [posQuotes, setPosQuotes] = useState<Record<string, Quote>>({})

  useEffect(() => {
    if (positions.length === 0) return
    const load = async () => {
      const results = await Promise.all(positions.map(p => fetchQuote(p.symbol)))
      const map: Record<string, Quote> = {}
      results.forEach((q, i) => { if (q) map[positions[i].symbol] = q })
      setPosQuotes(map)
    }
    load()
    const timer = setInterval(load, 15_000)
    return () => clearInterval(timer)
  }, [positions, fetchQuote])

  // 未实现总盈亏：有实时价的持仓加总
  const totalUnrealizedPnL = positions.reduce((s, p) => {
    const q = posQuotes[p.symbol]
    return q ? s + (q.price - p.avgCost) * p.quantity : s
  }, 0)
  const hasUnrealized = Object.keys(posQuotes).length > 0 && positions.length > 0
  const totalMarketValue = positions.reduce((s, p) => {
    const q = posQuotes[p.symbol]
    return s + (q ? q.price * p.quantity : p.totalCost)
  }, 0)

  return (
    <div className="flex flex-col min-h-screen">
      <IndexBar indices={indices} loading={indicesLoading} onRefresh={refreshIndices} />

      <div className="flex-1 p-4 md:p-6 space-y-4 md:space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">仪表盘</h1>
          <p className="text-gray-500 text-sm mt-1">欢迎回来，以下是你的交易概览</p>
        </div>

        {/* Key stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="text-sm text-gray-500 mb-1">已实现盈亏</div>
            <div className={`text-2xl font-bold ${stats.totalPnL >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {loading ? '—' : `$${stats.totalPnL.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="text-sm text-gray-500 mb-1">未实现盈亏</div>
            <div className={`text-2xl font-bold ${!hasUnrealized ? 'text-gray-300' : totalUnrealizedPnL >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {loading ? '—' : hasUnrealized ? `${totalUnrealizedPnL >= 0 ? '+' : ''}$${totalUnrealizedPnL.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
            </div>
            {hasUnrealized && positions.length > 0 && (
              <div className="text-xs text-gray-400 mt-0.5">
                浮动 {totalUnrealizedPnL >= 0 ? '+' : ''}{((totalUnrealizedPnL / positions.reduce((s, p) => s + p.totalCost, 0)) * 100).toFixed(2)}%
              </div>
            )}
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="text-sm text-gray-500 mb-1">交易笔数</div>
            <div className="text-2xl font-bold text-gray-900">
              {loading ? '—' : stats.totalTrades}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="text-sm text-gray-500 mb-1">胜率</div>
            <div className={`text-2xl font-bold ${stats.winRate >= 50 ? 'text-red-600' : 'text-orange-600'}`}>
              {loading ? '—' : `${stats.winRate.toFixed(1)}%`}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="text-sm text-gray-500 mb-1">当前持仓</div>
            <div className="text-2xl font-bold text-blue-600">
              {loading ? '—' : `$${totalMarketValue.toLocaleString('en-US', { minimumFractionDigits: 0 })}`}
            </div>
            <div className="text-xs text-gray-400">{positions.length} 只股票</div>
          </div>
        </div>

        {/* Open positions */}
        {positions.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">当前持仓</h2>
            </div>
            <div className="space-y-2">
              {positions.map((pos) => {
                const q = posQuotes[pos.symbol]
                const marketValue = q ? q.price * pos.quantity : pos.totalCost
                const unrealizedPnL = q ? (q.price - pos.avgCost) * pos.quantity : null
                const unrealizedPct = q ? ((q.price - pos.avgCost) / pos.avgCost) * 100 : null
                const isUp = (unrealizedPnL ?? 0) >= 0
                return (
                  <div key={pos.symbol} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <span className="font-semibold text-gray-900">{pos.symbol}</span>
                      {pos.name && <span className="text-sm text-gray-400 ml-2">{pos.name}</span>}
                      <div className="text-xs text-gray-400 mt-0.5">{pos.quantity} 股 @ ${pos.avgCost.toFixed(2)}</div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-mono font-semibold text-gray-800">
                        {q ? `$${q.price.toFixed(2)}` : '—'}
                        <span className="text-xs text-gray-400 ml-1">市值 ${marketValue.toLocaleString('en-US', { minimumFractionDigits: 0 })}</span>
                      </div>
                      {unrealizedPnL !== null && (
                        <div className={`font-medium ${isUp ? 'text-red-500' : 'text-green-500'}`}>
                          {isUp ? '+' : ''}${unrealizedPnL.toFixed(2)}
                          <span className="ml-1 text-xs">({isUp ? '+' : ''}{unrealizedPct!.toFixed(2)}%)</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Quick links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { href: '/trades', icon: BookOpen, label: '记录交易', desc: '添加买卖记录', color: 'blue' },
            { href: '/review', icon: BarChart2, label: '复盘分析', desc: '查看盈亏统计', color: 'purple' },
            { href: '/market', icon: TrendingUp, label: '行情数据', desc: '查看K线报价', color: 'green' },
            { href: '/scanner', icon: Search, label: '选股扫描', desc: '筛选热门股票', color: 'orange' },
          ].map(({ href, icon: Icon, label, desc, color }) => (
            <Link
              key={href}
              href={href}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow group"
            >
              <div className={`w-10 h-10 rounded-lg bg-${color}-100 flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 text-${color}-600`} />
              </div>
              <div className="font-semibold text-gray-900 flex items-center gap-1">
                {label}
                <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
              </div>
              <div className="text-sm text-gray-400">{desc}</div>
            </Link>
          ))}
        </div>

        {/* Recent trades */}
        {trades.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">最近交易</h2>
              <Link href="/trades" className="text-sm text-blue-600 hover:underline">查看全部 →</Link>
            </div>
            <div className="space-y-2">
              {trades.slice(0, 5).map((trade) => (
                <div key={trade.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      trade.direction === 'BUY' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {trade.direction === 'BUY' ? '买' : '卖'}
                    </span>
                    <span className="font-semibold">{trade.symbol}</span>
                    <span className="text-sm text-gray-400">{trade.quantity} 股</span>
                  </div>
                  <div className="text-right text-sm">
                    <div className="font-mono">${trade.price.toFixed(2)}</div>
                    <div className="text-gray-400">{String(trade.date).slice(0, 10)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
