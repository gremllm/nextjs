// middleware.ts (place at root of your Next.js project)

// ============================================
// OPTION A: SIMPLE (Recommended for new projects)
// ============================================
// Just export the pre-built middleware:

export { middleware } from '@gremllm/nextjs/middleware';

// ============================================
// OPTION B: COMPOSE WITH CUSTOM MIDDLEWARE
// ============================================
// If you have existing middleware logic, uncomment below
// and comment out the line above:

/*
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { gremllmMiddleware } from '@gremllm/nextjs/middleware';

export function middleware(request: NextRequest) {
  // Try gremllm first
  const gremllmResponse = gremllmMiddleware(request);
  if (gremllmResponse) {
    return gremllmResponse;
  }

  // Your custom middleware logic here
  // Examples:
  // - Custom redirects
  // - Rate limiting
  // - Logging

  return NextResponse.next();
}
*/
