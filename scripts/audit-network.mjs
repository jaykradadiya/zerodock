import fs from 'node:fs';
import path from 'node:path';

const DIST_DIR = path.resolve('dist/assets');

if (!fs.existsSync(DIST_DIR)) {
  console.error('❌ dist/assets directory does not exist. Run "npm run build" first.');
  process.exit(1);
}

// Explicit allowlist of permissible remote URLs
const ALLOWED_REMOTE_URLS = [
  'https://api.github.com/repos/jaykradadiya/zerodock', // Optional GitHub star badge in Navbar
];

const jsFiles = fs.readdirSync(DIST_DIR).filter(file => file.endsWith('.js'));
let hasViolations = false;

console.log(`🔍 Auditing ${jsFiles.length} client bundles for unauthorized network calls and leaks...`);

for (const file of jsFiles) {
  const filePath = path.join(DIST_DIR, file);
  const content = fs.readFileSync(filePath, 'utf-8');

  // 1. Audit for telemetry / tracking beacons
  if (content.includes('sendBeacon(')) {
    console.error(`🚨 Unauthorized sendBeacon() found in ${file}`);
    hasViolations = true;
  }

  // 2. Audit for WebSocket connections
  if (content.includes('new WebSocket(')) {
    console.error(`🚨 Unauthorized WebSocket() instantiation in ${file}`);
    hasViolations = true;
  }

  // 3. Audit for XMLHttpRequest
  if (content.includes('new XMLHttpRequest(') || content.includes('XMLHttpRequest()')) {
    console.error(`🚨 Unauthorized XMLHttpRequest found in ${file}`);
    hasViolations = true;
  }

  // 4. Audit for hardcoded fetch() to external endpoints
  const fetchUrlRegex = /fetch\s*\(\s*['"`](https?:\/\/[^'"`]+)['"`]/g;
  let match;
  while ((match = fetchUrlRegex.exec(content)) !== null) {
    const targetUrl = match[1];
    const isAllowed = ALLOWED_REMOTE_URLS.some(allowed => targetUrl.startsWith(allowed));
    if (!isAllowed) {
      console.error(`🚨 Unauthorized remote fetch() target in ${file}:`);
      console.error(`   Target: ${targetUrl}`);
      hasViolations = true;
    }
  }
}

if (hasViolations) {
  console.error('\n❌ Network audit FAILED: Detected unauthorized network call patterns in bundle.');
  process.exit(1);
} else {
  console.log('✅ Network audit PASSED: Zero unauthorized remote network endpoints detected in client bundle.');
}
