/**
 * Next.js Middleware for gremllm
 *
 * Place this file at the root of your Next.js project (next to next.config.js)
 * or copy this code into your existing middleware.ts file.
 *
 * OPTION A: Simple setup (recommended)
 * Just export the pre-built middleware from the package.
 */

export { middleware, config } from '@gremllm/nextjs/middleware';

/**
 * OPTION B: Compose with existing middleware
 * If you already have custom middleware logic, use gremllmMiddleware instead:
 *
 * import { NextResponse } from 'next/server';
 * import type { NextRequest } from 'next/server';
 * import { gremllmMiddleware } from '@gremllm/nextjs/middleware';
 *
 * export function middleware(request: NextRequest) {
 *   // Try gremllm first
 *   const gremllmResponse = gremllmMiddleware(request);
 *   if (gremllmResponse) {
 *     return gremllmResponse;
 *   }
 *
 *   // Your custom middleware logic here
 *   // e.g., authentication, redirects, etc.
 *
 *   return NextResponse.next();
 * }
 *
 * export const config = {
 *   matcher: ['/((?!api/|_next/static|_next/image|favicon.ico).*)'],
 * };
 */
