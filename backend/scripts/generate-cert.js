/**
 * Generate Self-Signed SSL Certificate for Local Development
 * Run with: node scripts/generate-cert.js
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const sslDir = path.join(__dirname, '..', 'ssl')

console.log('=================================')
console.log('🔒 Generating Self-Signed SSL Certificate')
console.log('=================================\n')

// Create SSL directory
if (!fs.existsSync(sslDir)) {
  console.log('Creating SSL directory...')
  fs.mkdirSync(sslDir, { recursive: true })
  console.log(`✓ Created: ${sslDir}\n`)
} else {
  console.log(`Using existing SSL directory: ${sslDir}\n`)
}

// Check if OpenSSL is available
try {
  execSync('openssl version', { stdio: 'ignore' })
  console.log('✓ OpenSSL is installed\n')
} catch (error) {
  console.error('❌ OpenSSL not found!')
  console.error('\nPlease install OpenSSL:')
  console.error('  Windows: https://slproweb.com/products/Win32OpenSSL.html')
  console.error('  Linux:   sudo apt-get install openssl')
  console.error('  macOS:   (pre-installed)\n')
  process.exit(1)
}

// Certificate configuration
const certConfig = {
  country: 'US',
  state: 'State',
  locality: 'City',
  organization: 'HookedLee',
  organizationalUnit: 'Backend',
  commonName: 'localhost',
  subjectAltName: 'DNS:localhost,DNS:*.localhost,IP:127.0.0.1'
}

console.log('Certificate configuration:')
console.log(`  Common Name: ${certConfig.commonName}`)
console.log(`  Organization: ${certConfig.organization}`)
console.log(`  Subject Alt Names: ${certConfig.subjectAltName}\n`)

// Generate private key
const keyPath = path.join(sslDir, 'key.pem')
console.log('Generating private key...')

try {
  execSync(
    `openssl genrsa -out "${keyPath}" 2048`,
    { stdio: 'ignore' }
  )
  console.log(`✓ Private key: ${keyPath}`)
} catch (error) {
  console.error('❌ Failed to generate private key')
  process.exit(1)
}

// Generate certificate
const certPath = path.join(sslDir, 'cert.pem')
const configPath = path.join(sslDir, 'cert.conf')

// Create OpenSSL config file
const opensslConfig = `[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_req
prompt = no

[req_distinguished_name]
C = ${certConfig.country}
ST = ${certConfig.state}
L = ${certConfig.locality}
O = ${certConfig.organization}
OU = ${certConfig.organizationalUnit}
CN = ${certConfig.commonName}

[v3_req]
keyUsage = keyEncipherment, digitalSignature, keyAgreement
extendedKeyUsage = serverAuth
subjectAltName = ${certConfig.subjectAltName}
`

fs.writeFileSync(configPath, opensslConfig)

console.log('Generating certificate...')

try {
  execSync(
    `openssl req -new -x509 -key "${keyPath}" -out "${certPath}" -days 365 -nodes -out "${configPath}"`,
    { stdio: 'ignore' }
  )
  console.log(`✓ Certificate: ${certPath}`)
} catch (error) {
  console.error('❌ Failed to generate certificate')
  process.exit(1)
}

// Clean up config file
fs.unlinkSync(configPath)

// Set file permissions
try {
  fs.chmodSync(keyPath, 0o600)
  fs.chmodSync(certPath, 0o644)
  console.log('\n✓ File permissions set correctly')
} catch (error) {
  console.warn('⚠️  Could not set file permissions (this may be okay on some systems)')
}

console.log('\n=================================')
console.log('✅ SSL Certificate Generated Successfully!')
console.log('=================================')
console.log(`\nCertificate valid for 365 days`)
console.log(`Files created in: ${sslDir}/`)
console.log(`  - key.pem  (Private key)`)
console.log(`  - cert.pem (Certificate)`)
console.log(`\nNext steps:`)
console.log(`  1. Add to .env file:`)
console.log(`     SSL_KEY_PATH=./ssl/key.pem`)
console.log(`     SSL_CERT_PATH=./ssl/cert.pem`)
console.log(`\n  2. Restart server:`)
console.log(`     npm start`)
console.log(`\n  3. Access via HTTPS:`)
console.log(`     https://localhost:3443/api/health`)
console.log('=================================\n')

console.log('⚠️  WARNING: Self-signed certificates')
console.log('   - For local development only')
console.log('   - Browser will show security warning')
console.log('   - This is NORMAL and expected')
console.log('   - For production, use Let\'s Encrypt')
console.log('=================================\n')
