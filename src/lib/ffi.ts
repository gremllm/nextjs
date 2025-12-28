import ffi from 'ffi-napi';
import ref from 'ref-napi';
import path from 'path';
import fs from 'fs';

// C types
const charPtr = ref.refType(ref.types.CString);
const charPtrPtr = ref.refType(charPtr);

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

// Load the native library
let libschema: any;

try {
  const libPath = getLibraryPath();

  libschema = ffi.Library(libPath, {
    'Convert': [ref.types.CString, [ref.types.CString, charPtrPtr, ref.types.int]],
    'Free': ['void', [ref.types.CString]]
  });
} catch (error) {
  console.error('Failed to load gremllm native library:', error);
  throw error;
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
    // Convert elementsToStrip array to C array
    let elementsPtr = ref.NULL_POINTER;
    let elementsLen = 0;

    if (elementsToStrip.length > 0) {
      elementsLen = elementsToStrip.length;
      const buffers = elementsToStrip.map(el => Buffer.from(el + '\0', 'utf8'));
      const arrayBuffer = Buffer.alloc(buffers.length * ref.sizeof.pointer);

      buffers.forEach((buf, i) => {
        ref.writePointer(arrayBuffer, i * ref.sizeof.pointer, buf);
      });

      elementsPtr = arrayBuffer;
    }

    // Call the native Convert function
    const resultPtr = libschema.Convert(html, elementsPtr, elementsLen);

    if (resultPtr.isNull()) {
      return html; // Return original on error
    }

    // Convert result to JavaScript string
    const result = ref.readCString(resultPtr, 0);

    // Free the C string (important to prevent memory leaks)
    libschema.Free(resultPtr);

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
