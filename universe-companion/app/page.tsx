'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useEffect, useRef, useState } from 'react'
import { MessageResponse } from '@/components/ai-elements/message'

// Stable session ID — generated once per browser session, persisted in localStorage
function getOrCreateSessionId(): string {
  const key = 'universe-companion-session'
  const existing = localStorage.getItem(key)
  if (existing) return existing
  const id = `s_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  localStorage.setItem(key, id)
  return id
}

// Suggested starter questions players commonly ask
const SUGGESTIONS = [
  'Why did my fire go out inside the cave?',
  'How does food spoil faster in hot weather?',
  'Why is iron stronger than copper?',
  'What happens to my body at high altitude?',
  'How do wound infections spread?',
  'Why does smelting need charcoal, not just wood?',
]

const RUST_ORANGE = '#cd4420'

// ── M13: Velar First-Contact Banner ──────────────────────────────────────────
// Polls /api/velar-status every 15s. Shows a persistent banner when decoded.
// The endpoint reads the discoveries table and returns { decoded: bool, decoderName }.

interface VelarStatus {
  decoded:     boolean
  decoderName: string | null
}

function useVelarStatus(): VelarStatus {
  const [status, setStatus] = useState<VelarStatus>({ decoded: false, decoderName: null })

  useEffect(() => {
    let cancelled = false

    async function poll() {
      try {
        const res = await fetch('/api/velar-status')
        if (res.ok) {
          const data = await res.json() as VelarStatus
          if (!cancelled) setStatus(data)
        }
      } catch {
        // Fail silently — banner just won't show if API is unavailable
      }
    }

    poll()
    const id = setInterval(poll, 15_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  return status
}

function FirstContactBanner({ decoderName }: { decoderName: string }) {
  const [visible, setVisible] = useState(true)
  if (!visible) return null

  return (
    <div style={{
      background:    'linear-gradient(90deg, rgba(0,30,30,0.95) 0%, rgba(0,20,40,0.95) 100%)',
      borderBottom:  '1px solid rgba(0,229,204,0.4)',
      padding:       '10px 20px',
      display:       'flex',
      alignItems:    'center',
      gap:           12,
      flexShrink:    0,
      position:      'relative',
    }}>
      {/* Pulsing indicator */}
      <div style={{
        width:        '8px',
        height:       '8px',
        borderRadius: '50%',
        background:   '#00e5cc',
        boxShadow:    '0 0 10px #00e5cc',
        flexShrink:   0,
        animation:    'pulse-teal 1.4s ease-in-out infinite',
      }} />
      <div style={{ flex: 1 }}>
        <span style={{
          fontFamily:    '"Courier New", monospace',
          fontSize:      '11px',
          color:         '#00e5cc',
          letterSpacing: '0.1em',
        }}>
          FIRST CONTACT ESTABLISHED
        </span>
        <span style={{
          fontFamily: '"Courier New", monospace',
          fontSize:   '10px',
          color:      'rgba(0,229,204,0.55)',
          marginLeft: '10px',
        }}>
          {decoderName} decoded the Velar signal — the universe is not empty
        </span>
      </div>
      <button
        onClick={() => setVisible(false)}
        aria-label="Dismiss"
        style={{
          background:  'none',
          border:      'none',
          color:       'rgba(0,229,204,0.4)',
          cursor:      'pointer',
          fontSize:    '14px',
          lineHeight:  1,
          padding:     '2px 4px',
          flexShrink:  0,
        }}
      >
        x
      </button>
      <style>{`
        @keyframes pulse-teal {
          0%, 100% { opacity: 1; box-shadow: 0 0 10px #00e5cc; }
          50%       { opacity: 0.4; box-shadow: 0 0 4px #00e5cc; }
        }
      `}</style>
    </div>
  )
}

export default function CompanionPage() {
  const [sessionId, setSessionId] = useState<string>('')
  const velarStatus = useVelarStatus()
  const [inputText, setInputText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Initialise session ID client-side only (localStorage not available on server)
  useEffect(() => {
    setSessionId(getOrCreateSessionId())
  }, [])

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: { sessionId },
    }),
  })

  const isStreaming = status === 'streaming' || status === 'submitted'

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStreaming])

  function handleSend() {
    const text = inputText.trim()
    if (!text || isStreaming) return
    sendMessage({ text })
    setInputText('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleSuggestion(text: string) {
    if (isStreaming) return
    sendMessage({ text })
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: '#0a0a0a',
      color: '#e8e8e8',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    }}>

      {/* M13: First Contact Banner — shown when VELAR_DECODED fires in the simulation */}
      {velarStatus.decoded && velarStatus.decoderName && (
        <FirstContactBanner decoderName={velarStatus.decoderName} />
      )}

      {/* Header */}
      <header style={{
        borderBottom: '1px solid rgba(205,68,32,0.25)',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexShrink: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 4,
          background: `linear-gradient(135deg, ${RUST_ORANGE} 0%, #7a2910 100%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0,
        }}>
          S
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: 1 }}>
            SCIENCE COMPANION
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: 2, marginTop: 1 }}>
            UNIVERSE SIMULATION — REAL-WORLD PHYSICS ENGINE
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          <a href="/universe-map" style={{
            fontSize: 9, color: 'rgba(0,232,208,0.55)', letterSpacing: 1,
            textDecoration: 'none', borderBottom: '1px solid rgba(0,232,208,0.2)',
            paddingBottom: 1, transition: 'color 0.15s',
          }}>
            UNIVERSE MAP
          </a>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: isStreaming ? '#f1c40f' : '#2ecc71',
              boxShadow: isStreaming ? '0 0 6px #f1c40f' : '0 0 6px #2ecc71',
              transition: 'all 0.3s',
            }} />
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1 }}>
              {isStreaming ? 'THINKING' : 'READY'}
            </span>
          </div>
        </div>
      </header>

      {/* Message list */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}>

        {/* Empty state with suggestions */}
        {messages.length === 0 && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            gap: 24,
            padding: '40px 20px',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: 11,
                color: RUST_ORANGE,
                letterSpacing: 3,
                textTransform: 'uppercase',
                marginBottom: 8,
              }}>
                Ask anything about the science
              </div>
              <div style={{
                fontSize: 13,
                color: 'rgba(255,255,255,0.4)',
                maxWidth: 440,
                lineHeight: 1.6,
              }}>
                This companion explains the real physics, chemistry, and biology
                behind how the world works. Ask why your fire went out, how
                infections spread, or why iron beats copper.
              </div>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 8,
              width: '100%',
              maxWidth: 600,
            }}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSuggestion(s)}
                  style={{
                    background: 'rgba(205,68,32,0.06)',
                    border: '1px solid rgba(205,68,32,0.2)',
                    borderRadius: 4,
                    padding: '8px 12px',
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: 11,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    textAlign: 'left',
                    lineHeight: 1.4,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(205,68,32,0.14)'
                    e.currentTarget.style.color = '#fff'
                    e.currentTarget.style.borderColor = 'rgba(205,68,32,0.4)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(205,68,32,0.06)'
                    e.currentTarget.style.color = 'rgba(255,255,255,0.6)'
                    e.currentTarget.style.borderColor = 'rgba(205,68,32,0.2)'
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Conversation messages */}
        {messages.map((message, idx) => {
          const isUser = message.role === 'user'
          const isLastAssistant = !isUser && idx === messages.length - 1

          // Extract text content from UIMessage parts
          const textContent = message.parts
            ?.filter((p) => p.type === 'text')
            .map((p) => (p as { type: 'text'; text: string }).text)
            .join('') ?? ''

          return (
            <div
              key={message.id}
              className="msg-enter"
              style={{
                display: 'flex',
                justifyContent: isUser ? 'flex-end' : 'flex-start',
              }}
            >
              <div style={{ maxWidth: isUser ? '70%' : '85%', minWidth: 80 }}>
                {/* Role label */}
                <div style={{
                  fontSize: 9,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  marginBottom: 5,
                  color: isUser ? 'rgba(205,68,32,0.7)' : 'rgba(255,255,255,0.25)',
                  textAlign: isUser ? 'right' : 'left',
                }}>
                  {isUser ? 'YOU' : 'SCIENCE COMPANION'}
                </div>

                {/* Bubble */}
                <div style={{
                  background: isUser
                    ? 'rgba(205,68,32,0.12)'
                    : 'rgba(255,255,255,0.04)',
                  border: isUser
                    ? '1px solid rgba(205,68,32,0.3)'
                    : '1px solid rgba(255,255,255,0.07)',
                  borderRadius: isUser
                    ? '12px 12px 3px 12px'
                    : '12px 12px 12px 3px',
                  padding: '10px 14px',
                }}>
                  {isUser ? (
                    <span style={{ fontSize: 13, lineHeight: 1.55, color: '#e8e8e8' }}>
                      {textContent}
                    </span>
                  ) : (
                    // AI Elements MessageResponse — handles streaming markdown safely
                    <MessageResponse streaming={isLastAssistant && isStreaming}>
                      {textContent}
                    </MessageResponse>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {/* Thinking dots — shown while waiting for first token */}
        {isStreaming && (messages.length === 0 || messages[messages.length - 1]?.role === 'user') && (
          <div className="msg-enter" style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '12px 12px 12px 3px',
              padding: '10px 18px',
              display: 'flex',
              gap: 5,
              alignItems: 'center',
            }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: RUST_ORANGE,
                  opacity: 0.6,
                  animation: `blink 1.2s ease-in-out ${i * 0.2}s infinite`,
                }} />
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '12px 16px 16px',
        flexShrink: 0,
        background: 'rgba(0,0,0,0.5)',
      }}>
        <div style={{
          display: 'flex',
          gap: 10,
          alignItems: 'flex-end',
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${isStreaming ? 'rgba(205,68,32,0.3)' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: 6,
          padding: '8px 10px',
          transition: 'border-color 0.2s',
        }}>
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about the science behind the world... (Enter to send)"
            disabled={isStreaming}
            rows={1}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: isStreaming ? 'rgba(255,255,255,0.35)' : '#e8e8e8',
              fontSize: 13,
              fontFamily: 'inherit',
              resize: 'none',
              lineHeight: 1.55,
              maxHeight: 120,
              overflowY: 'auto',
              cursor: isStreaming ? 'not-allowed' : 'text',
            }}
            onInput={(e) => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = `${Math.min(el.scrollHeight, 120)}px`
            }}
          />
          <button
            onClick={handleSend}
            disabled={isStreaming || !inputText.trim()}
            style={{
              background: isStreaming || !inputText.trim()
                ? 'rgba(205,68,32,0.15)'
                : RUST_ORANGE,
              border: 'none',
              borderRadius: 4,
              width: 34,
              height: 34,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isStreaming || !inputText.trim() ? 'not-allowed' : 'pointer',
              flexShrink: 0,
              transition: 'background 0.15s',
              color: isStreaming || !inputText.trim()
                ? 'rgba(255,255,255,0.25)'
                : '#fff',
            }}
            title="Send (Enter)"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M1 7h12M7 1l6 6-6 6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        <div style={{
          fontSize: 9,
          color: 'rgba(255,255,255,0.18)',
          textAlign: 'center',
          marginTop: 8,
          letterSpacing: 1,
        }}>
          EXPLAINS REAL PHYSICS, CHEMISTRY, AND BIOLOGY ONLY
        </div>
      </div>

    </div>
  )
}
