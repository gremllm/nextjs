/**
 * @gremllm/nextjs - Next.js integration for gremllm
 *
 * Enables serving LLM-optimized versions of your Next.js pages
 * by adding ?gremllm query parameter to any route (e.g., /about?gremllm)
 */

export { withGremllm } from './lib/config';
export type { GremllmConfig } from './lib/config';
export { convert } from './lib/ffi';
