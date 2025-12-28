// middleware.ts (place at root of your Next.js project)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const hasGremllm = request.nextUrl.searchParams.has('gremllm');

  if (!hasGremllm) {
    return NextResponse.next();
  }

  try {
    const { convertWithDefaults } = await import('@gremllm/nextjs');

    // Fetch original HTML without ?gremllm parameter
    const fetchUrl = new URL(request.url);
    fetchUrl.searchParams.delete('gremllm');

    const response = await fetch(fetchUrl.toString(), {
      headers: request.headers,
    });

    if (!response.ok || response.status !== 200) {
      return NextResponse.next();
    }

    const contentType = response.headers.get('Content-Type') || '';
    if (!contentType.includes('text/html')) {
      return NextResponse.next();
    }

    const html = await response.text();
    const markdown = convertWithDefaults(html);

    return new NextResponse(markdown, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('[gremllm] Middleware error:', error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
