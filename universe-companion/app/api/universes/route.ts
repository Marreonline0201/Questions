// app/api/universes/route.ts
// M15: Returns all registered universe instances from the shared Neon DB.
// The universes table is populated by UniverseRegistry.js (server/src) when
// a player activates the Velar Gateway or starts a new universe.

import { neon } from '@neondatabase/serverless'

export const runtime = 'nodejs'

let _cached: UniverseRow[] | null = null
let _cachedAt = 0
const CACHE_TTL_MS = 60_000  // 1 min cache

export interface UniverseRow {
  seed:            number
  name:            string
  origin:          string | null
  created_at:      string
  player_count:    number
  tech_level:      number
  discovery_count: number
}

export async function GET() {
  const headers = {
    'Content-Type':                'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control':               'public, s-maxage=60, stale-while-revalidate=120',
  }

  const now = Date.now()
  if (_cached && now - _cachedAt < CACHE_TTL_MS) {
    return Response.json(_cached, { headers })
  }

  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    // Fallback: return the home universe stub when DB is unavailable
    return Response.json([
      { seed: 42, name: 'Home Universe', origin: 'genesis', created_at: new Date().toISOString(),
        player_count: 0, tech_level: 0, discovery_count: 0 }
    ], { headers })
  }

  try {
    const sql = neon(dbUrl)
    const rows = await sql`
      SELECT seed, name, origin, created_at, player_count, tech_level, discovery_count
      FROM   universes
      ORDER  BY created_at ASC
    ` as UniverseRow[]

    _cached   = rows.length > 0 ? rows : [
      { seed: 42, name: 'Home Universe', origin: 'genesis', created_at: new Date().toISOString(),
        player_count: 0, tech_level: 0, discovery_count: 0 }
    ]
    _cachedAt = now
    return Response.json(_cached, { headers })
  } catch (err) {
    console.error('[universes] DB error:', (err as Error).message)
    return Response.json([
      { seed: 42, name: 'Home Universe', origin: 'genesis', created_at: new Date().toISOString(),
        player_count: 0, tech_level: 0, discovery_count: 0 }
    ], { headers })
  }
}
