import { NextRequest, NextResponse } from 'next/server'
import { fetchKLine } from '@/lib/eastmoney'
import type { EastMoneyKLine } from '@/lib/eastmoney'

// K线缓存：避免频繁请求东方财富（历史K线短期内不会变）
const klineCache = new Map<string, { data: EastMoneyKLine[]; ts: number }>()
const CACHE_TTL = 300_000 // 5 分钟缓存（K线历史数据不会频繁变化）

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol')
  const period = (searchParams.get('period') || '101') as '101' | '102' | '103'
  const limit = parseInt(searchParams.get('limit') || '365')
  const end = searchParams.get('end') || undefined

  if (!symbol) {
    return NextResponse.json({ error: '缺少 symbol 参数' }, { status: 400 })
  }

  // 检查缓存
  const cacheKey = `${symbol.toUpperCase()}-${period}-${limit}-${end || ''}`
  const cached = klineCache.get(cacheKey)
  if (cached && Date.now() - cached.ts < CACHE_TTL && cached.data.length > 0) {
    return NextResponse.json(cached.data)
  }

  const klines = await fetchKLine(symbol, period, limit, end)

  // 有数据才缓存
  if (klines.length > 0) {
    klineCache.set(cacheKey, { data: klines, ts: Date.now() })
  }

  return NextResponse.json(klines)
}
