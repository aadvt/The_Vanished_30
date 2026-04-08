import { NextRequest, NextResponse } from 'next/server'

/**
 * Secure proxy for Deepgram API key.
 * The actual key lives server-side only — never exposed to the browser.
 */
export async function GET(req: NextRequest) {
  const key = process.env.DEEPGRAM_API_KEY

  if (!key) {
    return NextResponse.json(
      { error: 'Deepgram API key not configured' },
      { status: 500 }
    )
  }

  return NextResponse.json({ key })
}
