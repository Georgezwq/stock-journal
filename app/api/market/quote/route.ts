import { NextRequest, NextResponse } from 'next/server'
import { fetchQuote, EastMoneyQuote } from '@/lib/eastmoney'

// 内存缓存：避免频繁请求东方财富被限流
const quoteCache = new Map<string, { data: EastMoneyQuote; ts: number }>()
const CACHE_TTL = 60_000 // 60 秒有效缓存
const STALE_TTL = 300_000 // 5 分钟内过期的旧数据仍可回退使用

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol')?.toUpperCase()

  if (!symbol) {
    return NextResponse.json({ error: '缺少 symbol 参数' }, { status: 400 })
  }

  // 检查缓存
  const cached = quoteCache.get(symbol)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached.data)
  }

  const quote = await fetchQuote(symbol)

  if (!quote) {
    // 如果请求失败但有旧缓存（5 分钟内），返回旧数据
    if (cached && Date.now() - cached.ts < STALE_TTL) {
      return NextResponse.json(cached.data)
    }
    return NextResponse.json({ error: `未找到股票: ${symbol}` }, { status: 404 })
  }

  // 更新缓存
  quoteCache.set(symbol, { data: quote, ts: Date.now() })

  return NextResponse.json(quote)
}
