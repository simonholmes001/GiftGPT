import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const backendRes = await fetch('http://localhost:5137/api/chat/text-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  return new Response(backendRes.body, {
    status: backendRes.status,
    headers: backendRes.headers,
  });
}
