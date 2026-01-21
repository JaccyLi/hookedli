/**
 * Interactive SSL Setup Script
 * Helps set up SSL certificates for local development or production
 */

const fs = require('fs')
const path = require('path')
const readline = require('readline')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

console.log('=================================')
console.log('🔒 HookedLee SSL Setup Wizard')
console.log('=================================\n')

const question = (query) => {
  return new Promise(resolve => rl.question(query, resolve))
}

const main = async () => {
  console.log('Choose SSL setup option:')
  console.log('  1. Generate self-signed certificate (local development)')
  console.log('  2. Configure existing certificates')
  console.log('  3. Let\'s Encrypt (production with domain)')
  console.log('  4. Exit\n')

  const choice = await question('Select option (1-4): ')

  switch (choice.trim()) {
    case '1':
      await generateSelfSignedCert()
      break
    case '2':
      await configureExistingCerts()
      break
    case '3':
      await letsEncryptSetup()
      break
    case '4':
      console.log('Exiting...')
      break
    default:
      console.log('Invalid choice. Please try again.\n')
  }

  rl.close()
}

const generateSelfSignedCert = async () => {
  console.log('\n📝 Generating Self-Signed Certificate')
  console.log('---')

  const { execSync } = require('child_process')

  // Check OpenSSL
  try {
    execSync('openssl version', { stdio: 'ignore' })
  } catch (error) {
    console.error('❌ OpenSSL not found. Please install OpenSSL first.')
    console.log('\nInstallation instructions:')
    console.log('  Windows: https://slproweb.com/products/Win32OpenSSL.html')
    console.log('  Linux:   sudo apt-get install openssl && sudo apt-get install ca-certificates')
    console.log('  macOS:   (usually pre-installed)')
    return
  }

  try {
    console.log('Generating certificate...')
    execSync('node scripts/generate-cert.js', { stdio: 'inherit' })

    console.log('\n✅ Certificate generated!')
    console.log('\nNext steps:')
    console.log('  1. Add to .env file:')
    console.log('     SSL_KEY_PATH=./ssl/key.pem')
    console.log('     SSL_CERT_PATH=./ssl/cert.pem')
    console.log('  2. Restart server: npm start')
    console.log('  3. Access: https://localhost:3443')
  } catch (error) {
    console.error('❌ Failed to generate certificate:', error.message)
  }
}

const configureExistingCerts = async () => {
  console.log('\n📝 Configure Existing Certificates')
  console.log('---\n')

  const keyPath = await question('Enter path to private key file (key.pem): ')
  const certPath = await question('Enter path to certificate file (cert.pem): ')
  const caPath = await question('Enter path to CA bundle file (optional, press Enter to skip): ')

  console.log('\nValidating files...')

  if (!fs.existsSync(keyPath)) {
    console.error(`❌ Key file not found: ${keyPath}`)
    return
  }
  console.log(`✓ Key file found: ${keyPath}`)

  if (!fs.existsSync(certPath)) {
    console.error(`❌ Certificate file not found: ${certPath}`)
    return
  }
  console.log(`✓ Certificate found: ${certPath}`)

  if (caPath && !fs.existsSync(caPath)) {
    console.warn(`⚠️  CA file not found: ${caPath}`)
    const continue = await question('Continue without CA bundle? (y/n): ')
    if (continue.toLowerCase() !== 'y') {
      return
    }
  } else if (caPath) {
    console.log(`✓ CA bundle found: ${caPath}`)
  }

  // Update .env file
  console.log('\nUpdating .env file...')
  const envPath = path.join(__dirname, '..', '.env')

  let envContent = ''
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8')
  }

  // Add or update SSL paths
  const sslConfig = `\n# SSL Certificate Paths\nSSL_KEY_PATH=${keyPath}\nSSL_CERT_PATH=${certPath}\n`
  if (caPath) {
    envContent += `SSL_CA_PATH=${caPath}\n`
  }

  // Remove old SSL config if exists
  envContent = envContent
    .split('\n')
    .filter(line => !line.startsWith('SSL_KEY_PATH=') && !line.startsWith('SSL_CERT_PATH=') && !line.startsWith('SSL_CA_PATH='))
    .join('\n')

  envContent += sslConfig

  fs.writeFileSync(envPath envContent.trim() + '\n')
  console.log(`✓ Updated: ${envPath}`)

  console.log('\n✅ Configuration complete!')
  console.log('\nRestart server with: npm start')
}

const letsEncryptSetup = async () => {
  console.log('\n🌐 Let\'s Encrypt Setup for Production')
  console.log('---\n')

  console.log('Prerequisites:')
  console.log('  1. A domain name pointed to your server')
  console.log('  2. Server accessible from internet (port 80/443)')
  console.log('  3. Root or sudo access\n')

  const domain = await question('Enter your domain name (e.g., example.com): ')

  if (!domain) {
    console.error('❌ Domain name is required')
    return
  }

  console.log('\nChoose installation method:')
  console.log('  1. Certbot (recommended)')
  console.log('  2. Manual instructions')
  console.log('  3. Back\n')

  const method = await question('Select method (1-3): ')

  switch (method.trim()) {
    case '1':
      await certbotSetup(domain)
      break
    case '2':
      await manualLetsEncryptInstructions(domain)
      break
    case '3':
      console.log('Returning to main menu...')
      break
    default:
      console.log('Invalid choice\n')
  }
}

const certbotSetup = async (domain) => {
  console.log('\n📝 Automated Certbot Setup')
  console.log('---\n')

  console.log('Choose your platform:')
  console.log('  1. Ubuntu/Debian with Nginx')
  console.log('  2. Ubuntu/Debian with Apache')
  console.log('  3. CentOS/RHEL')
  console.log('  4. Back\n')

  const platform = await question('Select platform (1-4): ')

  console.log('\nCommands to run:\n')

  switch (platform.trim()) {
    case '1':
      console.log(`# Install certbot:
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Stop your server (if running)
sudo systemctl stop hookedlee-backend || true

# Obtain certificate
sudo certbot --nginx -d ${domain}

# Certbot will ask for:
#   - Email address (for renewal notices)
#   - Terms of service
#   - Redirect HTTP to HTTPS (choose YES)
#   - Your domain name

# Start your server
sudo systemctl start hookedlee-backend

# Auto-renewal is configured automatically
sudo certbot renew --dry-run
`)
      break

    case '2':
      console.log(`# Install certbot:
sudo apt-get update
sudo apt-get install certbot python3-certbot-apache

# Stop Apache
sudo systemctl stop apache2

# Obtain certificate
sudo certbot --apache -d ${domain}

# Start Apache
sudo systemctl start apache2

# Test auto-renewal
sudo certbot renew --dry-run
`)
      break

    case '3':
      console.log(`# Install EPEL repository
sudo yum install -y epel-release

# Install certbot
sudo yum install -y certbot

# Stop your server
sudo systemctl stop hookedlee-backend || true

# Obtain certificate
sudo certbot --standalone -d ${domain}

# Start your server
sudo systemctl start hookedlee-backend
`)
      break

    case '4':
      return
  }

  console.log('\nAfter running certbot:')
  console.log(`  1. Certificate will be at: /etc/letsencrypt/live/${domain}/fullchain.pem`)
  console.log(`  2. Private key will be at: /etc/letsencrypt/live/${domain}/privkey.pem`)
  console.log('\nUpdate .env file with:')
  console.log(`  SSL_KEY_PATH=/etc/letsencrypt/live/${domain}/privkey.pem`)
  console.log(`  SSL_CERT_PATH=/etc/letsencrypt/live/${domain}/fullchain.pem`)
  console.log('\nThen restart server: npm start')
}

const manualLetsEncryptInstructions = async (domain) => {
  console.log('\n📝 Manual Let\'s Encrypt Instructions')
  console.log('---\n')

  console.log(`1. Point your domain (${domain}) to this server's IP address`)
  console.log(`   - Update DNS A record to point to your server`)
  console.log(`   - May take a few hours to propagate\n`)

  console.log(`2. Ensure ports 80 and 443 are open in firewall:`)
  console.log(`   sudo ufw allow 80/tcp`)
  console.log(`   sudo ufw allow 443/tcp`)
  console.log(`   sudo ufw allow OpenSSH`)
  console.log(`   sudo ufw enable\n`)

  console.log(`3. Install certbot:`)
  console.log(`   sudo apt-get update`)
  console.log(`   sudo apt-get install certbot\n`)

  console.log(`4. Generate certificate:`)
  console.log(`   sudo certbot certonly --standalone -d ${domain}`)
  console.log(`   - Follow the prompts`)
  console.log(`   - Choose "Standalone" if asked`)
  console.log(`   - Certificate saved to: /etc/letsencrypt/live/${domain}/\n`)

  console.log(`5. Copy certificates to project (optional):`)
  console.log(`   sudo cp /etc/letsencrypt/live/${domain}/fullchain.pem ./ssl/cert.pem`)
  console.log(`   sudo cp /etc/letsencrypt/live/${domain}/privkey.pem ./ssl/key.pem`)
  console.log(`   sudo chown $USER:$USER ./ssl/*.pem\n`)

  console.log(`6. Update .env file with:`)
  console.log(`   SSL_KEY_PATH=./ssl/key.pem`)
  console.log(`   SSL_CERT_PATH=./ssl/cert.pem\n`)

  console.log(`7. Set up auto-renewal (cron job):`)
  console.log(`   sudo crontab -e`)
  console.log(`   Add this line (runs daily):`)
  console.log(`   0 0 * * * certbot renew --quiet --post-hook "pm2 restart hookedlee-backend"\n`)
}

// Start the wizard
main().catch(err => {
  console.error('Error:', err)
  rl.close()
  process.exit(1)
})
