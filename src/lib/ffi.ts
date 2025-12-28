import path from 'path';
import fs from 'fs';

/**
 * Get the platform-specific library filename
 */
function getLibraryPath(): string {
  const platform = process.platform;
  const arch = process.arch;

  let libName: string;
  if (platform === 'darwin') {
    libName = 'libschema.dylib';
  } else if (platform === 'linux') {
    libName = 'libschema.so';
  } else if (platform === 'win32') {
    libName = 'libschema.dll';
  } else {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  // Try multiple locations
  const possiblePaths = [
    // When installed as a package
    path.join(__dirname, '../../binaries', libName),
    // When running locally
    path.join(process.cwd(), 'binaries', libName),
    // In node_modules
    path.join(process.cwd(), 'node_modules', '@gremllm', 'nextjs', 'binaries', libName),
  ];

  for (const libPath of possiblePaths) {
    if (fs.existsSync(libPath)) {
      return libPath;
    }
  }

  throw new Error(
    `Could not find gremllm library. Searched:\n${possiblePaths.join('\n')}\n\n` +
    `Please run 'npm install' to download the binary for your platform.`
  );
}

// Lazy-load the native library (only when actually called)
let Convert: any;

function ensureLibraryLoaded() {
  if (Convert) return;

  try {
    // Dynamic import of koffi - only loads when function is called
    const koffi = require('koffi');
    const libPath = getLibraryPath();
    const lib = koffi.load(libPath);

    // Define function signature using koffi's declarative syntax
    // koffi handles char** (array of strings) and char* (string) conversion automatically
    Convert = lib.func('char* Convert(char* htmlInput, char** elementsToStrip, int elementsLen)');
  } catch (error) {
    console.error('Failed to load gremllm native library:', error);
    throw error;
  }
}

/**
 * Convert HTML to LLM-optimized markdown using the native gremllm library
 *
 * This calls the native library's Convert function which:
 * 1. Strips specified HTML elements (nav, footer, header, script, style, etc.)
 * 2. Converts remaining HTML to clean markdown
 * 3. Optimizes for token efficiency
 *
 * @param html - HTML string to convert
 * @param elementsToStrip - Optional array of HTML elements to strip (e.g., ['header', 'footer'])
 * @returns LLM-optimized markdown
 */
export function convert(html: string, elementsToStrip: string[] = []): string {
  if (!html) {
    return '';
  }

  try {
    // Lazy-load the library only when convert is actually called
    ensureLibraryLoaded();

    // koffi automatically handles the conversion of JavaScript arrays to char**
    // and char* return values to JavaScript strings
    const result = Convert(html, elementsToStrip, elementsToStrip.length);

    if (!result) {
      return html; // Return original on error
    }

    return result;
  } catch (error) {
    console.error('Error converting HTML:', error);
    return html; // Return original HTML on error
  }
}

/**
 * Convert HTML to markdown with default element stripping
 *
 * Note: The native library has its own defaults that are always applied:
 * nav, aside, footer, header, script, style, noscript, svg, iframe
 *
 * This function adds additional common elements to strip for extra optimization.
 *
 * @param html - HTML string to convert
 * @returns LLM-optimized markdown
 */
export function convertWithDefaults(html: string): string {
  // Pass empty array to use library defaults only
  // The library already strips: nav, aside, footer, header, script, style, noscript, svg, iframe
  return convert(html, []);
}
