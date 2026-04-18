'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  BookOpen,
  BarChart2,
  TrendingUp,
  Search,
  Star,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { href: '/', label: '仪表盘', icon: LayoutDashboard },
  { href: '/trades', label: '交易记录', icon: BookOpen },
  { href: '/review', label: '复盘分析', icon: BarChart2 },
  { href: '/market', label: '行情数据', icon: TrendingUp },
  { href: '/watchlist', label: '自选股', icon: Star },
  { href: '/scanner', label: '选股扫描', icon: Search },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <>
      {/* 桌面端侧边栏 */}
      <aside
        className={`relative hidden md:flex flex-col h-screen bg-gray-900 text-white transition-all duration-300 ${
          collapsed ? 'w-16' : 'w-56'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b border-gray-700">
          <TrendingUp className="w-6 h-6 text-blue-400 flex-shrink-0" />
          {!collapsed && (
            <span className="ml-3 font-bold text-lg truncate">美股复盘</span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-lg mb-1 transition-colors ${
                  active
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="absolute -right-3 top-20 bg-gray-700 rounded-full p-1 hover:bg-gray-600 transition-colors z-10"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </aside>

      {/* 移动端底部导航栏（只显示5个常用页） */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-gray-900 border-t border-gray-700 flex items-center">
        {navItems.filter(i => i.href !== '/scanner').map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
                active ? 'text-blue-400' : 'text-gray-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] leading-tight">{label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
