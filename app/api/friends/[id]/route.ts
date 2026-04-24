import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// 接受好友请求
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const f = await prisma.friendship.findUnique({ where: { id: params.id } })
  if (!f || f.receiverId !== session.user.id) return NextResponse.json({ error: '无权操作' }, { status: 403 })

  const updated = await prisma.friendship.update({
    where: { id: params.id },
    data: { status: 'ACCEPTED' },
  })
  return NextResponse.json(updated)
}

// 删除好友 / 拒绝请求
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const f = await prisma.friendship.findUnique({ where: { id: params.id } })
  if (!f) return NextResponse.json({ error: '不存在' }, { status: 404 })
  if (f.requesterId !== session.user.id && f.receiverId !== session.user.id) {
    return NextResponse.json({ error: '无权操作' }, { status: 403 })
  }

  await prisma.friendship.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
