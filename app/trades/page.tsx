'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTrades } from '@/hooks/useTrades'
import TradeForm from '@/components/trades/TradeForm'
import TradeTable from '@/components/trades/TradeTable'
import TradeReviewModal from '@/components/trades/TradeReviewModal'
import { Trade, TradeFormData } from '@/types'
import { Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

const STORAGE_KEY = 'stock_journal_accounts'
const DEFAULT_ACCOUNT = '张文强'

function loadAccounts(): string[] {
  if (typeof window === 'undefined') return [DEFAULT_ACCOUNT]
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed: string[] = raw ? JSON.parse(raw) : []
    // 保证默认账户始终存在且在第一位
    const set = new Set([DEFAULT_ACCOUNT, ...parsed])
    return Array.from(set)
  } catch {
    return [DEFAULT_ACCOUNT]
  }
}

function saveAccounts(list: string[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

export default function TradesPage() {
  const [accountList, setAccountList] = useState<string[]>([DEFAULT_ACCOUNT])
  const [currentAccount, setCurrentAccount] = useState(DEFAULT_ACCOUNT)
  const [newAccountInput, setNewAccountInput] = useState('')
  const { trades, loading, addTrade, updateTrade, deleteTrade } = useTrades(undefined, currentAccount)
  const [showForm, setShowForm] = useState(false)
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null)
  const [reviewTrade, setReviewTrade] = useState<Trade | null>(null)

  // 当前账户列表中最新的交易日期，作为添加交易的默认日期
  const latestDate = trades.length > 0
    ? trades.reduce((max, t) => {
        const d = String(t.date).slice(0, 10)
        return d > max ? d : max
      }, '1970-01-01')
    : undefined

  // 初始化时从 localStorage 读取账户列表（必须在 useEffect 里，避免 SSR hydration 不匹配）
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    const list = loadAccounts()
    setAccountList(list)
    setHydrated(true)
  }, [])

  const handleAddAccount = useCallback(() => {
    const name = newAccountInput.trim()
    if (!name) return
    if (accountList.includes(name)) {
      // 账户已存在，直接切换过去
      setCurrentAccount(name)
      setNewAccountInput('')
      return
    }
    const next = [...accountList, name]
    setAccountList(next)
    saveAccounts(next)
    setCurrentAccount(name)
    setNewAccountInput('')
    toast.success(`账户「${name}」已创建`)
  }, [newAccountInput, accountList])

  const handleDeleteAccount = useCallback((acc: string) => {
    if (acc === DEFAULT_ACCOUNT) {
      toast.error('默认账户不能删除')
      return
    }
    if (!confirm(`确定删除账户「${acc}」？\n（该账户下的交易记录不会被删除）`)) return
    const next = accountList.filter((a) => a !== acc)
    setAccountList(next)
    saveAccounts(next)
    if (currentAccount === acc) setCurrentAccount(DEFAULT_ACCOUNT)
    toast.success(`账户「${acc}」已删除`)
  }, [accountList, currentAccount])

  const handleAdd = async (data: TradeFormData) => {
    const saved = await addTrade({ ...data, account: currentAccount })
    toast.success(`✓ ${saved.symbol} ${saved.direction === 'BUY' ? '买入' : '卖出'} ${saved.quantity}股 已保存`)
  }

  const handleEdit = async (data: TradeFormData) => {
    if (!editingTrade) return
    await updateTrade(editingTrade.id, data)
    toast.success('交易记录已更新')
    setEditingTrade(null)
  }

  const handleDelete = async (id: string) => {
    await deleteTrade(id)
    toast.success('已删除')
  }

  const openEdit = (trade: Trade) => {
    setEditingTrade(trade)
    setShowForm(false)
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">交易记录</h1>
          <p className="text-sm text-gray-500 mt-0.5">共 {trades.length} 条记录</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">

          {/* 账户下拉 + 删除当前账户 */}
          {hydrated && (
            <div className="flex items-center gap-1">
              <label className="text-sm text-gray-500">账户：</label>
              <select
                value={currentAccount}
                onChange={(e) => setCurrentAccount(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {accountList.map((acc) => (
                  <option key={acc} value={acc}>{acc}</option>
                ))}
              </select>
              {currentAccount !== DEFAULT_ACCOUNT && (
                <button
                  onClick={() => handleDeleteAccount(currentAccount)}
                  title="删除当前账户"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* 新建账户 */}
          {hydrated && (
            <div className="flex items-center gap-1">
              <input
                type="text"
                placeholder="新账户名..."
                value={newAccountInput}
                onChange={(e) => setNewAccountInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddAccount()}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-28"
              />
              <button
                onClick={handleAddAccount}
                className="text-sm px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors"
              >
                + 新建
              </button>
            </div>
          )}

          <button
            onClick={() => { setShowForm(true); setEditingTrade(null) }}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            添加交易
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          加载中...
        </div>
      ) : (
        <TradeTable
          trades={trades}
          onEdit={openEdit}
          onDelete={handleDelete}
          onRowClick={setReviewTrade}
        />
      )}

      {/* Add Form */}
      {showForm && (
        <TradeForm
          onSubmit={handleAdd}
          onClose={() => setShowForm(false)}
          currentAccount={currentAccount}
          latestDate={latestDate}
        />
      )}

      {/* Edit Form */}
      {editingTrade && (
        <TradeForm
          onSubmit={handleEdit}
          onClose={() => setEditingTrade(null)}
          isEdit
          currentAccount={editingTrade.account}
          initialData={{
            symbol: editingTrade.symbol,
            name: editingTrade.name || '',
            direction: editingTrade.direction as 'BUY' | 'SELL',
            price: editingTrade.price,
            quantity: editingTrade.quantity,
            fee: editingTrade.fee,
            date: String(editingTrade.date).slice(0, 10),
            time: String(editingTrade.date).slice(11, 16),
            strategy: editingTrade.strategy || '',
            notes: editingTrade.notes || '',
            emotion: editingTrade.emotion || '',
            account: editingTrade.account,
          }}
        />
      )}

      {reviewTrade && (
        <TradeReviewModal
          trade={reviewTrade}
          onClose={() => setReviewTrade(null)}
        />
      )}
    </div>
  )
}
