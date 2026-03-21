// app/api/velar-status/route.ts
// M13: Returns whether the Velar signal has been decoded in the simulation.
// Reads the discoveries table in the shared Neon DB.
// The companion site polls this every 15s to show the First Contact banner.

import { neon } from '@neondatabase/serverless'

export const runtime = 'nodejs'

// Cached result — only hits DB once per 30s per cold-start (edge cache handles the rest)
let _cached: { decoded: boolean; decoderName: string | null } | null = null
let _cachedAt = 0
const CACHE_TTL_MS = 30_000

export async function GET() {
  const headers = {
    'Content-Type':                'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control':               'public, s-maxage=30, stale-while-revalidate=60',
  }

  // In-process cache to avoid hammering DB on every poll
  const now = Date.now()
  if (_cached && now - _cachedAt < CACHE_TTL_MS) {
    return Response.json(_cached, { headers })
  }

  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    return Response.json({ decoded: false, decoderName: null }, { headers })
  }

  try {
    const sql = neon(dbUrl)
    const rows = await sql`
      SELECT player_name
      FROM   discoveries
      WHERE  type = 'VELAR_DECODED'
      ORDER  BY timestamp ASC
      LIMIT  1
    `

    if (rows.length > 0) {
      _cached   = { decoded: true, decoderName: rows[0].player_name ?? 'Unknown Explorer' }
    } else {
      _cached   = { decoded: false, decoderName: null }
    }
    _cachedAt = now

    return Response.json(_cached, { headers })
  } catch (err) {
    console.error('[velar-status] DB error:', (err as Error).message)
    return Response.json({ decoded: false, decoderName: null }, { headers })
  }
}
