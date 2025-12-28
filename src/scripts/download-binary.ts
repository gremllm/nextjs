import https from 'https';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';

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
 * Determine the binary filename based on platform and architecture
 */
function getBinaryName(): string {
  const platform = process.platform;
  const arch = process.arch;

  if (platform === 'darwin') {
    if (arch === 'arm64') {
      return 'libschema_darwin_arm64.dylib';
    }
    return 'libschema_darwin_amd64.dylib';
  } else if (platform === 'linux') {
    if (arch === 'arm64') {
      return 'libschema_linux_arm64.so';
    }
    return 'libschema_linux_amd64.so';
  } else if (platform === 'win32') {
    return 'libschema_windows_amd64.dll';
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
        // Make executable on Unix systems
        if (process.platform !== 'win32') {
          fs.chmodSync(dest, 0o755);
        }
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
 * Main download function
 */
async function main() {
  try {
    console.log('🔍 Detecting platform...');
    const binaryName = getBinaryName();
    const localFilename = getLocalFilename();
    console.log(`📦 Need: ${binaryName}`);

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
    const asset = release.assets.find(a => a.name === binaryName);
    if (!asset) {
      throw new Error(
        `Binary not found in release ${release.tag_name}. Looking for: ${binaryName}\n` +
        `Available assets: ${release.assets.map(a => a.name).join(', ')}`
      );
    }

    console.log(`⬇️  Downloading ${asset.name}...`);
    await downloadFile(asset.browser_download_url, destPath);
    console.log(`✅ Downloaded to ${destPath}`);
  } catch (error) {
    console.error('❌ Error downloading gremllm binary:', error);
    console.error('\nYou can manually download the binary from:');
    console.error(`https://github.com/${GITHUB_REPO}/releases/latest`);
    process.exit(1);
  }
}

main();
