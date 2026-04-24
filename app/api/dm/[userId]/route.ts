import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// 获取与某人的私信历史
export async function GET(req: NextRequest, { params }: { params: { userId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: '未登录' }, { status: 401 })
  const me = session.user.id
  const other = params.userId

  const messages = await prisma.directMessage.findMany({
    where: {
      OR: [
        { senderId: me, receiverId: other },
        { senderId: other, receiverId: me },
      ],
    },
    orderBy: { createdAt: 'asc' },
    take: 100,
    include: { sender: { select: { id: true, nickname: true, avatar: true } } },
  })
  return NextResponse.json(messages)
}

// 发送私信
export async function POST(req: NextRequest, { params }: { params: { userId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { content } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: '消息不能为空' }, { status: 400 })

  const msg = await prisma.directMessage.create({
    data: { senderId: session.user.id, receiverId: params.userId, content: content.trim() },
    include: { sender: { select: { id: true, nickname: true, avatar: true } } },
  })

  // Ably 实时推送给对方
  try {
    const Ably = (await import('ably')).default
    const ably = new Ably.Rest(process.env.ABLY_API_KEY!)
    const dmChannel = [session.user.id, params.userId].sort().join('-')
    await ably.channels.get(`dm:${dmChannel}`).publish('message', msg)
  } catch { /* ignore */ }

  return NextResponse.json(msg)
}
