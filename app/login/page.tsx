'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { TrendingUp, Mail, Lock, LogIn } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // 检测是否刚注册完
  const registered = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('registered') === '1'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })
    setLoading(false)
    if (res?.error) {
      setError('邮箱或密码错误')
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <TrendingUp className="w-8 h-8 text-blue-600" />
          <span className="text-2xl font-bold text-gray-900">美股复盘</span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-gray-900 mb-6">登录账号</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="your@email.com"
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="至少 6 位"
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

          {registered && (
              <div className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">🎉 注册成功！请登录</div>
            )}
            {error && (
              <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              {loading ? '登录中...' : '登录'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            还没有账号？{' '}
            <Link href="/register" className="text-blue-600 hover:underline font-medium">
              立即注册
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
