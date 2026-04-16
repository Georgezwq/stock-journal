'use client'

import { useState } from 'react'
import { Trade } from '@/types'
import { Pencil, Trash2, ChevronUp, ChevronDown } from 'lucide-react'

interface TradeTableProps {
  trades: Trade[]
  onEdit: (trade: Trade) => void
  onDelete: (id: string) => void
  onRowClick?: (trade: Trade) => void
}

type SortKey = 'date' | 'symbol' | 'price' | 'quantity'
type SortDir = 'asc' | 'desc'

export default function TradeTable({ trades, onEdit, onDelete, onRowClick }: TradeTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [filterSymbol, setFilterSymbol] = useState('')
  const [filterDir, setFilterDir] = useState<'ALL' | 'BUY' | 'SELL'>('ALL')

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  const filtered = trades
    .filter((t) => {
      if (filterSymbol && !t.symbol.includes(filterSymbol.toUpperCase())) return false
      if (filterDir !== 'ALL' && t.direction !== filterDir) return false
      return true
    })
    .sort((a, b) => {
      let cmp = 0
      if (sortKey === 'date') cmp = new Date(a.date).getTime() - new Date(b.date).getTime()
      else if (sortKey === 'symbol') cmp = a.symbol.localeCompare(b.symbol)
      else if (sortKey === 'price') cmp = a.price - b.price
      else if (sortKey === 'quantity') cmp = a.quantity - b.quantity
      return sortDir === 'asc' ? cmp : -cmp
    })

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (
      sortDir === 'asc' ? <ChevronUp className="w-4 h-4 inline" /> : <ChevronDown className="w-4 h-4 inline" />
    ) : null

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <input
          type="text"
          placeholder="搜索股票代码..."
          value={filterSymbol}
          onChange={(e) => setFilterSymbol(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-0 flex-1 sm:flex-none"
        />
        <div className="flex gap-1">
          {(['ALL', 'BUY', 'SELL'] as const).map((d) => (
            <button
              key={d}
              onClick={() => setFilterDir(d)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterDir === d
                  ? d === 'BUY' ? 'bg-red-100 text-red-700' : d === 'SELL' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {d === 'ALL' ? '全部' : d === 'BUY' ? '买' : '卖'}
            </button>
          ))}
        </div>
        <span className="ml-auto text-sm text-gray-500 shrink-0">{filtered.length} 条</span>
      </div>

      {/* 移动端：卡片列表 */}
      <div className="md:hidden space-y-2">
        {filtered.length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm">暂无交易记录</div>
        ) : (
          filtered.map((trade) => (
            <div
              key={trade.id}
              onClick={() => onRowClick?.(trade)}
              className={`bg-white rounded-xl border border-gray-200 p-4 ${onRowClick ? 'cursor-pointer active:bg-gray-50' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    trade.direction === 'BUY' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {trade.direction === 'BUY' ? '买入' : '卖出'}
                  </span>
                  <span className="font-bold text-gray-900">{trade.symbol}</span>
                  {trade.name && <span className="text-xs text-gray-400">{trade.name}</span>}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); onEdit(trade) }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm(`确定删除 ${trade.symbol} 的交易记录?`)) onDelete(trade.id)
                    }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-4 text-sm">
                <span className="text-gray-500">{String(trade.date).slice(0, 10)}</span>
                <span className="font-mono text-gray-700">${trade.price.toFixed(3)}</span>
                <span className="text-gray-600">{trade.quantity.toLocaleString()} 股</span>
                <span className="font-mono text-gray-500 ml-auto">
                  ${(trade.price * trade.quantity).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              {(trade.strategy || trade.emotion) && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {trade.strategy?.split(',').map((s, i) => (
                    <span key={i} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">{s}</span>
                  ))}
                  {trade.emotion?.split(',').map((e, i) => (
                    <span key={i} className="text-xs text-gray-400">{e}</span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* 桌面端：表格 */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left cursor-pointer hover:bg-gray-100" onClick={() => handleSort('date')}>
                日期 <SortIcon k="date" />
              </th>
              <th className="px-4 py-3 text-left cursor-pointer hover:bg-gray-100" onClick={() => handleSort('symbol')}>
                股票 <SortIcon k="symbol" />
              </th>
              <th className="px-4 py-3 text-left">方向</th>
              <th className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100" onClick={() => handleSort('price')}>
                价格 <SortIcon k="price" />
              </th>
              <th className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100" onClick={() => handleSort('quantity')}>
                数量 <SortIcon k="quantity" />
              </th>
              <th className="px-4 py-3 text-right">金额</th>
              <th className="px-4 py-3 text-left">策略</th>
              <th className="px-4 py-3 text-left">情绪</th>
              <th className="px-4 py-3 text-center">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                  暂无交易记录
                </td>
              </tr>
            ) : (
              filtered.map((trade) => (
                <tr key={trade.id} className={`hover:bg-gray-50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`} onClick={() => onRowClick?.(trade)}>
                  <td className="px-4 py-3 text-gray-600">
                    <div>{String(trade.date).slice(0, 10)}</div>
                    <div className="text-xs text-gray-400">{String(trade.date).slice(11, 16)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{trade.symbol}</div>
                    {trade.name && <div className="text-xs text-gray-400">{trade.name}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      trade.direction === 'BUY'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {trade.direction === 'BUY' ? '买入' : '卖出'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    ${trade.price.toFixed(3)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {trade.quantity.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-600">
                    ${(trade.price * trade.quantity).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3">
                    {trade.strategy ? (
                      <div className="flex flex-wrap gap-1">
                        {trade.strategy.split(',').map((s, i) => (
                          <span key={i} className="inline-block px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">
                            {s}
                          </span>
                        ))}
                      </div>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {trade.emotion ? (
                      <div className="flex flex-wrap gap-1">
                        {trade.emotion.split(',').map((e, i) => (
                          <span key={i} className="text-xs text-gray-500">{e}</span>
                        ))}
                      </div>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); onEdit(trade) }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirm(`确定删除 ${trade.symbol} 的交易记录?`)) onDelete(trade.id)
                        }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
