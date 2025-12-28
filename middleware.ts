/**
 * Next.js Middleware for gremllm
 *
 * Place this file at the root of your Next.js project (next to next.config.js)
 * or copy this code into your existing middleware.ts file.
 *
 * This middleware detects ?gremllm query parameter and converts HTML responses
 * to LLM-optimized format using the native gremllm library.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Check if ?gremllm query parameter is present
  const hasGremllm = request.nextUrl.searchParams.has('gremllm');

  if (!hasGremllm) {
    // Pass through if no ?gremllm parameter
    return NextResponse.next();
  }

  try {
    // Import converter (dynamic import to avoid issues in edge runtime)
    const { convertWithDefaults } = await import('@gremllm/nextjs');

    // Create URL without gremllm parameter to fetch original HTML
    const fetchUrl = new URL(request.url);
    fetchUrl.searchParams.delete('gremllm');

    // Fetch the HTML version
    const response = await fetch(fetchUrl.toString(), {
      headers: request.headers,
    });

    // Only process successful HTML responses
    if (!response.ok || response.status !== 200) {
      return NextResponse.next();
    }

    const contentType = response.headers.get('Content-Type') || '';
    if (!contentType.includes('text/html')) {
      return NextResponse.next();
    }

    // Get HTML content
    const html = await response.text();

    // Convert HTML to markdown using native library
    const markdown = convertWithDefaults(html);

    // Return converted markdown
    return new NextResponse(markdown, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('[gremllm] Middleware error:', error);
    // On error, pass through to original handler
    return NextResponse.next();
  }
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
