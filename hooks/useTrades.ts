'use client'

import { useState, useEffect, useCallback } from 'react'
import { Trade, TradeFormData } from '@/types'

export function useTrades(symbol?: string, account?: string) {
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTrades = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ limit: '2000' })
      if (symbol) params.set('symbol', symbol)
      if (account) params.set('account', account)
      const res = await fetch(`/api/trades?${params.toString()}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('获取交易记录失败')
      const data = await res.json()
      setTrades(data.trades || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : '未知错误')
    } finally {
      setLoading(false)
    }
  }, [symbol, account])

  useEffect(() => {
    fetchTrades()
  }, [fetchTrades])

  const addTrade = useCallback(async (formData: TradeFormData): Promise<Trade> => {
    const res = await fetch('/api/trades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    })

    if (!res.ok) {
      let errMsg = '添加失败'
      try {
        const err = await res.json()
        errMsg = err.error || errMsg
      } catch {
        errMsg = `服务器错误 (HTTP ${res.status})`
      }
      throw new Error(errMsg)
    }

    const newTrade = await res.json()

    // 二次确认：回读数据库验证交易确实已持久化
    try {
      const checkRes = await fetch(`/api/trades/${newTrade.id}`)
      if (!checkRes.ok) {
        console.error('[addTrade] 保存后回读失败, id:', newTrade.id)
        throw new Error('交易可能未保存成功，请刷新页面确认')
      }
    } catch (checkErr) {
      // 回读失败时仍然把交易显示出来，但给用户警告
      console.error('[addTrade] 回读确认异常:', checkErr)
    }

    setTrades((prev) => [newTrade, ...prev])
    return newTrade
  }, [])

  const updateTrade = useCallback(async (id: string, formData: Partial<TradeFormData>): Promise<Trade> => {
    const res = await fetch(`/api/trades/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    })
    if (!res.ok) throw new Error('更新失败')
    const updated = await res.json()
    setTrades((prev) => prev.map((t) => (t.id === id ? updated : t)))
    return updated
  }, [])

  const deleteTrade = useCallback(async (id: string) => {
    const res = await fetch(`/api/trades/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('删除失败')
    setTrades((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return { trades, loading, error, refetch: fetchTrades, addTrade, updateTrade, deleteTrade }
}
