import { NextRequest, NextResponse } from 'next/server'
import { fetchQuote, fetchExtendedQuotes, EastMoneyQuote } from '@/lib/eastmoney'

// 内存缓存
const quoteCache = new Map<string, { data: EastMoneyQuote; ts: number }>()
const CACHE_TTL = 15_000  // 15秒，和前端轮询频率一致

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const symbolsParam = searchParams.get('symbols')
  if (!symbolsParam) return NextResponse.json({ error: '缺少 symbols 参数' }, { status: 400 })

  const symbols = symbolsParam.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
  if (symbols.length === 0) return NextResponse.json({})

  const now = Date.now()
  const needFetch = symbols.filter(s => {
    const c = quoteCache.get(s)
    return !c || now - c.ts >= CACHE_TTL
  })

  // 并发：东方财富逐只 + 新浪批量盘前
  const [quotes, extMap] = await Promise.all([
    Promise.all(needFetch.map(s => fetchQuote(s).then(q => ({ s, q })))),
    fetchExtendedQuotes(needFetch),
  ])

  // 更新缓存
  for (const { s, q } of quotes) {
    if (!q) continue
    const prev = quoteCache.get(s)
    // ext 失败时保留上次缓存的盘前数据
    const ext = extMap[s] ?? (prev ? {
      extPrice: prev.data.extPrice,
      extChange: prev.data.extChange,
      extChangePercent: prev.data.extChangePercent,
      extType: prev.data.extType,
      extTime: prev.data.extTime,
    } : {})
    quoteCache.set(s, { data: { ...q, ...ext }, ts: now })
  }

  // 返回所有请求的股票（含缓存命中的）
  const result: Record<string, EastMoneyQuote> = {}
  for (const s of symbols) {
    const c = quoteCache.get(s)
    if (c) result[s] = c.data
  }
  return NextResponse.json(result)
}
