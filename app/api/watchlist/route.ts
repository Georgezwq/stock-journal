import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const list = await prisma.watchlist.findMany({ orderBy: { addedAt: 'desc' } })
  return NextResponse.json(list)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { symbol, name, notes } = body

  if (!symbol) return NextResponse.json({ error: '缺少 symbol' }, { status: 400 })

  const item = await prisma.watchlist.upsert({
    where: { symbol: symbol.toUpperCase() },
    update: { name: name || null, notes: notes || null },
    create: { symbol: symbol.toUpperCase(), name: name || null, notes: notes || null },
  })

  return NextResponse.json(item, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol')
  if (!symbol) return NextResponse.json({ error: '缺少 symbol' }, { status: 400 })

  await prisma.watchlist.delete({ where: { symbol: symbol.toUpperCase() } })
  return NextResponse.json({ success: true })
}
