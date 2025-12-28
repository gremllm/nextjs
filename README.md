# @gremllm/nextjs

Next.js integration for [gremllm](https://github.com/gremllm/lib) - serve LLM-optimized markdown versions of your web pages by adding `?gremllm` to any URL.

## What is this?

This package enables your Next.js application to serve token-optimized markdown for LLM consumption. When a request comes in for `/about?gremllm`, it automatically:

1. Renders `/about` as normal HTML (SSR/SSG)
2. Strips LLM-irrelevant content (navigation, footers, ads, scripts, styles, etc.)
3. Converts to clean, semantic markdown
4. Returns optimized markdown (~50-80% token reduction vs raw HTML)

## Features

- 🚀 **Zero config** - Works out of the box with sensible defaults
- 🎯 **Query parameter based** - Add `?gremllm` to any URL
- ⚡ **Native performance** - FFI bindings to Go library for fast HTML→markdown conversion
- 📝 **Full markdown output** - Clean, semantic markdown optimized for LLMs
- 🔧 **Configurable** - Customize which elements to strip
- 📦 **Automatic binary downloads** - Platform-specific binaries downloaded on install
- 🌐 **Works with Vercel** - Compatible with edge runtime (with caveats)
- 🔒 **Respects annotations** - Honors `data-llm="keep"` and `data-llm="drop"` attributes

## Installation

```bash
npm install @gremllm/nextjs
```

The postinstall script will automatically download the correct binary for your platform (Linux, macOS, Windows) from the [gremllm/lib releases](https://github.com/gremllm/lib/releases).

## Quick Start

### 1. Update your Next.js config

```js
// next.config.js
const { withGremllm } = require('@gremllm/nextjs');

module.exports = withGremllm({
  // Your existing Next.js config
});
```

### 2. Copy the middleware file

Copy `node_modules/@gremllm/nextjs/middleware.ts` to your project root, or add this to your existing `middleware.ts`:

```ts
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const hasGremllm = request.nextUrl.searchParams.has('gremllm');

  if (!hasGremllm) {
    return NextResponse.next();
  }

  try {
    const { convertWithDefaults } = await import('@gremllm/nextjs');

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
```

### 3. Done!

Now any route in your app can be accessed with `?gremllm`:

```bash
# Regular HTML
curl https://yoursite.com/about

# LLM-optimized version
curl https://yoursite.com/about?gremllm
```

## Configuration

Pass options to `withGremllm`:

```js
// next.config.js
const { withGremllm } = require('@gremllm/nextjs');

module.exports = withGremllm(
  {
    // Your Next.js config
  },
  {
    // Gremllm options
    elementsToStrip: ['header', 'footer'], // Add to defaults
    debug: true, // Enable debug logging
  }
);
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `elementsToStrip` | `string[]` | `[]` | Additional HTML elements to remove (added to defaults) |
| `debug` | `boolean` | `false` | Enable debug logging |

### Default Stripped Elements

The following elements are **always** stripped (unless marked with `data-llm="keep"`):

- `nav`, `aside`, `footer`, `header` - Navigation and layout
- `script`, `style`, `noscript` - Code and styling
- `svg`, `iframe` - Embedded content

## HTML Annotations

Use `data-llm` attributes to control what gets stripped:

```html
<!-- Keep a footer that has relevant content -->
<footer data-llm="keep">
  <p>Last updated: 2024-01-15</p>
  <p>Author: Jane Doe</p>
</footer>

<!-- Drop specific elements -->
<div data-llm="drop">
  Subscribe to our newsletter!
</div>

<!-- Describe interactive components (scripts) -->
<script data-llm-description="Interactive mortgage calculator">
  // Calculator code...
</script>
```

## How It Works

```
Request: /about?gremllm
    ↓
Middleware: Detects ?gremllm parameter
    ↓
Fetch: /about (without ?gremllm - normal Next.js rendering)
    ↓
Convert: HTML → Markdown via native library
         1. Strip nav, footer, header, scripts, styles
         2. Process images (alt text), links, code blocks
         3. Convert to semantic markdown
         4. Optimize for token efficiency
    ↓
Response: Clean markdown (text/markdown)
```

## Platform Support

The native gremllm library is automatically downloaded for:

- **macOS**: ARM64 (Apple Silicon) and AMD64 (Intel)
- **Linux**: ARM64 and AMD64
- **Windows**: AMD64

Binaries are pulled from [gremllm/lib releases](https://github.com/gremllm/lib/releases/latest).

## Current Limitations

### 1. Edge Runtime Compatibility

Next.js middleware runs in the Edge Runtime, which has limitations:
- Native modules (FFI) may not work in edge deployments
- Workaround: Deploy to Node.js runtime (Vercel allows this with config)

**For Vercel:**
```js
// vercel.json
{
  "functions": {
    "middleware.ts": {
      "runtime": "nodejs18.x"
    }
  }
}
```

### 2. Performance

The middleware fetches each page internally, which adds latency. Consider:
- Adding caching (not included to keep package simple)
- Using ISR/SSG where possible
- Rate limiting `?gremllm` requests

## Advanced Usage

### Programmatic Conversion

You can use the converter directly in your code:

```ts
import { convert, convertWithDefaults } from '@gremllm/nextjs';

// With custom elements to strip
const optimized = convert(html, ['header', 'footer', 'nav']);

// With default stripping
const optimized = convertWithDefaults(html);
```

### Custom Middleware Logic

Extend the middleware with your own logic:

```ts
export async function middleware(request: NextRequest) {
  const hasGremllm = request.nextUrl.searchParams.has('gremllm');

  if (hasGremllm) {
    // Add authentication check
    const isAuthorized = checkAuth(request);
    if (!isAuthorized) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Add caching
    const cacheKey = getCacheKey(request.url);
    const cached = await getFromCache(cacheKey);
    if (cached) {
      return new NextResponse(cached, {
        status: 200,
        headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
      });
    }

    // ... rest of conversion logic
  }

  return NextResponse.next();
}
```

## Troubleshooting

### Binary not found

If the postinstall script fails to download the binary:

1. Manually download from [releases](https://github.com/gremllm/lib/releases/latest)
2. Place in `node_modules/@gremllm/nextjs/binaries/`
3. Rename to `libschema.dylib` (macOS), `libschema.so` (Linux), or `libschema.dll` (Windows)

### FFI errors

Ensure you have the correct native dependencies:

```bash
npm install ffi-napi ref-napi
```

On some systems you may need build tools:

```bash
# macOS
xcode-select --install

# Ubuntu/Debian
sudo apt-get install build-essential

# Windows
npm install --global windows-build-tools
```

### Middleware not running

Check your `middleware.ts` is at the project root and the `config.matcher` is correct.

### Edge Runtime errors

If deploying to edge runtime, you may see FFI errors. Use Node.js runtime instead (see "Edge Runtime Compatibility" above).

## Security Considerations

This package:

- ✅ Only strips HTML elements, doesn't add content
- ✅ Uses native library with memory safety (Go + CGO)
- ✅ No external network calls (except fetching your own pages)
- ⚠️ Increases server load (renders + converts on every `?gremllm` request)
- ⚠️ Consider rate limiting for production
- ⚠️ Consider caching converted pages

## Development

### Building from source

```bash
git clone https://github.com/gremllm/nextjs-hoc-gremllm.git
cd nextjs-hoc-gremllm
npm install
npm run build
```

### Testing locally

```bash
npm link
cd your-nextjs-app
npm link @gremllm/nextjs
```

## Related Projects

- [gremllm/lib](https://github.com/gremllm/lib) - Core Go library for HTML conversion
- [gremllm spec](https://github.com/gremllm/lib/blob/main/PROJECT_OVERVIEW.md) - Full specification

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Help Wanted:**
- [ ] Add caching layer
- [ ] Edge runtime compatibility (WASM compilation?)
- [ ] Performance benchmarks
- [ ] Integration tests
- [ ] Streaming support for large pages

## License

MIT

## Roadmap

- [x] FFI bindings to native library
- [x] Next.js middleware integration
- [x] ?gremllm query parameter detection
- [x] HTML element stripping
- [x] Full markdown conversion
- [ ] Caching layer
- [ ] Edge runtime support (WASM?)
- [ ] Token usage analytics
- [ ] Streaming support for large pages
- [ ] Response compression (gzip/brotli)
