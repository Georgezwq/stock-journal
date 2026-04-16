import { NextRequest, NextResponse } from 'next/server'
import { fetchQuote, fetchExtendedQuote, EastMoneyQuote } from '@/lib/eastmoney'

// 内存缓存：避免频繁请求被限流
const quoteCache = new Map<string, { data: EastMoneyQuote; ts: number }>()
const CACHE_TTL = 60_000
const STALE_TTL = 300_000

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol')?.toUpperCase()

  if (!symbol) {
    return NextResponse.json({ error: '缺少 symbol 参数' }, { status: 400 })
  }

  const cached = quoteCache.get(symbol)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached.data)
  }

  // 并发请求东方财富行情 + Yahoo盘前盘后
  const [quote, ext] = await Promise.all([
    fetchQuote(symbol),
    fetchExtendedQuote(symbol),
  ])

  if (!quote) {
    if (cached && Date.now() - cached.ts < STALE_TTL) {
      return NextResponse.json(cached.data)
    }
    return NextResponse.json({ error: `未找到股票: ${symbol}` }, { status: 404 })
  }

  const result: EastMoneyQuote = { ...quote, ...(ext ?? {}) }
  quoteCache.set(symbol, { data: result, ts: Date.now() })
  return NextResponse.json(result)
}
