import { NextResponse } from 'next/server'
import { fetchIndex, fetchExtendedQuote } from '@/lib/eastmoney'

const INDICES = [
  { id: '100.NDX', symbol: 'NDX', name: '纳斯达克100' },
  { id: '100.SPX', symbol: 'SPX', name: '标普500' },
  { id: '100.DJI', symbol: 'DJI', name: '道琼斯' },
]

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ])
}

export async function GET() {
  const results = await Promise.allSettled(
    INDICES.map(async (idx) => {
      // 并发请求东方财富 + Yahoo盘前盘后
      const [data, ext] = await Promise.all([
        withTimeout(fetchIndex(idx.id), 8000),
        withTimeout(fetchExtendedQuote(idx.symbol), 6000),
      ])
      if (data) return { ...data, name: idx.name, displayName: idx.name, ...(ext ?? {}) }
      return null
    })
  )

  const indices = results
    .map((r) => (r.status === 'fulfilled' ? r.value : null))
    .filter(Boolean)

  return NextResponse.json(indices)
}
