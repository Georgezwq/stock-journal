import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// 搜索用户（按昵称或邮箱）
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: '未登录' }, { status: 401 })

  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q) return NextResponse.json([])

  const users = await prisma.user.findMany({
    where: {
      AND: [
        { id: { not: session.user.id } },
        {
          OR: [
            { nickname: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        },
      ],
    },
    select: { id: true, nickname: true, avatar: true, email: true },
    take: 10,
  })
  return NextResponse.json(users)
}
