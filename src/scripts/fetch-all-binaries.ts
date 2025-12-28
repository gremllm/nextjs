import https from 'https';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const VERSION = "v0.0.2";
const GITHUB_REPO = 'gremllm/lib';
const BINARY_DIR = path.join(__dirname, '../../binaries');

interface PlatformConfig {
  archiveName: string;
  outputName: string;
  isZip: boolean;
}

const PLATFORMS: PlatformConfig[] = [
  {
    archiveName: 'libschema-darwin-arm64_darwin_arm64_v8.0.tar.gz',
    outputName: 'libschema-darwin-arm64.dylib',
    isZip: false,
  },
  {
    archiveName: 'libschema-darwin-amd64_darwin_amd64_v1.tar.gz',
    outputName: 'libschema-darwin-amd64.dylib',
    isZip: false,
  },
  {
    archiveName: 'libschema-linux-arm64_linux_arm64_v8.0.tar.gz',
    outputName: 'libschema-linux-arm64.so',
    isZip: false,
  },
  {
    archiveName: 'libschema-linux-amd64_linux_amd64_v1.tar.gz',
    outputName: 'libschema-linux-amd64.so',
    isZip: false,
  },
  {
    archiveName: 'libschema-windows-amd64_windows_amd64_v1.zip',
    outputName: 'libschema-windows-amd64.exe',
    isZip: true,
  },
];

/**
 * Download a file from URL to destination
 */
async function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        if (res.headers.location) {
          downloadFile(res.headers.location, dest).then(resolve).catch(reject);
        } else {
          reject(new Error('Redirect without location'));
        }
        return;
      }

      if (res.statusCode !== 200) {
        reject(new Error(`Failed to download: ${res.statusCode}`));
        return;
      }

      const fileStream = fs.createWriteStream(dest);
      res.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });

      fileStream.on('error', (err) => {
        fs.unlinkSync(dest);
        reject(err);
      });
    }).on('error', reject);
  });
}

/**
 * Extract archive and return the library file path
 */
async function extractArchive(archivePath: string, destDir: string, isZip: boolean): Promise<string> {
  const tempDir = path.join(destDir, '.temp-extract');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  try {
    if (isZip) {
      await execAsync(`unzip -q "${archivePath}" -d "${tempDir}"`);
    } else {
      await execAsync(`tar -xzf "${archivePath}" -C "${tempDir}"`);
    }

    // Find the library file in the extracted contents
    const files = fs.readdirSync(tempDir);
    const libFile = files.find(f =>
      f === 'libschema' || f.endsWith('.dylib') || f.endsWith('.so') || f.endsWith('.dll') || f.endsWith('.exe')
    );

    if (!libFile) {
      throw new Error(`No library file found in archive: ${files.join(', ')}`);
    }

    return path.join(tempDir, libFile);
  } catch (error) {
    // Cleanup temp directory on error
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    throw error;
  }
}

/**
 * Process a single platform: download, extract, rename
 */
async function processPlatform(config: PlatformConfig): Promise<void> {
  const { archiveName, outputName, isZip } = config;
  const url = `https://github.com/${GITHUB_REPO}/releases/download/${VERSION}/${archiveName}`;
  const archivePath = path.join(BINARY_DIR, archiveName);
  const outputPath = path.join(BINARY_DIR, outputName);

  console.log(`\n📦 Processing ${outputName}...`);

  // Skip if binary already exists
  if (fs.existsSync(outputPath)) {
    console.log(`  ✅ Already exists, skipping`);
    return;
  }

  // Download
  console.log(`  ⬇️  Downloading...`);
  await downloadFile(url, archivePath);

  // Extract
  console.log(`  📂 Extracting...`);
  const extractedPath = await extractArchive(archivePath, BINARY_DIR, isZip);

  // Move to final location
  fs.renameSync(extractedPath, outputPath);

  // Make executable on Unix systems (and Windows .exe files)
  if (!outputName.endsWith('.dll')) {
    fs.chmodSync(outputPath, 0o755);
  }

  // Cleanup
  const tempDir = path.join(BINARY_DIR, '.temp-extract');
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  fs.unlinkSync(archivePath);

  console.log(`  ✅ Installed to ${outputPath}`);
}

/**
 * Main function
 */
async function main() {
  try {
    console.log(`🚀 Fetching gremllm binaries for version ${VERSION}`);
    console.log(`📍 Repository: ${GITHUB_REPO}`);

    // Create binaries directory if it doesn't exist
    if (!fs.existsSync(BINARY_DIR)) {
      fs.mkdirSync(BINARY_DIR, { recursive: true });
    }

    // Process each platform sequentially
    for (const platform of PLATFORMS) {
      await processPlatform(platform);
    }

    console.log('\n✨ All binaries fetched successfully!');
    console.log('\nBinaries directory contents:');
    const files = fs.readdirSync(BINARY_DIR).filter(f => !f.startsWith('.'));
    files.forEach(f => console.log(`  - ${f}`));
  } catch (error) {
    console.error('\n❌ Error fetching binaries:', error);
    console.error('\nYou can manually download binaries from:');
    console.error(`https://github.com/${GITHUB_REPO}/releases/${VERSION}`);
    process.exit(1);
  }
}

main();
