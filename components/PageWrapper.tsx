'use client'
// 非聊天页用这个 wrapper，支持垂直滚动 + 底部导航留白
export default function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 overflow-y-auto pb-16 md:pb-0" style={{ WebkitOverflowScrolling: 'touch' }}>
      {children}
    </div>
  )
}
