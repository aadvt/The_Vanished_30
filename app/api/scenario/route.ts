import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  // Simulate Monte Carlo computation delay
  await new Promise((r) => setTimeout(r, 1500))

  return NextResponse.json({
    p5: 750000 + Math.random() * 100000,
    p50: 950000 + Math.random() * 50000,
    p95: 1100000 + Math.random() * 200000,
  })
}
