import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Ably from 'ably'

// 获取历史消息
export async function GET(req: NextRequest, { params }: { params: { roomId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const messages = await prisma.message.findMany({
    where: { roomId: params.roomId },
    orderBy: { createdAt: 'asc' },
    take: 100,
    include: { user: { select: { id: true, nickname: true, avatar: true } } },
  })
  return NextResponse.json(messages)
}

// 发送消息
export async function POST(req: NextRequest, { params }: { params: { roomId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { content } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: '消息不能为空' }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404 })

  // 自动加入房间
  await prisma.roomMember.upsert({
    where: { roomId_userId: { roomId: params.roomId, userId: user.id } },
    create: { roomId: params.roomId, userId: user.id },
    update: {},
  })

  const message = await prisma.message.create({
    data: { roomId: params.roomId, userId: user.id, content: content.trim() },
    include: { user: { select: { id: true, nickname: true, avatar: true } } },
  })

  // 通过 Ably 实时推送
  const apiKey = process.env.ABLY_API_KEY
  if (apiKey) {
    try {
      const ably = new Ably.Rest(apiKey)
      const channel = ably.channels.get(`room:${params.roomId}`)
      await channel.publish('message', message)
    } catch { /* ignore push failure */ }
  }

  return NextResponse.json(message)
}
