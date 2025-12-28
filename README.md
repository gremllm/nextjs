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
export { GET } from '@gremllm/nextjs/route';
```

The handler includes:
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
export { middleware } from '@gremllm/nextjs/middleware';
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
```

### 4. Add LLM Metadata to your pages (optional, but highly recommended)

Create a `app/layout.tsx` or `pages/_document.tsx` file and add the following metadata to your pages:
```typescript
import {Html, Head, Main, NextScript} from 'next/document'
import { llmInstructions } from '@gremllm/nextjs/metadata';

export default function Document() {
    return (
      <Html lang="en">
        <Head>
          <meta name="llm-instructions" content={llmInstructions} /> {* This is what you need to add *}
        </Head>
        <body>
          <Main/>
          <NextScript/>
        </body>
      </Html>
    )
}
```

This will tell llm's that the ?gremllm query parameter is available.

### 5. Done! 🎉

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

You can keep them by adding `data-llm='keep'` to your elements.

### Environment Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `GREMLLM_BASE_URL` | `string` | `undefined` | Override base URL for internal fetches. Useful when running behind a proxy/load balancer with SSL termination. Example: `http://localhost:3000` |

**Use case**: When your application is behind a load balancer or ingress with HTTPS, but runs on HTTP internally, set this to avoid SSL errors:

```bash
# In your deployment
GREMLLM_BASE_URL=http://localhost:3000
```

This will make gremllm fetch pages using `http://localhost:3000/path` instead of the external `https://yourdomain.com/path`.

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
