import { NextRequest, NextResponse } from 'next/server';

// Supported models and their providers
const MODEL_CONFIG = {
  'gpt-4.1': { provider: 'openai', audio: false, apiVersion: '2025-04-14' },
  'gpt-4o': { provider: 'openai', audio: false, apiVersion: '2025-04-14' },
  'gpt-4o-audio': { provider: 'openai', audio: true, apiVersion: '2025-04-14' },
  'deepseek': { provider: 'deepseek', audio: false },
  'gemini': { provider: 'gemini', audio: false },
};

export async function POST(req: NextRequest) {
  const url = new URL(req.url || '', 'http://localhost');
  if (url.pathname.endsWith('/text-stream')) {
    // Forward to backend
    const body = await req.text();
    const backendRes = await fetch('http://localhost:5137/api/chat/text-stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    // Stream the response back to the client
    return new Response(backendRes.body, {
      status: backendRes.status,
      headers: backendRes.headers,
    });
  }

  try {
    const { message, model, apiKey } = await req.json();
    if (!message || !model || !apiKey) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }
    type ModelKey = keyof typeof MODEL_CONFIG;
    if (!(model in MODEL_CONFIG)) {
      return NextResponse.json({ error: 'Unsupported model.' }, { status: 400 });
    }
    const config = MODEL_CONFIG[model as ModelKey];

    let responseData = null;
    const audioCapable = config.audio;

    if (config.provider === 'openai') {
      // Call OpenAI API (placeholder, implement actual call below)
      // Use apiKey and config.apiVersion
      responseData = { text: '[OpenAI response placeholder]' };
    } else if (config.provider === 'deepseek') {
      // Call DeepSeek API (placeholder)
      responseData = { text: '[DeepSeek response placeholder]' };
    } else if (config.provider === 'gemini') {
      // Call Gemini API (placeholder)
      responseData = { text: '[Gemini response placeholder]' };
    }

    return NextResponse.json({ ...responseData, audioCapable });
  } catch {
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
