/**
 * Middleware helper for gremllm
 *
 * Export this from your middleware.ts for easy setup
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Gremllm middleware function
 *
 * Detects ?gremllm query parameter and rewrites to API route
 */
export function gremllmMiddleware(request: NextRequest): NextResponse | null {
  const hasGremllm = request.nextUrl.searchParams.has('gremllm');

  if (!hasGremllm) {
    return null; // Return null to let other middleware/routes handle
  }

  // Build the original URL without the gremllm parameter
  const originalUrl = new URL(request.url);
  originalUrl.searchParams.delete('gremllm');

  // Rewrite to API route and pass the URL via header
  const rewriteUrl = new URL('/api/gremllm', request.url);

  // Pass the original URL via a custom header
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-gremllm-url', originalUrl.toString());

  return NextResponse.rewrite(rewriteUrl, {
    request: {
      headers: requestHeaders,
    },
  });
}

/**
 * Default middleware export for standalone use
 */
export function middleware(request: NextRequest) {
  const gremllmResponse = gremllmMiddleware(request);
  if (gremllmResponse) {
    return gremllmResponse;
  }

  return NextResponse.next();
}
