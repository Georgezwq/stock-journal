'use client'

import { useTrades } from '@/hooks/useTrades'
import { useStats } from '@/hooks/useStats'
import StatsCards from '@/components/review/StatsCards'
import PnLChart from '@/components/review/PnLChart'
import StrategyTags from '@/components/review/StrategyTags'
import { format } from 'date-fns'

export default function ReviewPage() {
  const { trades, loading } = useTrades()
  const { stats, equityCurve, strategyStats, closedTrades } = useStats(trades)

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center text-gray-400">加载中...</div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">复盘分析</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          共 {closedTrades.length} 笔已平仓交易 · {trades.filter(t => t.direction === 'BUY').length} 次买入 · {trades.filter(t => t.direction === 'SELL').length} 次卖出
        </p>
      </div>

      {/* Stats cards */}
      <StatsCards stats={stats} />

      {/* Equity curve */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">权益曲线（已实现盈亏累计）</h2>
        <PnLChart data={equityCurve} />
      </div>

      {/* Strategy analysis */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">策略标签分析</h2>
        <StrategyTags data={strategyStats} />
      </div>

      {/* Closed trades table */}
      {closedTrades.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">已平仓明细</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-gray-500 border-b">
                <tr>
                  <th className="pb-2 text-left">股票</th>
                  <th className="pb-2 text-left">买入日期</th>
                  <th className="pb-2 text-left">卖出日期</th>
                  <th className="pb-2 text-right">买入价</th>
                  <th className="pb-2 text-right">卖出价</th>
                  <th className="pb-2 text-right">数量</th>
                  <th className="pb-2 text-right">盈亏</th>
                  <th className="pb-2 text-right">盈亏%</th>
                  <th className="pb-2 text-right">持仓天</th>
                  <th className="pb-2 text-left">策略</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {closedTrades.slice().reverse().map((t, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="py-2 font-semibold text-gray-900">{t.symbol}</td>
                    <td className="py-2 text-gray-500">{format(new Date(t.buyDate), 'MM-dd')}</td>
                    <td className="py-2 text-gray-500">{format(new Date(t.sellDate), 'MM-dd')}</td>
                    <td className="py-2 text-right font-mono">${t.buyPrice.toFixed(2)}</td>
                    <td className="py-2 text-right font-mono">${t.sellPrice.toFixed(2)}</td>
                    <td className="py-2 text-right">{t.quantity}</td>
                    <td className={`py-2 text-right font-mono font-medium ${t.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}
                    </td>
                    <td className={`py-2 text-right ${t.pnlPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {t.pnlPct >= 0 ? '+' : ''}{t.pnlPct.toFixed(1)}%
                    </td>
                    <td className="py-2 text-right text-gray-500">{t.holdingDays}天</td>
                    <td className="py-2">
                      {t.strategy && (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">{t.strategy}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
