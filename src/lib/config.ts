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
      GREMLLM_CONFIG: JSON.stringify(gremllmConfig),
    },

    // Configure webpack to externalize native modules
    webpack: (config: any, options: any) => {
      // Externalize koffi (native module) on the server side
      if (options.isServer) {
        config.externals = config.externals || [];

        // Handle both array and function externals
        if (Array.isArray(config.externals)) {
          config.externals.push('koffi');
        } else if (typeof config.externals === 'function') {
          const originalExternals = config.externals;
          config.externals = async (context: any, request: any, callback: any) => {
            if (request === 'koffi') {
              return callback(null, 'commonjs ' + request);
            }
            return originalExternals(context, request, callback);
          };
        }
      }

      // Call the user's webpack config if they have one
      if (nextConfig.webpack) {
        return nextConfig.webpack(config, options);
      }

      return config;
    },
  };
}
