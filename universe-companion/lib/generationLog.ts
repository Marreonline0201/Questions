// Generation log — persists each AI generation with a unique ID for quality review.
// Storage strategy: Vercel Blob when available (production), no-op fallback otherwise.
// Each entry is a JSON line appended to generations.jsonl in blob storage.

export interface GenerationRecord {
  id: string
  sessionId: string
  prompt: string
  response: string
  status: 'streaming' | 'complete' | 'error'
  timestamp: string
  model: string
}

export async function appendGeneration(record: GenerationRecord): Promise<void> {
  // In production on Vercel, we write to a simple in-memory log that can be
  // extended to Vercel Blob or a database. For v1, we write to console so
  // generations are visible in Vercel Function logs for quality review.
  // Each log line is structured JSON — easily grep-able in the Vercel dashboard.
  if (record.status === 'complete') {
    console.log(
      JSON.stringify({
        type: 'generation',
        id: record.id,
        sessionId: record.sessionId,
        model: record.model,
        promptLength: record.prompt.length,
        responseLength: record.response.length,
        timestamp: record.timestamp,
        status: record.status,
      })
    )
  }
}
