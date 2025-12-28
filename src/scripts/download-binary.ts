import https from 'https';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const GITHUB_REPO = 'gremllm/lib';
const BINARY_DIR = path.join(__dirname, '../../binaries');

interface Asset {
  name: string;
  browser_download_url: string;
}

interface Release {
  tag_name: string;
  assets: Asset[];
}

/**
 * Determine the archive filename based on platform and architecture
 */
function getArchiveName(): string {
  const platform = process.platform;
  const arch = process.arch;

  if (platform === 'darwin') {
    if (arch === 'arm64') {
      return 'libschema-darwin-arm64_darwin_arm64_v8.0.tar.gz';
    }
    return 'libschema-darwin-amd64_darwin_amd64_v1.tar.gz';
  } else if (platform === 'linux') {
    if (arch === 'arm64') {
      return 'libschema-linux-arm64_linux_arm64_v8.0.tar.gz';
    }
    return 'libschema-linux-amd64_linux_amd64_v1.tar.gz';
  } else if (platform === 'win32') {
    return 'libschema-windows-amd64_windows_amd64_v1.zip';
  }

  throw new Error(`Unsupported platform: ${platform} ${arch}`);
}

/**
 * Get the local filename (simplified)
 */
function getLocalFilename(): string {
  const platform = process.platform;

  if (platform === 'darwin') {
    return 'libschema.dylib';
  } else if (platform === 'linux') {
    return 'libschema.so';
  } else if (platform === 'win32') {
    return 'libschema.dll';
  }

  throw new Error(`Unsupported platform: ${platform}`);
}

/**
 * Fetch latest release info from GitHub
 */
async function getLatestRelease(): Promise<Release> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${GITHUB_REPO}/releases/latest`,
      headers: {
        'User-Agent': 'gremllm-nextjs-installer'
      }
    };

    https.get(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Failed to fetch release info: ${res.statusCode}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Download a file from URL to destination
 */
async function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        // Handle redirect
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
 * Extract archive and move library to destination
 */
async function extractArchive(archivePath: string, destDir: string): Promise<string> {
  const isZip = archivePath.endsWith('.zip');
  const isTarGz = archivePath.endsWith('.tar.gz');

  if (!isZip && !isTarGz) {
    throw new Error(`Unsupported archive format: ${archivePath}`);
  }

  // Create temp extraction directory
  const tempDir = path.join(destDir, '.temp-extract');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  try {
    if (isTarGz) {
      // Extract tar.gz
      await execAsync(`tar -xzf "${archivePath}" -C "${tempDir}"`);
    } else {
      // Extract zip
      await execAsync(`unzip -q "${archivePath}" -d "${tempDir}"`);
    }

    // Find the library file in the extracted contents
    // The library is named 'libschema' without extension
    const files = fs.readdirSync(tempDir);
    const libFile = files.find(f =>
      f === 'libschema' || f.endsWith('.dylib') || f.endsWith('.so') || f.endsWith('.dll')
    );

    if (!libFile) {
      throw new Error(`No library file found in archive: ${files.join(', ')}`);
    }

    const extractedLibPath = path.join(tempDir, libFile);

    // Make executable on Unix systems
    if (process.platform !== 'win32') {
      fs.chmodSync(extractedLibPath, 0o755);
    }

    return extractedLibPath;
  } finally {
    // Cleanup temp directory will happen after file is moved
  }
}

/**
 * Main download function
 */
async function main() {
  try {
    console.log('🔍 Detecting platform...');
    const archiveName = getArchiveName();
    const localFilename = getLocalFilename();
    console.log(`📦 Need: ${archiveName}`);

    // Create binaries directory if it doesn't exist
    if (!fs.existsSync(BINARY_DIR)) {
      fs.mkdirSync(BINARY_DIR, { recursive: true });
    }

    const destPath = path.join(BINARY_DIR, localFilename);

    // Skip if binary already exists
    if (fs.existsSync(destPath)) {
      console.log('✅ Binary already exists, skipping download');
      return;
    }

    console.log('🌐 Fetching latest release from GitHub...');
    const release = await getLatestRelease();
    console.log(`📌 Latest release: ${release.tag_name}`);

    // Find the matching asset
    const asset = release.assets.find(a => a.name === archiveName);
    if (!asset) {
      throw new Error(
        `Binary not found in release ${release.tag_name}. Looking for: ${archiveName}\n` +
        `Available assets: ${release.assets.map(a => a.name).join(', ')}`
      );
    }

    console.log(`⬇️  Downloading ${asset.name}...`);
    const archivePath = path.join(BINARY_DIR, archiveName);
    await downloadFile(asset.browser_download_url, archivePath);

    console.log(`📦 Extracting archive...`);
    const extractedLibPath = await extractArchive(archivePath, BINARY_DIR);

    // Move the extracted library to the final destination
    fs.renameSync(extractedLibPath, destPath);

    // Cleanup
    const tempDir = path.join(BINARY_DIR, '.temp-extract');
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.unlinkSync(archivePath);

    console.log(`✅ Installed to ${destPath}`);
  } catch (error) {
    console.error('❌ Error downloading gremllm binary:', error);
    console.error('\nYou can manually download the binary from:');
    console.error(`https://github.com/${GITHUB_REPO}/releases/latest`);
    process.exit(1);
  }
}

main();
