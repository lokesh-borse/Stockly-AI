import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'

async function streamChatReply(messages, onToken) {
  const baseUrl = import.meta.env.VITE_API_BASE_URL
  const access = localStorage.getItem('access')
  const headers = { 'Content-Type': 'application/json' }
  if (access) headers.Authorization = `Bearer ${access}`

  const response = await fetch(`${baseUrl}chat/`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ messages }),
  })

  if (!response.ok) {
    let detail = 'Unable to reach assistant right now.'
    try {
      const data = await response.json()
      if (data?.detail) detail = data.detail
    } catch (_) {
      // keep fallback message
    }
    throw new Error(detail)
  }

  if (!response.body) throw new Error('Streaming is not supported in this browser.')

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let emittedChars = 0

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let separatorIndex = buffer.indexOf('\n\n')

    while (separatorIndex !== -1) {
      const eventText = buffer.slice(0, separatorIndex)
      buffer = buffer.slice(separatorIndex + 2)

      const lines = eventText.split('\n')
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const payload = line.slice(6).trim()
        if (payload === '[DONE]') return emittedChars
        try {
          const parsed = JSON.parse(payload)
          if (parsed?.text) {
            emittedChars += parsed.text.length
            onToken(parsed.text)
          }
        } catch (_) {
          // ignore malformed chunk
        }
      }
      separatorIndex = buffer.indexOf('\n\n')
    }
  }

  return emittedChars
}

function renderMarkdown(text) {
  const lines = text.split('\n')
  const elements = []
  let key = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) {
      elements.push(<div key={key++} style={{ height: 6 }} />)
      continue
    }
    if (line.startsWith('**') && line.endsWith('**') && line.length > 4) {
      elements.push(
        <p key={key++} style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 12, margin: '4px 0' }}>
          {line.slice(2, -2)}
        </p>
      )
      continue
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const content = line.slice(2)
      elements.push(
        <div key={key++} style={{ display: 'flex', gap: 6, fontSize: 12, color: '#cbd5e1', margin: '2px 0' }}>
          <span style={{ color: '#38bdf8', flexShrink: 0 }}>.</span>
          <span
            dangerouslySetInnerHTML={{
              __html: content.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#e2e8f0">$1</strong>'),
            }}
          />
        </div>
      )
      continue
    }

    elements.push(
      <p
        key={key++}
        style={{ fontSize: 12, color: '#cbd5e1', margin: '2px 0', lineHeight: 1.6 }}
        dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#e2e8f0">$1</strong>') }}
      />
    )
  }

  return elements
}

function TypingDots() {
  return (
    <div
      style={{
        display: 'flex',
        gap: 4,
        alignItems: 'center',
        padding: '8px 12px',
        background: '#151C26',
        border: '1px solid #1E2530',
        borderRadius: 12,
        borderBottomLeftRadius: 4,
        width: 'fit-content',
      }}
    >
      {[0, 1, 2].map(i => (
        <span
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#38bdf8',
            animation: `chat-blink-dot 1.4s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
  )
}

function ChatbotLogo() {
  return (
    <svg viewBox="0 0 64 64" className="w-7 h-7" fill="none" aria-hidden="true">
      <path d="M30 8h4v8h-4z" fill="currentColor" />
      <circle cx="32" cy="6" r="4" fill="currentColor" />
      <path d="M12 22c0-6.6 5.4-12 12-12h16c8.8 0 16 7.2 16 16 0 4.5-1.9 8.6-4.9 11.5L40 48v-8H24c-6.6 0-12-5.4-12-12v-6z" fill="currentColor" />
      <circle cx="25" cy="26" r="4.5" fill="#070B14" />
      <circle cx="39" cy="26" r="4.5" fill="#070B14" />
    </svg>
  )
}

function getDockClass(pathname, open) {
  if (!open) {
    if (pathname.startsWith('/portfolio/') || pathname.startsWith('/stocks/')) return 'bottom-24'
    return 'bottom-6'
  }
  if (pathname.startsWith('/portfolio/') || pathname.startsWith('/stocks/')) return 'bottom-8'
  return 'bottom-6'
}

export default function GlobalChatbot() {
  const { pathname } = useLocation()
  const { isAuthenticated } = useAuth()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Hi, I am Stockly Assistant. Ask me anything about stocks, SIPs, mutual funds, and portfolio strategy.',
    },
  ])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open, typing])

  const dockClass = useMemo(() => getDockClass(pathname, open), [pathname, open])

  async function sendMessage(text) {
    const trimmed = text.trim()
    if (!trimmed || typing) return

    const nextMessages = [...messages, { role: 'user', text: trimmed }]
    setInput('')
    setTyping(true)
    setError('')

    let replyIndex = -1
    setMessages(prev => {
      replyIndex = prev.length + 1
      return [...prev, { role: 'user', text: trimmed }, { role: 'assistant', text: '' }]
    })

    const conversation = nextMessages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.text }))

    try {
      const emittedChars = await streamChatReply(conversation, token => {
        setMessages(prev => prev.map((m, i) => (i === replyIndex ? { ...m, text: `${m.text}${token}` } : m)))
      })
      if (emittedChars === 0) {
        setMessages(prev =>
          prev.map((m, i) =>
            i === replyIndex
              ? { ...m, text: 'I could not generate a response right now. Please try again.', isError: true }
              : m
          )
        )
      }
    } catch (err) {
      const friendly = err?.message || 'Something went wrong while contacting the assistant.'
      setError(friendly)
      setMessages(prev => prev.map((m, i) => (i === replyIndex ? { ...m, text: friendly, isError: true } : m)))
    } finally {
      setTyping(false)
    }
  }

  const statusLabel = isAuthenticated
    ? 'Personalized mode - connected to your portfolio'
    : 'Guest mode - log in for personalized insights'

  return (
    <>
      <style>{`
        @keyframes chat-blink-dot {
          0%,100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
        @keyframes chat-pop-in {
          from { opacity: 0; transform: translateY(18px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      <div className={`fixed right-6 ${dockClass} z-[120] flex flex-col items-end transition-all duration-200`}>
        {open && (
          <div
            className="mb-4 flex max-h-[72vh] w-[calc(100vw-2rem)] max-w-[390px] flex-col overflow-hidden rounded-2xl border chat-shell"
            style={{
              background: '#0D1117',
              borderColor: '#1E2530',
              boxShadow: '0 28px 80px rgba(0,0,0,0.75), 0 0 0 1px rgba(14,165,233,0.15)',
              animation: 'chat-pop-in 0.22s ease-out both',
            }}
          >
            <div
              className="flex items-center gap-3 border-b px-4 py-3"
              style={{
                borderColor: '#1E2530',
                background: 'linear-gradient(135deg, rgba(3,105,161,0.9), rgba(14,165,233,0.92))',
              }}
            >
              <div className="h-9 w-9 rounded-xl border border-white/25 bg-white/15 text-white flex items-center justify-center">
                <ChatbotLogo />
              </div>
              <div>
                <div className="text-sm font-bold text-white tracking-tight">Stockly Assistant</div>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-white/80">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-300" style={{ animation: 'chat-blink-dot 1.2s ease-in-out infinite' }} />
                  {statusLabel}
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="ml-auto rounded-md px-2 py-1 text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close chatbot"
              >
                x
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-3" style={{ background: '#080C12' }}>
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[90%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                      m.role === 'user' ? 'rounded-br-sm' : 'rounded-bl-sm'
                    }`}
                    style={
                      m.role === 'user'
                        ? { background: 'linear-gradient(135deg,#075985,#0EA5E9)', color: '#fff' }
                        : m.isError
                        ? { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.35)' }
                        : { background: '#151C26', border: '1px solid #1E2530' }
                    }
                  >
                    {m.role === 'user' ? <span>{m.text}</span> : <div>{renderMarkdown(m.text)}</div>}
                  </div>
                </div>
              ))}

              {typing && (
                <div className="flex justify-start">
                  <TypingDots />
                </div>
              )}
              {error && <div className="text-xs text-red-400">{error}</div>}
              <div ref={bottomRef} />
            </div>

            <div className="flex items-center gap-2 border-t px-3 py-2.5" style={{ borderColor: '#1E2530', background: '#0D1117' }}>
              <input
                className="flex-1 rounded-xl border px-3 py-2 text-xs text-neutral-200 outline-none transition-colors"
                style={{ background: '#151C26', borderColor: '#1E2530' }}
                placeholder="Ask about stocks, risk, funds..."
                value={input}
                disabled={typing}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendMessage(input)
                  }
                }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={typing}
                className="h-9 w-9 rounded-xl text-white transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#0369a1,#0EA5E9)' }}
                aria-label="Send message"
              >
                {'>'}
              </button>
            </div>
          </div>
        )}

        <button
          onClick={() => setOpen(v => !v)}
          className="group relative flex h-14 w-14 items-center justify-center rounded-2xl border text-white transition-transform hover:scale-105 active:scale-95"
          style={{
            borderColor: 'rgba(14,165,233,0.35)',
            background: 'linear-gradient(135deg,#075985,#0EA5E9)',
            boxShadow: '0 10px 28px rgba(14,165,233,0.35)',
          }}
          aria-label={open ? 'Close chatbot' : 'Open chatbot'}
        >
          {open ? (
            <span className="text-lg font-semibold leading-none">x</span>
          ) : (
            <>
              <span className="absolute inset-0 rounded-2xl border border-white/10 group-hover:border-white/25" />
              <span className="text-white">
                <ChatbotLogo />
              </span>
            </>
          )}
        </button>
      </div>
    </>
  )
}
