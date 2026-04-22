import { NextResponse } from 'next/server'
import Ably from 'ably'
import { getServerSession } from 'next-auth'

export async function GET() {
  const session = await getServerSession()
  if (!session?.user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const apiKey = process.env.ABLY_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Ably 未配置' }, { status: 500 })
  }

  const client = new Ably.Rest(apiKey)
  const tokenRequest = await client.auth.createTokenRequest({
    clientId: session.user.id ?? session.user.email ?? 'anonymous',
  })

  return NextResponse.json(tokenRequest)
}
