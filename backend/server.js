/**
 * HookedLee Backend Server
 * Securely proxies AI API requests and manages API keys
 * HTTPS Support with SSL Certificates
 */

require('dotenv').config()
const https = require('https')
const http = require('http')
const fs = require('fs')
const path = require('path')
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const compression = require('compression')
const rateLimit = require('express-rate-limit')
const axios = require('axios')
const { authenticate, verifyWeChatCode, generateToken } = require('./middleware/auth.js')

const app = express()
const HTTP_PORT = process.env.HTTP_PORT || 3000
const HTTPS_PORT = process.env.HTTPS_PORT || 3443

// Trust proxy - needed when behind nginx reverse proxy
app.set('trust proxy', 1)

// ========== MIDDLEWARE ==========

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for WeChat compatibility
  crossOriginEmbedderPolicy: false
}))

// CORS configuration
app.use(cors({
  origin: '*', // WeChat Mini Program requires this
  credentials: true
}))

// Compression
app.use(compression())

// Parse JSON
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' }
})
app.use('/api/', limiter)

// ========== API KEYS (from environment variables) ==========

const API_KEYS = {
  BIGMODEL: process.env.BIGMODEL_API_KEY,
  DEEPSEEK: process.env.DEEPSEEK_API_KEY
}

// Validate API keys on startup
if (!API_KEYS.BIGMODEL && !API_KEYS.DEEPSEEK) {
  console.error('❌ ERROR: At least one API key must be set in .env file!')
  console.error('Please set BIGMODEL_API_KEY and/or DEEPSEEK_API_KEY')
  process.exit(1)
}

// ========== ROUTES ==========

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    models: {
      bigmodel: !!API_KEYS.BIGMODEL,
      deepseek: !!API_KEYS.DEEPSEEK
    },
    protocol: req.protocol,
    secure: req.secure
  })
})

// Get available models (doesn't expose keys)
app.get('/api/models', (req, res) => {
  const models = []

  if (API_KEYS.BIGMODEL) {
    models.push({
      id: 'glm-4.7',
      name: 'GLM-4.7',
      provider: 'bigmodel',
      available: true
    })
    models.push({
      id: 'glm-4.7-flash',
      name: 'GLM-4.7-Flash',
      provider: 'bigmodel',
      available: true
    })
    models.push({
      id: 'glm-4.7-flashx',
      name: 'GLM-4.7-FlashX',
      provider: 'bigmodel',
      available: true
    })
  }

  if (API_KEYS.DEEPSEEK) {
    models.push({
      id: 'deepseek-chat',
      name: 'DeepSeek-Chat',
      provider: 'deepseek',
      available: true
    })
    models.push({
      id: 'deepseek-reasoner',
      name: 'DeepSeek-Reasoner',
      provider: 'deepseek',
      available: true
    })
  }

  res.json({ models })
})

// WeChat Mini Program login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { code } = req.body

    if (!code) {
      return res.status(400).json({
        error: 'Missing code',
        message: 'WeChat login code is required'
      })
    }

    // Verify code with WeChat server
    const wechatData = await verifyWeChatCode(code)

    if (!wechatData || !wechatData.openid) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid WeChat login code'
      })
    }

    // Generate JWT token
    const token = generateToken(wechatData.openid)

    console.log(`[Auth] User logged in: ${wechatData.openid}`)

    res.json({
      token,
      openid: wechatData.openid
    })
  } catch (error) {
    console.error('[Auth] Login error:', error)
    res.status(500).json({
      error: 'Login failed',
      message: error.message
    })
  }
})

// Helper function to retry API calls on rate limiting (429)
async function retryApiCall(apiCall, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await apiCall()
      return response
    } catch (error) {
      const isRateLimit = error.response?.status === 429
      const isLastAttempt = attempt === maxRetries - 1

      if (isRateLimit && !isLastAttempt) {
        const waitTime = Math.pow(2, attempt) * 2000 // Exponential backoff: 2s, 4s, 8s
        console.log(`[Rate Limit] Got 429, retrying in ${waitTime}ms... (attempt ${attempt + 1}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
        continue
      }

      throw error // Re-throw if not rate limit or last attempt failed
    }
  }
}

// Proxy endpoint for GLM (BigModel) chat completions
app.post('/api/proxy/glm', authenticate, async (req, res) => {
  try {
    if (!API_KEYS.BIGMODEL) {
      return res.status(400).json({
        error: 'BigModel API key not configured'
      })
    }

    const { model, messages, temperature, top_p, max_tokens, stream } = req.body

    const response = await retryApiCall(async () => {
      return await axios.post(
        'https://open.bigmodel.cn/api/paas/v4/chat/completions',
        {
          model: model || 'glm-4.7',
          messages,
          temperature: temperature || 0.8,
          top_p: top_p || 0.95,
          max_tokens: max_tokens || 8192,
          stream: stream || false
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEYS.BIGMODEL}`
          },
          timeout: 300000 // 5 minutes
        }
      )
    }, 3) // Max 3 retries

    res.json(response.data)
  } catch (error) {
    console.error('[GLM Proxy Error]:', error.message)
    res.status(500).json({
      error: 'Failed to proxy request to GLM API',
      details: error.response?.data || error.message
    })
  }
})

// Proxy endpoint for DeepSeek chat completions
app.post('/api/proxy/deepseek', authenticate, async (req, res) => {
  try {
    if (!API_KEYS.DEEPSEEK) {
      return res.status(400).json({
        error: 'DeepSeek API key not configured'
      })
    }

    const { model, messages, temperature, top_p, max_tokens, stream } = req.body

    const response = await retryApiCall(async () => {
      return await axios.post(
        'https://api.deepseek.com/v1/chat/completions',
        {
          model: model || 'deepseek-chat',
          messages,
          temperature: temperature || 0.8,
          top_p: top_p || 0.95,
          max_tokens: max_tokens || 8192,
          stream: stream || false
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEYS.DEEPSEEK}`
          },
          timeout: 300000 // 5 minutes
        }
      )
    }, 3) // Max 3 retries

    res.json(response.data)
  } catch (error) {
    console.error('[DeepSeek Proxy Error]:', error.message)
    res.status(500).json({
      error: 'Failed to proxy request to DeepSeek API',
      details: error.response?.data || error.message
    })
  }
})

// Proxy endpoint for image generation (BigModel CogView-3-Flash - Free)
app.post('/api/proxy/image', authenticate, async (req, res) => {
  try {
    if (!API_KEYS.BIGMODEL) {
      return res.status(400).json({
        error: 'BigModel API key not configured'
      })
    }

    const { prompt, size, isHero } = req.body

    // Use CogView-3-Flash for all images (free model)
    const model = 'cogview-3-flash'

    console.log('[Image Gen]', isHero ? 'Hero image' : 'Section image', 'using model:', model)

    const response = await axios.post(
      'https://open.bigmodel.cn/api/paas/v4/images/generations',
      {
        model: model,
        prompt: prompt,
        size: size || '1024x1024'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEYS.BIGMODEL}`
        },
        timeout: 60000
      }
    )

    res.json(response.data)
  } catch (error) {
    console.error('[Image Generation Error]:', error.message)
    console.error('[Image Generation Error Details]:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    })
    res.status(500).json({
      error: 'Failed to generate image',
      details: error.response?.data || error.message
    })
  }
})

// Unified proxy endpoint (routes to appropriate API based on model)
app.post('/api/proxy/chat', authenticate, async (req, res) => {
  try {
    const { model } = req.body

    if (!model) {
      return res.status(400).json({
        error: 'Model is required'
      })
    }

    // Route to appropriate proxy
    if (model === 'glm-4.7' || model === 'glm-4.7-flash' || model === 'glm-4.7-flashx') {
      req.url = '/api/proxy/glm'
      return app._router.handle(req, res)
    } else if (model === 'deepseek-chat' || model === 'deepseek-reasoner') {
      req.url = '/api/proxy/deepseek'
      return app._router.handle(req, res)
    } else {
      return res.status(400).json({
        error: `Unknown model: ${model}`
      })
    }
  } catch (error) {
    console.error('[Unified Proxy Error]:', error.message)
    res.status(500).json({
      error: 'Failed to proxy chat request',
      details: error.message
    })
  }
})

// ========== ERROR HANDLING ==========

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path
  })
})

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]:', err)
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
})

// ========== SSL CERTIFICATE OPTIONS ==========

// SSL certificate paths
const certPaths = {
  key: process.env.SSL_KEY_PATH || path.join(__dirname, 'ssl', 'key.pem'),
  cert: process.env.SSL_CERT_PATH || path.join(__dirname, 'ssl', 'cert.pem'),
  ca: process.env.SSL_CA_PATH || path.join(__dirname, 'ssl', 'ca.pem')
}

// Check if SSL certificates exist
const sslExists = fs.existsSync(certPaths.key) && fs.existsSync(certPaths.cert)

// ========== CREATE HTTPS SERVER ==========

let httpsServer = null

if (sslExists) {
  // SSL certificates found - start HTTPS server
  try {
    const httpsOptions = {
      key: fs.readFileSync(certPaths.key),
      cert: fs.readFileSync(certPaths.cert),
      ca: fs.existsSync(certPaths.ca) ? fs.readFileSync(certPaths.ca) : undefined
    }

    httpsServer = https.createServer(httpsOptions, app)

    httpsServer.listen(HTTPS_PORT, () => {
      console.log('=================================')
      console.log('🔒 HTTPS Server Started')
      console.log('=================================')
      console.log(`✓ HTTPS running on port ${HTTPS_PORT}`)
      console.log(`✓ SSL certificates loaded`)
      console.log(`✓ Certificate: ${certPaths.cert}`)
      console.log(`✓ Key: ${certPaths.key}`)
      console.log('=================================\n')
    })

    httpsServer.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${HTTPS_PORT} is already in use!`)
        console.error('Please stop the other process or use a different port')
      } else {
        console.error('❌ HTTPS server error:', error)
      }
    })
  } catch (error) {
    console.error('❌ Failed to load SSL certificates:', error.message)
    console.log('ℹ️  Falling back to HTTP only...')
    console.log('ℹ️  See README.md for instructions on generating SSL certificates\n')
  }
} else {
  // No SSL certificates - HTTP only
  console.log('=================================')
  console.log('⚠️  SSL certificates not found')
  console.log('=================================')
  console.log('ℹ️  HTTPS server not started')
  console.log('ℹ️  To enable HTTPS, follow these steps:')
  console.log('')
  console.log('For local development (self-signed cert):')
  console.log('  npm run generate-cert')
  console.log('')
  console.log('For production (Let\'s Encrypt):')
  console.log('  1. Point your domain to this server')
  console.log('  2. Run: sudo certbot --nginx -d yourdomain.com')
  console.log('  3. Update cert paths in .env')
  console.log('')
  console.log('=================================\n')
}

// ========== CREATE HTTP SERVER (redirects to HTTPS) ==========

const httpServer = http.createServer((req, res) => {
  // Check if request is coming from nginx reverse proxy
  const forwardedProto = req.headers['x-forwarded-proto']

  // If behind nginx proxy (https forwarded), serve directly without redirect
  if (forwardedProto === 'https') {
    app(req, res)
  } else if (sslExists) {
    // Redirect all direct HTTP traffic to HTTPS
    const httpsHost = req.headers.host.split(':')[0] // Remove port if present
    const httpsUrl = `https://${httpsHost}:${HTTPS_PORT}${req.url}`
    console.log(`[HTTP → HTTPS] Redirecting to: ${httpsUrl}`)

    res.writeHead(301, {
      Location: httpsUrl
    })
    res.end()
  } else {
    // No HTTPS available, serve HTTP directly
    app(req, res)
  }
})

httpServer.listen(HTTP_PORT, () => {
  if (sslExists) {
    console.log('=================================')
    console.log('🌐 HTTP Server Started (Redirect Mode)')
    console.log('=================================')
    console.log(`✓ HTTP running on port ${HTTP_PORT}`)
    console.log(`✓ Redirecting to HTTPS port ${HTTPS_PORT}`)
  } else {
    console.log('=================================')
    console.log('🌐 HTTP Server Started (Development Mode)')
    console.log('=================================')
    console.log(`✓ HTTP running on port ${HTTP_PORT}`)
    console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`)
  }
  console.log(`✓ BigModel API: ${API_KEYS.BIGMODEL ? '✓ Configured' : '✗ Not configured'}`)
  console.log(`✓ DeepSeek API: ${API_KEYS.DEEPSEEK ? '✓ Configured' : '✗ Not configured'}`)
  console.log('=================================')
  console.log('\nAvailable endpoints:')
  console.log(`  HTTP:  http://localhost:${HTTP_PORT}/api/health`)
  if (sslExists) {
    console.log(`  HTTPS: https://localhost:${HTTPS_PORT}/api/health`)
  }
  console.log('=================================\n')
})

httpServer.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${HTTP_PORT} is already in use!`)
    console.error('Please stop the other process or use a different port')
  } else {
    console.error('❌ HTTP server error:', error)
  }
})

// ========== GRACEFUL SHUTDOWN ==========

const shutdown = () => {
  console.log('\n🛑 Shutting down gracefully...')

  httpServer.close(() => {
    console.log('✓ HTTP server closed')
  })

  if (httpsServer) {
    httpsServer.close(() => {
      console.log('✓ HTTPS server closed')
    })
  }

  setTimeout(() => {
    console.log('✓ Goodbye!')
    process.exit(0)
  }, 1000)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

module.exports = app
