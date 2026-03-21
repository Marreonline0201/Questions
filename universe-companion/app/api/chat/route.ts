import { streamText, convertToModelMessages } from 'ai'
import type { UIMessage } from 'ai'
import { nanoid } from 'nanoid'
import { SYSTEM_PROMPT } from '@/lib/systemPrompt'
import { appendGeneration } from '@/lib/generationLog'

export const maxDuration = 60

export async function POST(req: Request) {
  const { messages, sessionId } = await req.json() as {
    messages: UIMessage[]
    sessionId: string
  }

  if (!messages || messages.length === 0) {
    return new Response('Missing messages', { status: 400 })
  }

  // Extract the last user text for logging
  const lastMsg = messages[messages.length - 1]
  const lastUserText = lastMsg?.parts
    ?.filter((p) => p.type === 'text')
    .map((p) => (p as { type: 'text'; text: string }).text)
    .join('') ?? ''

  const generationId = nanoid()

  // Pre-log as pending before streaming starts
  await appendGeneration({
    id: generationId,
    sessionId,
    prompt: lastUserText,
    response: '',
    status: 'streaming',
    timestamp: new Date().toISOString(),
    // anthropic/claude-sonnet-4.6 — dots not hyphens per AI Gateway slug rules
    model: 'anthropic/claude-sonnet-4.6',
  })

  // convertToModelMessages is async in v6
  const modelMessages = await convertToModelMessages(messages)

  const result = streamText({
    // AI Gateway routes automatically from "provider/model" string
    // OIDC auth via VERCEL_OIDC_TOKEN — no ANTHROPIC_API_KEY needed
    model: 'anthropic/claude-sonnet-4.6',
    system: SYSTEM_PROMPT,
    messages: modelMessages,
    maxOutputTokens: 1024,
    onFinish: async ({ text }) => {
      // Persist completed generation for quality review
      await appendGeneration({
        id: generationId,
        sessionId,
        prompt: lastUserText,
        response: text,
        status: 'complete',
        timestamp: new Date().toISOString(),
        model: 'anthropic/claude-sonnet-4.6',
      })
    },
  })

  // toUIMessageStreamResponse() — correct v6 name for chat UI (useChat) clients
  return result.toUIMessageStreamResponse({
    headers: {
      'X-Generation-Id': generationId,
    },
  })
}
