'use client'

import { TradeStats } from '@/types'
import { TrendingUp, TrendingDown, Target, Award, AlertTriangle, DollarSign } from 'lucide-react'

interface StatsCardsProps {
  stats: TradeStats
}

export default function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      label: '总盈亏',
      value: `$${stats.totalPnL.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: stats.totalPnL >= 0 ? 'text-red-600' : 'text-green-600',
      bg: stats.totalPnL >= 0 ? 'bg-red-50' : 'bg-green-50',
      iconColor: stats.totalPnL >= 0 ? 'text-red-500' : 'text-green-500',
    },
    {
      label: '胜率',
      value: `${stats.winRate.toFixed(1)}%`,
      icon: Target,
      color: stats.winRate >= 50 ? 'text-green-600' : 'text-orange-600',
      bg: 'bg-blue-50',
      iconColor: 'text-blue-500',
      sub: `${stats.totalTrades} 笔交易`,
    },
    {
      label: '盈亏比',
      value: stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2),
      icon: stats.profitFactor >= 1.5 ? TrendingUp : TrendingDown,
      color: stats.profitFactor >= 1.5 ? 'text-red-600' : 'text-green-600',
      bg: 'bg-purple-50',
      iconColor: 'text-purple-500',
      sub: `均盈$${stats.avgWin.toFixed(0)} / 均亏$${stats.avgLoss.toFixed(0)}`,
    },
    {
      label: '最大回撤',
      value: `$${stats.maxDrawdown.toFixed(0)}`,
      icon: AlertTriangle,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      iconColor: 'text-orange-500',
    },
    {
      label: '最佳交易',
      value: `$${stats.bestTrade.toFixed(2)}`,
      icon: Award,
      color: 'text-red-600',
      bg: 'bg-red-50',
      iconColor: 'text-red-500',
    },
    {
      label: '最差交易',
      value: `$${stats.worstTrade.toFixed(2)}`,
      icon: TrendingDown,
      color: 'text-green-600',
      bg: 'bg-green-50',
      iconColor: 'text-green-500',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {cards.map((card) => (
        <div key={card.label} className={`${card.bg} rounded-xl p-4`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">{card.label}</span>
            <card.icon className={`w-5 h-5 ${card.iconColor}`} />
          </div>
          <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
          {card.sub && <div className="text-xs text-gray-500 mt-1">{card.sub}</div>}
        </div>
      ))}
    </div>
  )
}
