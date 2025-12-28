// app/api/gremllm/route.ts

// ============================================
// SIMPLE SETUP (Recommended)
// ============================================
// Just export the pre-built route handler:

export { GET, runtime } from '@gremllm/nextjs/route';

// That's it! This includes:
// - Node.js runtime configuration
// - URL extraction from middleware headers
// - HTML fetching with User-Agent
// - Content-type validation
// - Markdown conversion
// - Error handling
// - Cache headers

// ============================================
// CUSTOM SETUP (Optional)
// ============================================
// If you need authentication, custom caching, etc., see the README's
// "Advanced Usage > Custom Route Handler" section for a full example.
