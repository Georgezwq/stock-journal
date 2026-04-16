import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol')
  const account = searchParams.get('account')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '100')
  const skip = (page - 1) * limit

  const where = {
    ...(symbol ? { symbol: symbol.toUpperCase() } : {}),
    ...(account ? { account } : {}),
  }

  try {
    const [trades, total] = await Promise.all([
      prisma.trade.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      prisma.trade.count({ where }),
    ])

    return NextResponse.json({ trades, total, page, limit })
  } catch (err) {
    console.error('[TRADE] GET 查询失败:', err)
    return NextResponse.json(
      { error: '查询交易记录失败', trades: [], total: 0 },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '请求体解析失败' }, { status: 400 })
  }

  const { symbol, name, direction, price, quantity, fee, date, time, strategy, notes, emotion, account } = body as Record<string, string>

  if (!symbol || !direction || !price || !quantity || !date) {
    return NextResponse.json({ error: '缺少必填字段' }, { status: 400 })
  }

  // 校验数值字段，防止 NaN 入库
  const parsedPrice = parseFloat(String(price))
  const parsedQty = parseInt(String(quantity), 10)
  const parsedFee = parseFloat(String(fee || 0))

  if (isNaN(parsedPrice) || isNaN(parsedQty) || parsedQty <= 0) {
    return NextResponse.json({ error: `数值字段无效: price=${price}, quantity=${quantity}` }, { status: 400 })
  }

  // 拼合日期和时间，存储时不做时区转换，字面时间即所存时间
  const timeStr = time || '09:30'
  const fullDate = new Date(`${date}T${timeStr}:00+00:00`)

  if (isNaN(fullDate.getTime())) {
    return NextResponse.json({ error: `日期格式无效: ${date} ${timeStr}` }, { status: 400 })
  }

  try {
    const trade = await prisma.trade.create({
      data: {
        symbol: symbol.trim().toUpperCase(),
        name: (name as string) || null,
        direction,
        price: parsedPrice,
        quantity: parsedQty,
        fee: isNaN(parsedFee) ? 0 : parsedFee,
        date: fullDate,
        strategy: (strategy as string) || null,
        notes: (notes as string) || null,
        emotion: (emotion as string) || null,
        account: (account as string) || '张文强',
      },
    })

    // 写入后立即回读确认数据确实已持久化
    const confirmed = await prisma.trade.findUnique({ where: { id: trade.id } })
    if (!confirmed) {
      console.error('[TRADE] 写入后回读失败！trade.id =', trade.id)
      return NextResponse.json({ error: '交易写入数据库后无法确认，请重试' }, { status: 500 })
    }

    console.log(`[TRADE] ✓ 保存成功: ${confirmed.symbol} ${confirmed.direction} ${confirmed.quantity}股 @${confirmed.price} id=${confirmed.id}`)
    return NextResponse.json(confirmed, { status: 201 })
  } catch (err) {
    console.error('[TRADE] ✗ 保存失败:', err)
    return NextResponse.json(
      { error: `数据库写入失败: ${err instanceof Error ? err.message : '未知错误'}` },
      { status: 500 }
    )
  }
}
