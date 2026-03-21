'use client'

// Minimal AI Elements-compatible MessageResponse component.
// Wraps react-markdown with the same interface as AI Elements so the app can be
// upgraded to the full registry component (npx ai-elements@latest add message)
// without changing any import paths.

import ReactMarkdown from 'react-markdown'

interface MessageResponseProps {
  children: string
  className?: string
  /** If true, appends a blinking cursor (for streaming state) */
  streaming?: boolean
}

export function MessageResponse({ children, className, streaming }: MessageResponseProps) {
  return (
    <div className={`prose-science${streaming ? ' cursor-blink' : ''}${className ? ` ${className}` : ''}`}>
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  )
}
