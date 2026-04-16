import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const trade = await prisma.trade.findUnique({ where: { id: params.id } })
    if (!trade) return NextResponse.json({ error: '未找到' }, { status: 404 })
    return NextResponse.json(trade)
  } catch (err) {
    console.error('[TRADE] GET by id 失败:', err)
    return NextResponse.json({ error: '查询失败' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { symbol, name, direction, price, quantity, fee, date, time, strategy, notes, emotion, account } = body

    // 拼合日期和时间，存储时不做时区转换，字面时间即所存时间
    let fullDate: Date | undefined
    if (date) {
      const timeStr = time || '09:30'
      fullDate = new Date(`${date}T${timeStr}:00+00:00`)
    }

    const trade = await prisma.trade.update({
      where: { id: params.id },
      data: {
        symbol: symbol?.trim().toUpperCase(),
        name: name || null,
        direction,
        price: price !== undefined ? parseFloat(String(price)) : undefined,
        quantity: quantity !== undefined ? parseInt(String(quantity), 10) : undefined,
        fee: fee !== undefined ? parseFloat(String(fee)) : undefined,
        date: fullDate,
        strategy: strategy || null,
        notes: notes || null,
        emotion: emotion || null,
        account: account || undefined,
      },
    })

    console.log(`[TRADE] ✓ 更新成功: ${trade.symbol} ${trade.direction} ${trade.quantity}股 id=${trade.id}`)
    return NextResponse.json(trade)
  } catch (err) {
    console.error('[TRADE] PUT 更新失败:', err)
    return NextResponse.json(
      { error: `更新失败: ${err instanceof Error ? err.message : '未知错误'}` },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.trade.delete({ where: { id: params.id } })
    console.log(`[TRADE] ✓ 删除成功: id=${params.id}`)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[TRADE] DELETE 失败:', err)
    return NextResponse.json(
      { error: `删除失败: ${err instanceof Error ? err.message : '未知错误'}` },
      { status: 500 }
    )
  }
}
