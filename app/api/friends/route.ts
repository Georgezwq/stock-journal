import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

interface Friend { id: string; nickname: string; avatar: string | null }

// 获取好友列表（已接受的）+ 待处理的请求
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: '未登录' }, { status: 401 })
  const me = session.user.id

  const friendships = await prisma.friendship.findMany({
    where: {
      status: 'ACCEPTED',
      OR: [{ requesterId: me }, { receiverId: me }],
    },
    include: {
      requester: { select: { id: true, nickname: true, avatar: true } },
      receiver: { select: { id: true, nickname: true, avatar: true } },
    },
  })

  const friends = friendships.map((f: { requesterId: string; requester: Friend; receiver: Friend }) =>
    f.requesterId === me ? f.receiver : f.requester
  )

  // 收到的待处理好友请求
  const pending = await prisma.friendship.findMany({
    where: { receiverId: me, status: 'PENDING' },
    include: { requester: { select: { id: true, nickname: true, avatar: true } } },
  })

  return NextResponse.json({ friends, pending })
}

// 发送好友请求
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { receiverId } = await req.json()
  if (!receiverId) return NextResponse.json({ error: '缺少 receiverId' }, { status: 400 })
  if (receiverId === session.user.id) return NextResponse.json({ error: '不能加自己' }, { status: 400 })

  // 检查是否已有关系
  const exists = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: session.user.id, receiverId },
        { requesterId: receiverId, receiverId: session.user.id },
      ],
    },
  })
  if (exists) {
    if (exists.status === 'ACCEPTED') return NextResponse.json({ error: '已是好友' }, { status: 400 })
    return NextResponse.json({ error: '已发送过请求' }, { status: 400 })
  }

  const f = await prisma.friendship.create({
    data: { requesterId: session.user.id, receiverId },
  })

  // Ably 通知对方有新好友请求
  try {
    const Ably = (await import('ably')).default
    const ably = new Ably.Rest(process.env.ABLY_API_KEY!)
    await ably.channels.get(`user:${receiverId}`).publish('friend-request', { fromId: session.user.id })
  } catch { /* ignore */ }

  return NextResponse.json(f)
}
