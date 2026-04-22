import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  const { email, password, nickname } = await req.json()

  if (!email || !password || !nickname) {
    return NextResponse.json({ error: '请填写所有字段' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: '密码至少 6 位' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
  if (existing) {
    return NextResponse.json({ error: '该邮箱已注册' }, { status: 400 })
  }

  const hashed = await bcrypt.hash(password, 10)
  // 随机分配一个 emoji 头像
  const avatars = ['🐯','🦊','🐼','🐨','🦁','🐸','🐙','🦋','🐬','🦅']
  const avatar = avatars[Math.floor(Math.random() * avatars.length)]

  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      password: hashed,
      nickname,
      avatar,
    },
  })

  return NextResponse.json({ id: user.id, email: user.email, nickname: user.nickname })
}
