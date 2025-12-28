# @gremllm/nextjs

Next.js integration for [gremllm](https://github.com/gremllm/lib) - serve LLM-optimized markdown versions of your web pages by adding `?gremllm` to any URL.

## What is this?

This package enables your Next.js application to serve token-optimized markdown for LLM consumption. When a request comes in for `/about?gremllm`, it automatically:

1. Detects the `?gremllm` parameter in middleware
2. Fetches the page HTML (SSR/SSG)
3. Strips LLM-irrelevant content (navigation, footers, ads, scripts, styles, etc.)
4. Converts to clean, semantic markdown
5. Returns optimized markdown (~50-80% token reduction vs raw HTML)

## Features

- 🚀 **Zero config** - Works out of the box with sensible defaults
- 🎯 **Query parameter based** - Add `?gremllm` to any URL
- ⚡ **Native performance** - FFI bindings to Rust library via koffi for fast conversion
- 📝 **Full markdown output** - Clean, semantic markdown optimized for LLMs
- 🔧 **Configurable** - Customize which elements to strip
- 📦 **Automatic binary downloads** - Platform-specific binaries downloaded on install
- 💪 **TypeScript** - Full type safety included

## Installation

```bash
npm install @gremllm/nextjs koffi
# or
yarn add @gremllm/nextjs koffi
```

> **Important**: `koffi` must be installed as a peer dependency for native module support.

The postinstall script will automatically download the correct binary for your platform (Linux, macOS, Windows) from the [gremllm/lib releases](https://github.com/gremllm/lib/releases).

## Quick Start

### 1. Update your Next.js config

Wrap your config with `withGremllm`:

```js
// next.config.js
const { withGremllm } = require('@gremllm/nextjs');

const nextConfig = {
  // Your existing Next.js config
};

module.exports = withGremllm(nextConfig, {
  // Optional: customize elements to strip
  elementsToStrip: ['header', 'footer', 'nav'],
  debug: false,
});
```

### 2. Create API Route

Create `app/api/gremllm/route.ts` and simply export the pre-built handler:

```typescript
// app/api/gremllm/route.ts
export { GET, runtime } from '@gremllm/nextjs/route';
```

That's it! The handler includes:
- ✅ Node.js runtime configuration
- ✅ URL extraction from middleware headers
- ✅ HTML fetching with proper User-Agent
- ✅ Content-type validation
- ✅ Markdown conversion using your config
- ✅ Error handling
- ✅ Cache headers

### 3. Add Middleware

Create or update `middleware.ts` at your project root.

**Option A: Simple (recommended for new projects)**

Just export the pre-built middleware:

```typescript
// middleware.ts
export { middleware, config } from '@gremllm/nextjs/middleware';
```

**Option B: Compose with existing middleware**

If you already have custom middleware logic, use `gremllmMiddleware`:

```typescript
// middleware.ts
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
  // e.g., authentication, redirects, etc.

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api/|_next/static|_next/image|favicon.ico).*)'],
};
```

### 4. Done! 🎉

Visit any page with `?gremllm`:

```bash
# Regular HTML
curl https://yoursite.com/about

# LLM-optimized markdown
curl https://yoursite.com/about?gremllm
```

## How It Works

```
Request: /about?gremllm
    ↓
Middleware (Edge Runtime): Detects ?gremllm
    ↓
Rewrite: /api/gremllm (with URL in header)
    ↓
API Route (Node.js Runtime): Fetches HTML, converts to markdown
    ↓
Native Library (koffi FFI): Fast Rust-based conversion
    ↓
Response: Clean markdown (text/markdown)
```

**Architecture Rationale:**
- Middleware runs in Edge Runtime (can't use native modules)
- API Route runs in Node.js Runtime (can use koffi/native modules)
- This split architecture gives us both speed and native module support

## Configuration

Pass options to `withGremllm`:

```js
// next.config.js
module.exports = withGremllm(nextConfig, {
  elementsToStrip: ['header', 'footer'], // Additional elements to strip
  debug: true, // Enable debug logging
});
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `elementsToStrip` | `string[]` | `[]` | Additional HTML elements to remove (added to defaults) |
| `debug` | `boolean` | `false` | Enable debug logging |

### Default Stripped Elements

The following elements are **always** stripped:

- `nav`, `aside`, `footer`, `header` - Navigation and layout
- `script`, `style`, `noscript` - Code and styling
- `svg`, `iframe` - Embedded content

## Platform Support

The native gremllm library is automatically downloaded for:

- **macOS**: ARM64 (Apple Silicon) and AMD64 (Intel)
- **Linux**: ARM64 and AMD64
- **Windows**: AMD64

Binaries are pulled from [gremllm/lib releases](https://github.com/gremllm/lib/releases/latest).

## API Reference

### `withGremllm(nextConfig, gremllmConfig)`

Higher-order function that wraps your Next.js configuration.

**Parameters:**
- `nextConfig` (object): Your Next.js configuration
- `gremllmConfig` (object, optional):
  - `elementsToStrip` (string[]): HTML elements/selectors to remove
  - `debug` (boolean): Enable debug logging

**Returns:** Enhanced Next.js configuration with webpack externals configured

### `convert(html, elementsToStrip)`

Convert HTML to markdown with custom element stripping.

```typescript
import { convert } from '@gremllm/nextjs';

const markdown = convert(html, ['header', 'footer']);
```

### `convertWithDefaults(html)`

Convert HTML to markdown using default element stripping.

```typescript
import { convertWithDefaults } from '@gremllm/nextjs';

const markdown = convertWithDefaults(html);
```

Default elements stripped: `nav`, `aside`, `footer`, `header`, `script`, `style`, `noscript`, `svg`, `iframe`

### Middleware Exports

#### `middleware` and `config` from `@gremllm/nextjs/middleware`

Pre-built middleware for standalone use:

```typescript
export { middleware, config } from '@gremllm/nextjs/middleware';
```

#### `gremllmMiddleware(request)` from `@gremllm/nextjs/middleware`

Composable middleware function for integration with existing middleware:

```typescript
import { gremllmMiddleware } from '@gremllm/nextjs/middleware';

export function middleware(request: NextRequest) {
  const gremllmResponse = gremllmMiddleware(request);
  if (gremllmResponse) return gremllmResponse;

  // Your custom logic
  return NextResponse.next();
}
```

**Parameters:**
- `request` (NextRequest): The incoming request

**Returns:** `NextResponse | null` - Returns a rewrite response if `?gremllm` is present, null otherwise

## Troubleshooting

### "Cannot find module 'koffi'"

Make sure koffi is installed:
```bash
npm install koffi
```

### "Native module not found"

The binary downloads automatically during `npm install`. If it fails, manually run:
```bash
npm run postinstall
```

Or manually download from [releases](https://github.com/gremllm/lib/releases/latest) and place in `node_modules/@gremllm/nextjs/binaries/`.

### "Edge runtime error"

Ensure your API route has `export const runtime = 'nodejs'` - native modules require Node.js runtime, not Edge runtime.

### Middleware not running

- Check `middleware.ts` is at project root
- Verify `config.matcher` is correct
- Ensure `/api/gremllm` is excluded from matcher

## Requirements

- Next.js 13.0.0 or higher (App Router)
- Node.js 18.0.0 or higher
- Supported platforms: macOS (Intel/Apple Silicon), Linux (x64/ARM64), Windows (x64)

## Examples

See the [`examples/`](./examples) directory for complete working examples.

## Advanced Usage

### Custom Route Handler

If you need to customize the route behavior (add authentication, custom caching, etc.), create your own handler:

```typescript
// app/api/gremllm/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { convertWithDefaults } from '@gremllm/nextjs';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  // Add authentication
  const apiKey = request.headers.get('x-api-key');
  if (!isValidApiKey(apiKey)) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const targetUrl = request.headers.get('x-gremllm-url');
  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing target URL' }, { status: 400 });
  }

  try {
    const response = await fetch(targetUrl);
    const html = await response.text();
    const markdown = convertWithDefaults(html);

    // Custom caching or rate limiting logic here

    return new NextResponse(markdown, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

### Custom Middleware Logic

Extend the middleware with custom logic:

```typescript
import { gremllmMiddleware } from '@gremllm/nextjs/middleware';

export function middleware(request: NextRequest) {
  // Add authentication before gremllm
  const apiKey = request.headers.get('x-api-key');
  if (request.nextUrl.searchParams.has('gremllm') && !isValidApiKey(apiKey)) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // Handle gremllm conversion
  const gremllmResponse = gremllmMiddleware(request);
  if (gremllmResponse) {
    return gremllmResponse;
  }

  return NextResponse.next();
}
```

### Programmatic Conversion

Use the converter directly in your code:

```typescript
import { convert, convertWithDefaults } from '@gremllm/nextjs';

// With custom elements
const optimized = convert(html, ['header', 'footer', 'nav']);

// With defaults
const optimized = convertWithDefaults(html);
```

## Security Considerations

- ✅ Only strips HTML elements, doesn't add content
- ✅ Uses native library with memory safety (Rust)
- ✅ No external network calls (except fetching your own pages)
- ⚠️ Increases server load (renders + converts on every `?gremllm` request)
- ⚠️ Consider rate limiting for production
- ⚠️ Consider caching converted pages

## Performance Tips

1. **Add caching**: Cache converted markdown to avoid repeated conversion
2. **Rate limiting**: Limit `?gremllm` requests per IP
3. **CDN**: Cache markdown responses at CDN level
4. **ISR/SSG**: Use Incremental Static Regeneration where possible

## Related Projects

- [gremllm/lib](https://github.com/gremllm/lib) - Core Rust library for HTML conversion
- [koffi](https://github.com/Koromix/koffi) - Fast and easy-to-use Node.js FFI library

## Contributing

Issues and PRs welcome! This is an open-source project.

**Help Wanted:**
- [ ] Add caching layer example
- [ ] Performance benchmarks
- [ ] Integration tests
- [ ] Streaming support for large pages

## License

MIT

## Links

- [GitHub Repository](https://github.com/gremllm/nextjs-hoc-gremllm)
- [gremllm Native Library](https://github.com/gremllm/lib)
- [Report Issues](https://github.com/gremllm/nextjs-hoc-gremllm/issues)
