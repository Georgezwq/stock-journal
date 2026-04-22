'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import * as Ably from 'ably'
import { Send, Plus, X, Hash, Users, ArrowLeft } from 'lucide-react'
import IndexBar from '@/components/market/IndexBar'
import { useMarket } from '@/hooks/useMarket'

interface Room {
  id: string
  name: string
  description?: string | null
  _count: { members: number }
  messages: Array<{ content: string; user: { nickname: string } }>
}

interface Message {
  id: string
  content: string
  createdAt: string
  user: { id: string; nickname: string; avatar: string | null }
}

export default function ChatPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { indices, indicesLoading, refreshIndices } = useMarket()

  const [rooms, setRooms] = useState<Room[]>([])
  const [activeRoom, setActiveRoom] = useState<Room | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [newRoomDesc, setNewRoomDesc] = useState('')
  const [creating, setCreating] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const ablyRef = useRef<Ably.Realtime | null>(null)
  const channelRef = useRef<Ably.RealtimeChannel | null>(null)

  // 未登录跳转
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  // 加载房间列表
  const loadRooms = useCallback(async () => {
    const res = await fetch('/api/chat/rooms')
    if (res.ok) setRooms(await res.json())
  }, [])

  useEffect(() => { loadRooms() }, [loadRooms])

  // 初始化 Ably
  useEffect(() => {
    if (!session) return
    const ably = new Ably.Realtime({
      authUrl: '/api/chat/token',
      authMethod: 'GET',
    })
    ablyRef.current = ably
    return () => { ably.close() }
  }, [session])

  // 切换房间：加载历史消息 + 订阅 Ably 频道
  useEffect(() => {
    if (!activeRoom || !ablyRef.current) return

    // 取消旧频道订阅
    if (channelRef.current) {
      channelRef.current.unsubscribe()
      channelRef.current.detach()
    }

    // 加载历史消息
    fetch(`/api/chat/rooms/${activeRoom.id}/messages`)
      .then(r => r.json())
      .then(setMessages)

    // 订阅新频道
    const channel = ablyRef.current.channels.get(`room:${activeRoom.id}`)
    channelRef.current = channel
    channel.subscribe('message', (msg) => {
      const newMsg = msg.data as Message
      setMessages(prev => {
        // 避免重复（自己发送时 API 已经返回）
        if (prev.some(m => m.id === newMsg.id)) return prev
        return [...prev, newMsg]
      })
    })

    return () => {
      channel.unsubscribe()
    }
  }, [activeRoom])

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 发送消息
  const sendMessage = async () => {
    if (!input.trim() || !activeRoom || sending) return
    const content = input.trim()
    setInput('')
    setSending(true)
    try {
      const res = await fetch(`/api/chat/rooms/${activeRoom.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (res.ok) {
        const msg = await res.json()
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev
          return [...prev, msg]
        })
      }
    } finally {
      setSending(false)
    }
  }

  // 创建房间
  const createRoom = async () => {
    if (!newRoomName.trim()) return
    setCreating(true)
    const res = await fetch('/api/chat/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newRoomName.trim(), description: newRoomDesc.trim() }),
    })
    setCreating(false)
    if (res.ok) {
      setShowCreate(false)
      setNewRoomName('')
      setNewRoomDesc('')
      await loadRooms()
    }
  }

  if (status === 'loading') {
    return <div className="flex-1 flex items-center justify-center text-gray-400">加载中...</div>
  }

  return (
    <div className="flex flex-col flex-1 h-full">
      <IndexBar indices={indices} loading={indicesLoading} onRefresh={refreshIndices} />

      <div className="flex flex-1 min-h-0">
        {/* 左侧：房间列表（移动端在没选房间时显示） */}
        <div className={`${activeRoom ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-64 border-r border-gray-200 bg-white`}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">聊天室</h2>
            <button
              onClick={() => setShowCreate(true)}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {rooms.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-400">
                <Hash className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                暂无聊天室，点击 + 创建
              </div>
            ) : (
              rooms.map(room => (
                <button
                  key={room.id}
                  onClick={() => setActiveRoom(room)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                    activeRoom?.id === room.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="font-medium text-gray-800 truncate">{room.name}</span>
                  </div>
                  {room.messages[0] && (
                    <div className="mt-0.5 text-xs text-gray-400 truncate pl-6">
                      {room.messages[0].user.nickname}: {room.messages[0].content}
                    </div>
                  )}
                  <div className="mt-0.5 flex items-center gap-1 text-xs text-gray-300 pl-6">
                    <Users className="w-3 h-3" />
                    {room._count.members} 人
                  </div>
                </button>
              ))
            )}
          </div>

          {/* 用户信息 */}
          <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-2">
            <span className="text-xl">{(session?.user as { avatar?: string })?.avatar || '😊'}</span>
            <span className="text-sm font-medium text-gray-700 truncate flex-1">{session?.user?.name}</span>
          </div>
        </div>

        {/* 右侧：聊天区域 */}
        {activeRoom ? (
          <div className="flex flex-col flex-1 min-w-0">
            {/* 顶部栏 */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white">
              <button
                onClick={() => setActiveRoom(null)}
                className="md:hidden p-1 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <Hash className="w-4 h-4 text-gray-400" />
              <div className="min-w-0">
                <div className="font-semibold text-gray-800">{activeRoom.name}</div>
                {activeRoom.description && (
                  <div className="text-xs text-gray-400 truncate">{activeRoom.description}</div>
                )}
              </div>
              <div className="ml-auto flex items-center gap-1 text-xs text-gray-400">
                <Users className="w-3.5 h-3.5" />
                {activeRoom._count.members}
              </div>
            </div>

            {/* 消息列表 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {messages.length === 0 && (
                <div className="text-center text-gray-400 text-sm py-8">
                  还没有消息，发送第一条吧 👋
                </div>
              )}
              {messages.map((msg, i) => {
                const isMine = msg.user.id === session?.user?.id
                const showAvatar = i === 0 || messages[i - 1].user.id !== msg.user.id
                return (
                  <div key={msg.id} className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : ''}`}>
                    {!isMine && (
                      <div className="w-8 h-8 shrink-0 flex items-center justify-center text-lg">
                        {showAvatar ? (msg.user.avatar || '😊') : ''}
                      </div>
                    )}
                    <div className={`max-w-[70%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
                      {!isMine && showAvatar && (
                        <span className="text-xs text-gray-400 mb-1 ml-1">{msg.user.nickname}</span>
                      )}
                      <div className={`px-3 py-2 rounded-2xl text-sm break-words ${
                        isMine
                          ? 'bg-blue-600 text-white rounded-br-sm'
                          : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
                      }`}>
                        {msg.content}
                      </div>
                      <span className="text-[10px] text-gray-300 mt-0.5 px-1">
                        {new Date(msg.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* 输入框 */}
            <div className="px-4 py-3 bg-white border-t border-gray-100">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="输入消息..."
                  className="flex-1 px-4 py-2.5 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || sending}
                  className="p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center text-gray-400 flex-col gap-3">
            <Hash className="w-12 h-12 text-gray-200" />
            <p className="text-sm">选择一个聊天室开始聊天</p>
          </div>
        )}
      </div>

      {/* 创建房间弹窗 */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">创建聊天室</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                value={newRoomName}
                onChange={e => setNewRoomName(e.target.value)}
                placeholder="聊天室名称，如「TSLA讨论组」"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
              <input
                type="text"
                value={newRoomDesc}
                onChange={e => setNewRoomDesc(e.target.value)}
                placeholder="简介（可选）"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <button
              onClick={createRoom}
              disabled={!newRoomName.trim() || creating}
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {creating ? '创建中...' : '创建'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
