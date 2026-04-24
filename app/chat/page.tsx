'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import * as Ably from 'ably'
import {
  Send, Plus, X, Hash, Users, ArrowLeft,
  UserPlus, Check, Search, MessageCircle, Bell,
} from 'lucide-react'
import IndexBar from '@/components/market/IndexBar'
import { useMarket } from '@/hooks/useMarket'

/* ─── 类型 ─── */
interface Room {
  id: string; name: string; description?: string | null
  _count: { members: number }
  messages: Array<{ content: string; user: { nickname: string } }>
}
interface RoomMessage {
  id: string; content: string; createdAt: string
  user: { id: string; nickname: string; avatar: string | null }
}
interface Friend { id: string; nickname: string; avatar: string | null }
interface PendingReq { id: string; requester: Friend }
interface DM {
  id: string; content: string; createdAt: string
  sender: { id: string; nickname: string; avatar: string | null }
}
interface UserResult { id: string; nickname: string; avatar: string | null; email: string }

type Tab = 'rooms' | 'friends'
type View =
  | { type: 'none' }
  | { type: 'room'; room: Room }
  | { type: 'dm'; friend: Friend }

/* ─── 主组件 ─── */
export default function ChatPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { indices, indicesLoading, refreshIndices } = useMarket()

  /* tabs & view */
  const [tab, setTab] = useState<Tab>('rooms')
  const [view, setView] = useState<View>({ type: 'none' })

  /* 聊天室 */
  const [rooms, setRooms] = useState<Room[]>([])
  const [roomMessages, setRoomMessages] = useState<RoomMessage[]>([])
  const [showCreateRoom, setShowCreateRoom] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [newRoomDesc, setNewRoomDesc] = useState('')
  const [creating, setCreating] = useState(false)

  /* 好友 */
  const [friends, setFriends] = useState<Friend[]>([])
  const [pending, setPending] = useState<PendingReq[]>([])
  const [dmMessages, setDmMessages] = useState<DM[]>([])
  const [showAddFriend, setShowAddFriend] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState<UserResult[]>([])
  const [searching, setSearching] = useState(false)
  const [sendingReq, setSendingReq] = useState<string | null>(null) // 正在发送请求的 userId
  const [sentReqs, setSentReqs] = useState<Set<string>>(new Set()) // 已发送请求的 userId

  /* 公共 */
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const ablyRef = useRef<Ably.Realtime | null>(null)
  const channelRef = useRef<Ably.RealtimeChannel | null>(null)

  /* 未登录跳转 */
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  /* 初始化 Ably */
  useEffect(() => {
    if (!session) return
    const ably = new Ably.Realtime({ authUrl: '/api/chat/token', authMethod: 'GET' })
    ablyRef.current = ably

    // 监听好友请求通知
    const userCh = ably.channels.get(`user:${session.user.id}`)
    userCh.subscribe('friend-request', () => loadFriends())

    return () => { ably.close() }
  }, [session])

  /* 加载房间 */
  const loadRooms = useCallback(async () => {
    const res = await fetch('/api/chat/rooms')
    if (res.ok) setRooms(await res.json())
  }, [])

  /* 加载好友 */
  const loadFriends = useCallback(async () => {
    const res = await fetch('/api/friends')
    if (res.ok) {
      const data = await res.json()
      setFriends(data.friends)
      setPending(data.pending)
    }
  }, [])

  useEffect(() => { loadRooms(); loadFriends() }, [loadRooms, loadFriends])

  /* 切换聊天室 */
  useEffect(() => {
    if (view.type !== 'room') return
    if (channelRef.current) { channelRef.current.unsubscribe(); channelRef.current.detach() }

    fetch(`/api/chat/rooms/${view.room.id}/messages`).then(r => r.json()).then(setRoomMessages)

    if (!ablyRef.current) return
    const ch = ablyRef.current.channels.get(`room:${view.room.id}`)
    channelRef.current = ch
    ch.subscribe('message', (msg) => {
      const m = msg.data as RoomMessage
      setRoomMessages(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m])
    })
    return () => { ch.unsubscribe() }
  }, [view])

  /* 切换私信 */
  useEffect(() => {
    if (view.type !== 'dm') return
    if (channelRef.current) { channelRef.current.unsubscribe(); channelRef.current.detach() }

    fetch(`/api/dm/${view.friend.id}`).then(r => r.json()).then(setDmMessages)

    if (!ablyRef.current || !session?.user?.id) return
    const dmKey = [session.user.id, view.friend.id].sort().join('-')
    const ch = ablyRef.current.channels.get(`dm:${dmKey}`)
    channelRef.current = ch
    ch.subscribe('message', (msg) => {
      const m = msg.data as DM
      setDmMessages(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m])
    })
    return () => { ch.unsubscribe() }
  }, [view, session])

  /* 自动滚到底部 */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [roomMessages, dmMessages])

  /* 发送消息 */
  const sendMessage = async () => {
    if (!input.trim() || sending) return
    const content = input.trim()
    setInput('')
    setSending(true)
    try {
      if (view.type === 'room') {
        const res = await fetch(`/api/chat/rooms/${view.room.id}/messages`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        })
        if (res.ok) {
          const msg = await res.json()
          setRoomMessages(prev => prev.some(x => x.id === msg.id) ? prev : [...prev, msg])
        }
      } else if (view.type === 'dm') {
        const res = await fetch(`/api/dm/${view.friend.id}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        })
        if (res.ok) {
          const msg = await res.json()
          setDmMessages(prev => prev.some(x => x.id === msg.id) ? prev : [...prev, msg])
        }
      }
    } finally { setSending(false) }
  }

  /* 创建聊天室 */
  const createRoom = async () => {
    if (!newRoomName.trim()) return
    setCreating(true)
    const res = await fetch('/api/chat/rooms', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newRoomName.trim(), description: newRoomDesc.trim() }),
    })
    setCreating(false)
    if (res.ok) { setShowCreateRoom(false); setNewRoomName(''); setNewRoomDesc(''); await loadRooms() }
  }

  /* 搜索用户 */
  useEffect(() => {
    if (!searchQ.trim()) { setSearchResults([]); return }
    const timer = setTimeout(async () => {
      setSearching(true)
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQ)}`)
      if (res.ok) setSearchResults(await res.json())
      setSearching(false)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQ])

  /* 发送好友请求 */
  const sendFriendRequest = async (receiverId: string) => {
    setSendingReq(receiverId)
    try {
      const res = await fetch('/api/friends', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId }),
      })
      const data = await res.json()
      if (res.ok) {
        setSentReqs(prev => new Set([...Array.from(prev), receiverId]))
      } else {
        alert(data.error || '发送失败，请重试')
      }
    } catch {
      alert('网络错误，请重试')
    } finally {
      setSendingReq(null)
    }
  }

  /* 接受好友请求 */
  const acceptFriend = async (id: string) => {
    await fetch(`/api/friends/${id}`, { method: 'POST' })
    loadFriends()
  }

  /* 进入聊天视图 */
  const isInChat = view.type !== 'none'
  const myId = session?.user?.id ?? ''

  if (status === 'loading') {
    return <div className="flex-1 flex items-center justify-center text-gray-400">加载中...</div>
  }

  /* ─── 消息列表渲染 ─── */
  const messages = view.type === 'room' ? roomMessages : dmMessages
  const renderMessages = () => (messages as Array<RoomMessage | DM>).map((msg, i) => {
    const sender = 'user' in msg ? msg.user : msg.sender
    const isMine = sender.id === myId
    const prevMsg = messages[i - 1] as RoomMessage | DM | undefined
    const showName = !isMine && (i === 0 || ('user' in prevMsg! ? prevMsg.user.id : prevMsg!.sender.id) !== sender.id)
    const id = 'id' in msg ? msg.id : ''
    return (
      <div key={id} className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : ''}`}>
        {!isMine && (
          <div className="w-8 h-8 shrink-0 flex items-center justify-center text-lg self-start mt-4">
            {showName ? (sender.avatar || '😊') : ''}
          </div>
        )}
        <div className={`max-w-[72%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
          {showName && <span className="text-xs text-gray-400 mb-1 ml-1">{sender.nickname}</span>}
          <div className={`px-3 py-2 rounded-2xl text-sm break-words leading-relaxed ${
            isMine ? 'bg-blue-500 text-white rounded-br-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm shadow-sm'
          }`}>
            {msg.content}
          </div>
          <span className="text-[10px] text-gray-300 mt-0.5 px-1">
            {new Date(msg.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    )
  })

  return (
    <>
      {/* 整个页面：固定在视口，不参与外层滚动 */}
      <div className="fixed inset-0 md:relative md:inset-auto flex flex-col h-[100dvh] md:h-full bg-gray-50"
        style={{ paddingTop: 'env(safe-area-inset-top)', top: 0, left: 0, right: 0, bottom: 0 }}
      >
        <IndexBar indices={indices} loading={indicesLoading} onRefresh={refreshIndices} />

        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* ── 左栏：列表 ── */}
          <div className={`${isInChat ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-72 bg-white border-r border-gray-100`}>

            {/* tab 切换 */}
            <div className="flex border-b border-gray-100 shrink-0">
              {([['rooms', '聊天室', Hash], ['friends', '好友', Users]] as const).map(([t, label, Icon]) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium border-b-2 transition-colors ${
                    tab === t ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                  {t === 'friends' && pending.length > 0 && (
                    <span className="w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">{pending.length}</span>
                  )}
                </button>
              ))}
            </div>

            {/* tab 内容 */}
            <div className="flex-1 overflow-y-auto">
              {tab === 'rooms' ? (
                <>
                  {/* 新建聊天室按钮 */}
                  <button onClick={() => setShowCreateRoom(true)}
                    className="w-full flex items-center gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors text-blue-600"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                      <Plus className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium">创建聊天室</span>
                  </button>
                  {rooms.length === 0 ? (
                    <div className="p-6 text-center text-sm text-gray-400">暂无聊天室</div>
                  ) : rooms.map(room => (
                    <button key={room.id} onClick={() => setView({ type: 'room', room })}
                      className={`w-full flex items-center gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors text-left ${
                        view.type === 'room' && view.room.id === room.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                        <Hash className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-gray-800 truncate">{room.name}</div>
                        {room.messages[0] && (
                          <div className="text-xs text-gray-400 truncate mt-0.5">
                            {room.messages[0].user.nickname}: {room.messages[0].content}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-300 shrink-0 flex items-center gap-0.5">
                        <Users className="w-3 h-3" />{room._count.members}
                      </div>
                    </button>
                  ))}
                </>
              ) : (
                <>
                  {/* 添加好友按钮 */}
                  <button onClick={() => setShowAddFriend(true)}
                    className="w-full flex items-center gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors text-blue-600"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                      <UserPlus className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium">添加好友</span>
                  </button>

                  {/* 待处理的好友请求 */}
                  {pending.map(req => (
                    <div key={req.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 bg-yellow-50">
                      <div className="text-2xl shrink-0">{req.requester.avatar || '😊'}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800">{req.requester.nickname}</div>
                        <div className="text-xs text-gray-400">申请添加你为好友</div>
                      </div>
                      <button onClick={() => acceptFriend(req.id)}
                        className="p-1.5 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {/* 好友列表 */}
                  {friends.length === 0 && pending.length === 0 ? (
                    <div className="p-6 text-center text-sm text-gray-400">
                      <Users className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                      还没有好友，点上方添加
                    </div>
                  ) : friends.map(f => (
                    <button key={f.id} onClick={() => setView({ type: 'dm', friend: f })}
                      className={`w-full flex items-center gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors text-left ${
                        view.type === 'dm' && view.friend.id === f.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="text-2xl shrink-0 w-10 h-10 flex items-center justify-center">{f.avatar || '😊'}</div>
                      <div className="font-medium text-gray-800 truncate">{f.nickname}</div>
                    </button>
                  ))}
                </>
              )}
            </div>

            {/* 当前用户 */}
            <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-2 shrink-0"
              style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
            >
              <span className="text-xl">{(session?.user as { avatar?: string })?.avatar || '😊'}</span>
              <span className="text-sm font-medium text-gray-700 truncate">{session?.user?.name}</span>
            </div>
          </div>

          {/* ── 右栏：对话区 ── */}
          {isInChat ? (
            <div className="flex flex-col flex-1 min-w-0 min-h-0">
              {/* 顶部栏 */}
              <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 shrink-0">
                <button onClick={() => setView({ type: 'none' })}
                  className="md:hidden p-1 rounded-lg hover:bg-gray-100 text-gray-500"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="text-xl shrink-0">
                  {view.type === 'room' ? <Hash className="w-5 h-5 text-indigo-500" /> : (view.type === 'dm' ? view.friend.avatar || '😊' : '')}
                </div>
                <div className="font-semibold text-gray-800 truncate">
                  {view.type === 'room' ? view.room.name : view.type === 'dm' ? view.friend.nickname : ''}
                </div>
                {view.type === 'room' && (
                  <div className="ml-auto flex items-center gap-1 text-xs text-gray-400 shrink-0">
                    <Users className="w-3.5 h-3.5" />{view.room._count.members}
                  </div>
                )}
              </div>

              {/* 消息列表 */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-gray-50"
                style={{ paddingBottom: '0.75rem' }}
              >
                {messages.length === 0 && (
                  <div className="text-center text-gray-400 text-sm py-10">
                    {view.type === 'dm' ? `和 ${view.friend.nickname} 打个招呼吧 👋` : '还没有消息，发送第一条吧 👋'}
                  </div>
                )}
                {renderMessages()}
                <div ref={messagesEndRef} />
              </div>

              {/* 输入框 — 固定在页面底部，不被键盘挤走 */}
              <div className="shrink-0 bg-white border-t border-gray-100 px-3 py-2"
                style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom) + 4rem)', }}
              >
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    placeholder="输入消息..."
                    className="flex-1 px-4 py-2.5 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button onClick={sendMessage} disabled={!input.trim() || sending}
                    className="p-2.5 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-40 transition-colors shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="hidden md:flex flex-1 items-center justify-center flex-col gap-3 text-gray-300">
              <MessageCircle className="w-14 h-14" />
              <p className="text-sm">选择好友或聊天室开始聊天</p>
            </div>
          )}
        </div>
      </div>

      {/* 创建聊天室弹窗 */}
      {showCreateRoom && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowCreateRoom(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">创建聊天室</h3>
              <button onClick={() => setShowCreateRoom(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <input type="text" value={newRoomName} onChange={e => setNewRoomName(e.target.value)}
              placeholder="聊天室名称，如「TSLA讨论组」"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <input type="text" value={newRoomDesc} onChange={e => setNewRoomDesc(e.target.value)}
              placeholder="简介（可选）"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button onClick={createRoom} disabled={!newRoomName.trim() || creating}
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {creating ? '创建中...' : '创建'}
            </button>
          </div>
        </div>
      )}

      {/* 添加好友弹窗 */}
      {showAddFriend && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowAddFriend(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">添加好友</h3>
              <button onClick={() => setShowAddFriend(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)}
                placeholder="搜索昵称或邮箱"
                className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                autoFocus
              />
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {searching && <div className="text-center text-sm text-gray-400 py-2">搜索中...</div>}
              {!searching && searchQ && searchResults.length === 0 && (
                <div className="text-center text-sm text-gray-400 py-2">未找到用户</div>
              )}
              {searchResults.map(u => {
                const isFriend = friends.some(f => f.id === u.id)
                const hasPending = pending.some(p => p.requester.id === u.id)
                const hasSent = sentReqs.has(u.id)
                const isSending = sendingReq === u.id
                return (
                  <div key={u.id} className="flex items-center gap-3 py-2">
                    <div className="text-2xl">{u.avatar || '😊'}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-800 truncate">{u.nickname}</div>
                      <div className="text-xs text-gray-400 truncate">{u.email}</div>
                    </div>
                    {isFriend ? (
                      <span className="text-xs text-green-600 font-medium">已是好友</span>
                    ) : hasPending ? (
                      <span className="text-xs text-yellow-600 font-medium">待验证</span>
                    ) : hasSent ? (
                      <span className="text-xs text-blue-500 font-medium">✓ 已发送</span>
                    ) : (
                      <button
                        onClick={() => sendFriendRequest(u.id)}
                        disabled={isSending}
                        className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {isSending ? '发送中...' : '添加'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
