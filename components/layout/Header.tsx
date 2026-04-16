'use client'

import { usePathname } from 'next/navigation'
import { RefreshCw } from 'lucide-react'

const titles: Record<string, string> = {
  '/': '仪表盘',
  '/trades': '交易记录',
  '/review': '复盘分析',
  '/market': '行情数据',
  '/scanner': '选股扫描',
}

interface HeaderProps {
  onRefresh?: () => void
}

export default function Header({ onRefresh }: HeaderProps) {
  const pathname = usePathname()
  const title = titles[pathname] || '美股复盘系统'

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">
          {new Date().toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'short',
          })}
        </span>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  )
}
