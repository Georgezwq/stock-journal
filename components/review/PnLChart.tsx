'use client'

import { EquityPoint } from '@/types'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { format } from 'date-fns'

interface PnLChartProps {
  data: EquityPoint[]
}

export default function PnLChart({ data }: PnLChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        暂无已平仓交易数据
      </div>
    )
  }

  const latest = data[data.length - 1]?.equity ?? 0
  const isPositive = latest >= 0

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={isPositive ? '#ef4444' : '#22c55e'} stopOpacity={0.3} />
            <stop offset="95%" stopColor={isPositive ? '#ef4444' : '#22c55e'} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="date"
          tickFormatter={(v) => format(new Date(v), 'M/d')}
          tick={{ fontSize: 11 }}
        />
        <YAxis
          tickFormatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}`}
          tick={{ fontSize: 11 }}
        />
        <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" />
        <Tooltip
          formatter={(value) => [`$${Number(value).toFixed(2)}`, '累计盈亏']}
          labelFormatter={(label) => format(new Date(label), 'yyyy-MM-dd')}
          contentStyle={{ fontSize: 12 }}
        />
        <Area
          type="monotone"
          dataKey="equity"
          stroke={isPositive ? '#ef4444' : '#22c55e'}
          strokeWidth={2}
          fill="url(#equityGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
