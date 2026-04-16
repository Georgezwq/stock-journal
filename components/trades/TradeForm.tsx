'use client'

import { useState } from 'react'
import { TradeFormData, Direction, Emotion } from '@/types'
import { X } from 'lucide-react'

// 买入专属策略
const BUY_STRATEGIES = [
  '突破买入',
  '价值投资',
  '逢跌买进',   // 逢低分批买入
  '暴跌抄底（有反弹迹象）',
  '暴跌抄底（无反弹迹象）',
  '继续抄底',   // 跌了还在跌，继续买
  '追高加仓',   // 本来低价买入涨了还继续买
  '浮盈加仓',   // 持仓已经盈利，趁势加仓
  '平掉空仓',   // 买入平掉做空仓位
  '日内杠杆买入', // 日内杠杆交易
  '日内T入',    // 日内T+0买入
]

// 卖出专属策略
const SELL_STRATEGIES = [
  '获利了结',
  '及时止损',
  '割肉离场',
  '微利出局',   // 本来赚了不少，没卖，最后微利/平着走
  '做空',       // 做空卖出
  '日内杠杆平仓', // 日内交易到收盘前强制平仓
  '日内T出',    // 日内T+0卖出
  '隔日T出',    // 次日卖出T+1
]

const EMOTIONS: { value: Emotion; label: string }[] = [
  { value: '感觉不错', label: '感觉不错' },
  { value: '牛刀小试', label: '牛刀小试' },
  { value: '恐慌', label: '恐慌' },
  { value: '贪婪', label: '贪婪' },
  { value: '犹豫', label: '犹豫' },
  { value: '挺难受的', label: '挺难受的' },
  { value: '特别难受', label: '特别难受' },
  { value: '纯属贪婪', label: '纯属贪婪' },
  { value: '又追高了', label: '又追高了' },
  { value: '买完就知道又追高了', label: '买完就知道又追高了' },
  { value: '极其后悔', label: '极其后悔' },
]

interface TradeFormProps {
  onSubmit: (data: TradeFormData) => Promise<void>
  onClose: () => void
  initialData?: Partial<TradeFormData>
  isEdit?: boolean
  currentAccount?: string
  latestDate?: string   // 当前账户列表中最新的交易日期
}

export default function TradeForm({ onSubmit, onClose, initialData, isEdit, currentAccount, latestDate }: TradeFormProps) {
  const defaultDate = initialData?.date ?? latestDate ?? new Date().toISOString().split('T')[0]
  const defaultTime = initialData?.time ?? '09:30'

  const [form, setForm] = useState<TradeFormData>({
    symbol: '',
    name: '',
    direction: 'BUY',
    price: 0,
    quantity: 0,
    fee: 0,
    date: defaultDate,
    time: defaultTime,
    strategy: '',
    notes: '',
    emotion: '',
    account: currentAccount || '默认账户',
    ...initialData,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handle = (field: keyof TradeFormData, value: string | number) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value }
      // 切换方向时，过滤掉不属于新方向的策略
      if (field === 'direction') {
        const validSet = value === 'BUY' ? BUY_STRATEGIES : SELL_STRATEGIES
        if (prev.strategy) {
          const kept = prev.strategy.split(',').filter((s) => validSet.includes(s))
          next.strategy = kept.join(',')
        }
      }
      return next
    })
  }

  // 策略多选：点击切换选中/取消
  const toggleStrategy = (s: string) => {
    setForm((prev) => {
      const current = prev.strategy ? prev.strategy.split(',') : []
      const idx = current.indexOf(s)
      if (idx >= 0) {
        current.splice(idx, 1)
      } else {
        current.push(s)
      }
      return { ...prev, strategy: current.join(',') }
    })
  }

  // 情绪多选：点击切换选中/取消
  const toggleEmotion = (e: string) => {
    setForm((prev) => {
      const current = prev.emotion ? prev.emotion.split(',') : []
      const idx = current.indexOf(e)
      if (idx >= 0) {
        current.splice(idx, 1)
      } else {
        current.push(e)
      }
      return { ...prev, emotion: current.join(',') }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.symbol || !form.price || !form.quantity) {
      setError('请填写股票代码、价格和数量')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit(form)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败，请重试')
      setSubmitting(false)
    }
  }

  // 提交过程中不允许关闭弹窗，防止中断 API 请求
  const safeClose = () => {
    if (submitting) return
    onClose()
  }

  const strategies = form.direction === 'BUY' ? BUY_STRATEGIES : SELL_STRATEGIES

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold">{isEdit ? '编辑交易' : '添加交易'}</h2>
            <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">
              账户：{form.account}
            </span>
          </div>
          <button onClick={safeClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Direction toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">交易方向</label>
            <div className="flex gap-2">
              {(['BUY', 'SELL'] as Direction[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => handle('direction', d)}
                  className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                    form.direction === d
                      ? d === 'BUY'
                        ? 'bg-red-500 text-white'
                        : 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {d === 'BUY' ? '买入' : '卖出'}
                </button>
              ))}
            </div>
          </div>

          {/* Symbol */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              股票代码 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.symbol}
              onChange={(e) => handle('symbol', e.target.value.toUpperCase())}
              placeholder="AAPL"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
              required
            />
          </div>

          {/* Price + Quantity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                价格 (USD) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={form.price || ''}
                onChange={(e) => handle('price', parseFloat(e.target.value) || 0)}
                placeholder="150.000"
                step="0.001"
                min="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                数量 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={form.quantity || ''}
                onChange={(e) => handle('quantity', parseInt(e.target.value) || 0)}
                placeholder="100"
                min="1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Date + Time + Fee */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">交易日期</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => handle('date', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">成交时间</label>
              <input
                type="time"
                value={form.time}
                onChange={(e) => handle('time', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Fee */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">手续费 (USD)</label>
            <input
              type="number"
              value={form.fee || ''}
              onChange={(e) => handle('fee', parseFloat(e.target.value) || 0)}
              placeholder="0.000"
              step="0.001"
              min="0"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Strategy — 按钮多选，根据买入/卖出显示不同选项 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              策略标签
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded ${
                form.direction === 'BUY' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'
              }`}>
                {form.direction === 'BUY' ? '买入策略' : '卖出策略'}
              </span>
            </label>
            <div className="flex flex-wrap gap-2">
              {strategies.map((s) => {
                const selected = form.strategy ? form.strategy.split(',').includes(s) : false
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleStrategy(s)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      selected
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {s}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Emotion — 按钮多选 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">情绪记录</label>
            <div className="flex flex-wrap gap-2">
              {EMOTIONS.map(({ value, label }) => {
                const selected = form.emotion ? form.emotion.split(',').includes(value) : false
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleEmotion(value)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      selected
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">复盘笔记</label>
            <textarea
              value={form.notes || ''}
              onChange={(e) => handle('notes', e.target.value)}
              placeholder="记录你的交易思路和复盘..."
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Total */}
          <div className="bg-gray-50 rounded-lg px-4 py-3 flex justify-between items-center">
            <span className="text-sm text-gray-600">交易金额</span>
            <span className="font-bold text-gray-800">
              ${((form.price || 0) * (form.quantity || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={safeClose}
              disabled={submitting}
              className="flex-1 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-medium disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`flex-1 py-2.5 rounded-xl text-white font-medium transition-colors ${
                form.direction === 'BUY'
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-green-500 hover:bg-green-600'
              } disabled:opacity-50`}
            >
              {submitting ? '提交中...' : isEdit ? '保存' : form.direction === 'BUY' ? '确认买入' : '确认卖出'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
