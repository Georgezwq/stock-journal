'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Quote, KLineCandle } from '@/types'

export function useMarket() {
  const [indices, setIndices] = useState<Quote[]>([])
  const [indicesLoading, setIndicesLoading] = useState(true)
  const isFetchingRef = useRef(false) // 防重入：上一个请求没完成不发新的

  const fetchIndices = useCallback(async () => {
    // 防重入：如果上一次请求还没结束，跳过本次
    if (isFetchingRef.current) return
    isFetchingRef.current = true
    setIndicesLoading(true)
    try {
      const res = await fetch('/api/market/index')
      if (res.ok) {
        const data = await res.json()
        setIndices(data)
      }
    } catch {
      // ignore
    } finally {
      setIndicesLoading(false)
      isFetchingRef.current = false
    }
  }, [])

  useEffect(() => {
    fetchIndices()
    const interval = setInterval(fetchIndices, 60000) // 从 30s 改为 60s，减少请求压力
    return () => clearInterval(interval)
  }, [fetchIndices])

  const fetchQuote = useCallback(async (symbol: string): Promise<Quote | null> => {
    try {
      const res = await fetch(`/api/market/quote?symbol=${symbol}`)
      if (!res.ok) return null
      return await res.json()
    } catch {
      return null
    }
  }, [])

  const fetchKLine = useCallback(async (
    symbol: string,
    period: '101' | '102' | '103' = '101',
    limit = 365
  ): Promise<KLineCandle[]> => {
    try {
      const res = await fetch(`/api/market/kline?symbol=${symbol}&period=${period}&limit=${limit}`)
      if (!res.ok) return []
      return await res.json()
    } catch {
      return []
    }
  }, [])

  return { indices, indicesLoading, fetchQuote, fetchKLine, refreshIndices: fetchIndices }
}
