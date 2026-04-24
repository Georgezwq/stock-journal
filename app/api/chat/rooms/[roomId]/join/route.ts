import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// 加入房间
export async function POST(req: NextRequest, { params }: { params: { roomId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: '未登录' }, { status: 401 })

  await prisma.roomMember.upsert({
    where: { roomId_userId: { roomId: params.roomId, userId: session.user.id } },
    create: { roomId: params.roomId, userId: session.user.id },
    update: {},
  })
  return NextResponse.json({ ok: true })
}
