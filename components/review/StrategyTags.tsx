'use client'

import { StrategyStats } from '@/types'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface StrategyTagsProps {
  data: StrategyStats[]
}

export default function StrategyTags({ data }: StrategyTagsProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400">
        暂无策略数据
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Bar chart */}
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="strategy" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(value) => [`$${Number(value).toFixed(2)}`, '总盈亏']}
            contentStyle={{ fontSize: 12 }}
          />
          <Bar dataKey="totalPnL" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.totalPnL >= 0 ? '#ef4444' : '#22c55e'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-gray-500 text-xs uppercase">
              <th className="pb-2 text-left">策略</th>
              <th className="pb-2 text-right">笔数</th>
              <th className="pb-2 text-right">胜率</th>
              <th className="pb-2 text-right">总盈亏</th>
              <th className="pb-2 text-right">均盈亏</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.map((s) => (
              <tr key={s.strategy} className="hover:bg-gray-50">
                <td className="py-2">
                  <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">
                    {s.strategy}
                  </span>
                </td>
                <td className="py-2 text-right text-gray-600">{s.count}</td>
                <td className={`py-2 text-right font-medium ${s.winRate >= 50 ? 'text-red-600' : 'text-green-600'}`}>
                  {s.winRate}%
                </td>
                <td className={`py-2 text-right font-mono font-medium ${s.totalPnL >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  ${s.totalPnL.toFixed(2)}
                </td>
                <td className={`py-2 text-right font-mono ${s.avgPnL >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  ${s.avgPnL.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
