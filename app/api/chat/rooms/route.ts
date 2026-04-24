import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// 获取房间列表（含最新一条消息）
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const rooms = await prisma.room.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      _count: { select: { members: true } },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { user: { select: { nickname: true } } },
      },
    },
  })
  return NextResponse.json(rooms)
}

// 创建房间
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const { name, description } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: '请输入房间名' }, { status: 400 })

  const room = await prisma.room.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      members: { create: { userId: session.user.id } },
    },
  })
  return NextResponse.json(room)
}
