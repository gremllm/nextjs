/**
 * Next.js API Route Handler for gremllm
 *
 * This handler processes HTML to markdown conversion in Node.js runtime
 * where native modules (koffi) are supported.
 *
 * Usage: Create app/api/gremllm/route.ts with:
 * export { GET, runtime } from '@gremllm/nextjs/route';
 */

import { NextRequest, NextResponse } from 'next/server';
import { convert, convertWithDefaults } from './index';

// Force Node.js runtime (required for native modules)
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // Get the original URL from custom header (passed by middleware)
    const targetUrl = request.headers.get('x-gremllm-url');

    if (!targetUrl) {
      return NextResponse.json({ error: 'Missing target URL' }, { status: 400 });
    }

    // Read config from environment (set by withGremllm)
    const configStr = process.env.GREMLLM_CONFIG;
    let elementsToStrip: string[] = [];

    if (configStr) {
      try {
        const config = JSON.parse(configStr);
        elementsToStrip = config.elementsToStrip || [];

        if (config.debug) {
          console.log('[gremllm] Converting URL:', targetUrl);
          console.log('[gremllm] Config:', config);
        }
      } catch (e) {
        console.error('[gremllm] Failed to parse config:', e);
      }
    }

    // Fetch the original HTML
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': request.headers.get('user-agent') || 'gremllm-bot',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch: ${response.status}` },
        { status: response.status }
      );
    }

    const contentType = response.headers.get('Content-Type') || '';
    if (!contentType.includes('text/html')) {
      return NextResponse.json(
        { error: 'Not an HTML page' },
        { status: 400 }
      );
    }

    // Convert HTML to markdown
    const html = await response.text();
    const markdown = elementsToStrip.length > 0
      ? convert(html, elementsToStrip)
      : convertWithDefaults(html);

    // Return as markdown
    return new NextResponse(markdown, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('[gremllm] API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
