import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { query } = await req.json()

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const response = `Analyzing risk model for query: "${query}"... | Data extraction successful. | Monte Carlo simulation initiated. | Results: P50 suggests stable growth but volatility is rising in Node-7.`
      const tokens = response.split('|')

      for (const token of tokens) {
        controller.enqueue(encoder.encode(token))
        await new Promise((r) => setTimeout(r, 800)) // Artificial delay for flow
      }
      controller.close()
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}
