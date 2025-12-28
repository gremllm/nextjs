import type { NextConfig } from 'next';

export interface GremllmConfig {
  /**
   * HTML elements to strip from responses (e.g., ['header', 'footer', 'nav'])
   * Defaults to ['header', 'footer', 'nav', 'aside']
   * Note: Additional default elements are always stripped (script, style, etc.)
   */
  elementsToStrip?: string[];

  /**
   * Whether to enable debug logging
   * Defaults to false
   */
  debug?: boolean;
}

/**
 * Higher-order function that wraps Next.js config to enable gremllm support
 *
 * @example
 * ```js
 * // next.config.js
 * const { withGremllm } = require('@gremllm/nextjs');
 *
 * module.exports = withGremllm({
 *   // Your Next.js config
 * }, {
 *   // Gremllm options (optional)
 *   elementsToStrip: ['header', 'footer'],
 *   debug: false,
 * });
 * ```
 */
export function withGremllm(
  nextConfig: NextConfig = {},
  gremllmConfig: GremllmConfig = {}
): NextConfig {
  return {
    ...nextConfig,

    // Pass gremllm config via environment variables so it's accessible in middleware
    env: {
      ...nextConfig.env,
      __GREMLLM_CONFIG__: JSON.stringify(gremllmConfig),
    },
  };
}
