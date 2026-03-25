'use client'

// app/universes/page.tsx
// M15: Universe Map — shows all registered universe instances.
// Polls /api/universes every 30s. Visualizes each universe as a node
// on an SVG starfield with connections showing the gateway hierarchy.

import { useEffect, useRef, useState, useMemo } from 'react'
import Link from 'next/link'

interface UniverseRow {
  seed:            number
  name:            string
  origin:          string | null
  created_at:      string
  player_count:    number
  tech_level:      number
  discovery_count: number
}

const TECH_LABELS: Record<number, string> = {
  0: 'Stone Age',
  1: 'Bronze Age',
  2: 'Iron Age',
  3: 'Medieval',
  4: 'Industrial',
  5: 'Atomic',
  6: 'Space Age',
  7: 'Interplanetary',
  8: 'Interstellar',
}

const ORIGIN_LABELS: Record<string, string> = {
  genesis:       'Genesis Universe',
  velar_gateway: 'Velar Gateway',
  player_fork:   'Player Fork',
}

// Deterministic positions for up to 12 universes around a central orbit
function nodePosition(i: number, total: number, cx: number, cy: number): [number, number] {
  if (i === 0) return [cx, cy]  // home universe always at center
  const angle  = ((i - 1) / Math.max(1, total - 1)) * Math.PI * 2 - Math.PI / 2
  const radius = 140 + (i % 2) * 30
  return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius]
}

function hexSeed(seed: number): string {
  return '0x' + (seed >>> 0).toString(16).toUpperCase().padStart(8, '0')
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch { return iso }
}

const TEAL    = '#00e8d0'
const RUST    = '#cd4420'
const DIM     = 'rgba(255,255,255,0.12)'
const BG_DEEP = '#08080f'

export default function UniverseMapPage() {
  const [universes, setUniverses] = useState<UniverseRow[]>([])
  const [selected, setSelected]  = useState<UniverseRow | null>(null)
  const [loading, setLoading]    = useState(true)
  const svgRef = useRef<SVGSVGElement>(null)

  async function fetchUniverses() {
    try {
      const res = await fetch('/api/universes')
      if (res.ok) {
        const data = await res.json() as UniverseRow[]
        setUniverses(data)
        if (!selected && data.length > 0) setSelected(data[0])
      }
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUniverses()
    const id = setInterval(fetchUniverses, 30_000)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const W = 420, H = 340
  const cx = W / 2, cy = H / 2

  // Pre-compute stars once — they never change between renders.
  const stars = useMemo(() => Array.from({ length: 80 }, (_, i) => {
    const seed = (i * 2891336453 + 0x9e3779b9) >>> 0
    const x    = ((seed & 0x1ff) / 0x1ff) * W
    const y    = (((seed >> 9) & 0x1ff) / 0x1ff) * H
    const r    = 0.5 + ((seed >> 18) & 0x3) * 0.3
    const op   = 0.15 + ((seed >> 22) & 0x7) * 0.04
    return { i, x, y, r, op }
  }), [])

  return (
    <div style={{
      minHeight: '100vh',
      background: BG_DEEP,
      color: '#e8e8e8',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      display: 'flex',
      flexDirection: 'column',
    }}>

      {/* Header */}
      <header style={{
        borderBottom: `1px solid rgba(0,232,208,0.18)`,
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
        flexShrink: 0,
      }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.35)', textDecoration: 'none', fontSize: 11 }}>
          ← Back
        </Link>
        <div style={{ width: 1, height: 16, background: DIM }} />
        <div style={{
          width: 24, height: 24, borderRadius: 4,
          background: `linear-gradient(135deg, ${TEAL} 0%, #0078a8 100%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, color: '#000', flexShrink: 0,
        }}>
          M
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: 1 }}>
            MULTIVERSE MAP
          </div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, marginTop: 1 }}>
            UNIVERSE SIMULATION — KNOWN UNIVERSES
          </div>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: 1 }}>
          {universes.length} UNIVERSE{universes.length !== 1 ? 'S' : ''} REGISTERED
        </div>
      </header>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 0 }}>

        {/* SVG Map */}
        <div style={{
          flex: '0 0 auto',
          width: W,
          padding: '24px 12px 24px 24px',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
        }}>
          {loading ? (
            <div style={{
              width: W, height: H,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(255,255,255,0.2)', fontSize: 11, letterSpacing: 2,
            }}>
              SCANNING MULTIVERSE...
            </div>
          ) : (
            <svg
              ref={svgRef}
              width={W} height={H}
              viewBox={`0 0 ${W} ${H}`}
              style={{ overflow: 'visible' }}
            >
              {/* Background stars */}
              {stars.map(({ i, x, y, r, op }) => (
                <circle key={i} cx={x} cy={y} r={r} fill="#fff" opacity={op} />
              ))}

              {/* Gateway connection lines (home → children) */}
              {universes.slice(1).map((u, i) => {
                const [x2, y2] = nodePosition(i + 1, universes.length, cx, cy)
                const isGateway = u.origin === 'velar_gateway'
                return (
                  <line key={u.seed}
                    x1={cx} y1={cy} x2={x2} y2={y2}
                    stroke={isGateway ? TEAL : 'rgba(255,255,255,0.08)'}
                    strokeWidth={isGateway ? 1.5 : 0.8}
                    strokeDasharray={isGateway ? '6 4' : '3 5'}
                    opacity={isGateway ? 0.6 : 0.4}
                  />
                )
              })}

              {/* Universe nodes */}
              {universes.map((u, i) => {
                const [nx, ny]  = nodePosition(i, universes.length, cx, cy)
                const isHome    = i === 0
                const isVelar   = u.origin === 'velar_gateway'
                const isSelected = selected?.seed === u.seed
                const r         = isHome ? 22 : isVelar ? 16 : 12
                const fillColor = isHome ? '#1a1a2e' : isVelar ? '#001820' : '#0a0a18'
                const ringColor = isHome ? RUST : isVelar ? TEAL : '#5566aa'

                return (
                  <g key={u.seed}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelected(u)}
                  >
                    {/* Selection ring */}
                    {isSelected && (
                      <circle cx={nx} cy={ny} r={r + 6}
                        fill="none"
                        stroke={ringColor}
                        strokeWidth={1}
                        opacity={0.4}
                      />
                    )}

                    {/* Outer glow ring */}
                    <circle cx={nx} cy={ny} r={r + 3}
                      fill="none"
                      stroke={ringColor}
                      strokeWidth={1.5}
                      opacity={isSelected ? 0.7 : 0.25}
                    />

                    {/* Planet body */}
                    <circle cx={nx} cy={ny} r={r}
                      fill={fillColor}
                      stroke={ringColor}
                      strokeWidth={isSelected ? 2 : 1}
                      opacity={0.95}
                    />

                    {/* Home universe inner decoration */}
                    {isHome && (
                      <>
                        <circle cx={nx} cy={ny} r={8} fill="none" stroke={RUST} strokeWidth={0.8} opacity={0.5} />
                        <circle cx={nx} cy={ny} r={3} fill={RUST} opacity={0.7} />
                      </>
                    )}

                    {/* Velar World inner decoration */}
                    {isVelar && (
                      <circle cx={nx} cy={ny} r={5} fill={TEAL} opacity={0.3} />
                    )}

                    {/* Label */}
                    <text
                      x={nx} y={ny + r + 12}
                      textAnchor="middle"
                      fill={isSelected ? '#fff' : 'rgba(255,255,255,0.45)'}
                      fontSize={8}
                      letterSpacing={0.5}
                    >
                      {u.name.length > 14 ? u.name.slice(0, 13) + '…' : u.name}
                    </text>

                    {/* Tech level pip row */}
                    {u.tech_level > 0 && (
                      <g transform={`translate(${nx - (u.tech_level * 4) / 2},${ny + r + 18})`}>
                        {Array.from({ length: Math.min(u.tech_level, 8) }, (_, ti) => (
                          <rect key={ti} x={ti * 4.5} y={0} width={3} height={2}
                            fill={ringColor} opacity={0.6} rx={0.5}
                          />
                        ))}
                      </g>
                    )}
                  </g>
                )
              })}
            </svg>
          )}
        </div>

        {/* Detail panel */}
        <div style={{
          flex: 1,
          minWidth: 240,
          padding: '24px 24px 24px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}>
          {selected ? (
            <>
              <div>
                <div style={{
                  fontSize: 9,
                  letterSpacing: 3,
                  color: selected.origin === 'velar_gateway' ? TEAL : RUST,
                  marginBottom: 6,
                  textTransform: 'uppercase',
                }}>
                  {ORIGIN_LABELS[selected.origin ?? ''] ?? selected.origin ?? 'Unknown Origin'}
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
                  {selected.name}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 1 }}>
                  {hexSeed(selected.seed)}
                </div>
              </div>

              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 6,
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}>
                {[
                  { label: 'Civilization',  value: TECH_LABELS[selected.tech_level] ?? `Level ${selected.tech_level}` },
                  { label: 'Discoveries',   value: selected.discovery_count.toString() },
                  { label: 'Active Players',value: selected.player_count.toString() },
                  { label: 'Founded',       value: formatDate(selected.created_at) },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: 1 }}>
                      {label.toUpperCase()}
                    </span>
                    <span style={{ fontSize: 12, color: '#e8e8e8' }}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Tech level bar */}
              <div>
                <div style={{ fontSize: 9, letterSpacing: 2, color: 'rgba(255,255,255,0.3)', marginBottom: 6 }}>
                  CIVILIZATION PROGRESS
                </div>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, (selected.tech_level / 8) * 100)}%`,
                    background: selected.origin === 'velar_gateway'
                      ? `linear-gradient(90deg, ${TEAL}, #0088cc)`
                      : `linear-gradient(90deg, ${RUST}, #e67e22)`,
                    borderRadius: 2,
                    transition: 'width 0.6s ease',
                  }} />
                </div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  marginTop: 4, fontSize: 8, color: 'rgba(255,255,255,0.2)',
                }}>
                  <span>STONE</span><span>SPACE</span><span>VELAR</span>
                </div>
              </div>
            </>
          ) : (
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(255,255,255,0.2)', fontSize: 11, letterSpacing: 2,
            }}>
              SELECT A UNIVERSE
            </div>
          )}

          {/* Universe list */}
          <div style={{ marginTop: 'auto' }}>
            <div style={{ fontSize: 9, letterSpacing: 2, color: 'rgba(255,255,255,0.2)', marginBottom: 8 }}>
              ALL UNIVERSES
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {universes.map(u => (
                <button
                  key={u.seed}
                  onClick={() => setSelected(u)}
                  style={{
                    background:   selected?.seed === u.seed ? 'rgba(0,232,208,0.07)' : 'transparent',
                    border:       `1px solid ${selected?.seed === u.seed ? 'rgba(0,232,208,0.2)' : 'rgba(255,255,255,0.05)'}`,
                    borderRadius: 4,
                    padding:      '6px 10px',
                    display:      'flex',
                    alignItems:   'center',
                    gap:          8,
                    cursor:       'pointer',
                    textAlign:    'left',
                    transition:   'all 0.15s',
                    fontFamily:   'inherit',
                  }}
                >
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                    background: u.origin === 'velar_gateway' ? TEAL : RUST,
                    boxShadow: `0 0 6px ${u.origin === 'velar_gateway' ? TEAL : RUST}`,
                    opacity: 0.8,
                  }} />
                  <span style={{ fontSize: 11, color: '#e8e8e8', flex: 1 }}>{u.name}</span>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>
                    {TECH_LABELS[u.tech_level] ?? `L${u.tech_level}`}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
      `}</style>
    </div>
  )
}
