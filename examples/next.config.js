// next.config.js
const { withGremllm } = require('@gremllm/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Your existing Next.js config
};

// Wrap with gremllm to enable .md routes
module.exports = withGremllm(nextConfig, {
  // Optional: customize elements to strip
  elementsToStrip: ['header', 'footer', 'nav', 'aside'],

  // Optional: enable debug logging
  debug: false,
});
