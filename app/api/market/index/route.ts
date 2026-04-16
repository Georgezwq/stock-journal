import { NextResponse } from 'next/server'
import { fetchIndex } from '@/lib/eastmoney'

const INDICES = [
  { id: '100.NDX', name: '纳斯达克100' },
  { id: '100.SPX', name: '标普500' },
  { id: '100.DJI', name: '道琼斯' },
]

// 总体超时：即使个别指数请求慢，也不阻塞超过 8 秒
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ])
}

export async function GET() {
  const results = await Promise.allSettled(
    INDICES.map(async (idx) => {
      const data = await withTimeout(fetchIndex(idx.id), 8000)
      if (data) return { ...data, name: idx.name, displayName: idx.name }
      return null
    })
  )

  const indices = results
    .map((r) => (r.status === 'fulfilled' ? r.value : null))
    .filter(Boolean)

  return NextResponse.json(indices)
}
