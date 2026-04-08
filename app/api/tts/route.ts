import { NextRequest, NextResponse } from 'next/server'

/**
 * TTS Proxy Route — ElevenLabs Text-to-Speech
 * 
 * Accepts { text } in the request body, streams back MP3 audio
 * from ElevenLabs. The API key stays server-side only.
 */
export async function POST(req: NextRequest) {
  const { text } = await req.json()
  const apiKey = process.env.ELEVENLABS_API_KEY
  const voiceId = process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL' // Default: Sarah

  if (!apiKey) {
    return NextResponse.json(
      { error: 'ElevenLabs API key not configured' },
      { status: 500 }
    )
  }

  if (!text?.trim()) {
    return NextResponse.json(
      { error: 'No text provided' },
      { status: 400 }
    )
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_flash_v2_5',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('ElevenLabs error:', errorText)
      return NextResponse.json(
        { error: 'TTS generation failed' },
        { status: response.status }
      )
    }

    // Stream the audio back to the client
    return new NextResponse(response.body, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Transfer-Encoding': 'chunked',
      },
    })
  } catch (err) {
    console.error('TTS proxy error:', err)
    return NextResponse.json(
      { error: 'TTS proxy error' },
      { status: 500 }
    )
  }
}
