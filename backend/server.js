/**
 * HookedLee Backend Server
 * Securely proxies AI API requests and manages API keys
 */

require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const compression = require('compression')
const rateLimit = require('express-rate-limit')
const axios = require('axios')

const app = express()
const PORT = process.env.PORT || 3000

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
    }
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

// Proxy endpoint for GLM (BigModel) chat completions
app.post('/api/proxy/glm', async (req, res) => {
  try {
    if (!API_KEYS.BIGMODEL) {
      return res.status(400).json({
        error: 'BigModel API key not configured'
      })
    }

    const { model, messages, temperature, top_p, max_tokens, stream } = req.body

    const response = await axios.post(
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
        timeout: 120000
      }
    )

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
app.post('/api/proxy/deepseek', async (req, res) => {
  try {
    if (!API_KEYS.DEEPSEEK) {
      return res.status(400).json({
        error: 'DeepSeek API key not configured'
      })
    }

    const { model, messages, temperature, top_p, max_tokens, stream } = req.body

    const response = await axios.post(
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
        timeout: 120000
      }
    )

    res.json(response.data)
  } catch (error) {
    console.error('[DeepSeek Proxy Error]:', error.message)
    res.status(500).json({
      error: 'Failed to proxy request to DeepSeek API',
      details: error.response?.data || error.message
    })
  }
})

// Proxy endpoint for image generation (BigModel CogView)
app.post('/api/proxy/image', async (req, res) => {
  try {
    if (!API_KEYS.BIGMODEL) {
      return res.status(400).json({
        error: 'BigModel API key not configured'
      })
    }

    const { prompt, size } = req.body

    const response = await axios.post(
      'https://open.bigmodel.cn/api/paas/v4/images/generations',
      {
        model: 'cogview-3-flash',
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
    res.status(500).json({
      error: 'Failed to generate image',
      details: error.response?.data || error.message
    })
  }
})

// Unified proxy endpoint (routes to appropriate API based on model)
app.post('/api/proxy/chat', async (req, res) => {
  try {
    const { model } = req.body

    if (!model) {
      return res.status(400).json({
        error: 'Model is required'
      })
    }

    // Route to appropriate proxy
    if (model === 'glm-4.7') {
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

// ========== START SERVER ==========

app.listen(PORT, () => {
  console.log('=================================')
  console.log('🚀 HookedLee Backend Server')
  console.log('=================================')
  console.log(`✓ Server running on port ${PORT}`)
  console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`✓ BigModel API: ${API_KEYS.BIGMODEL ? '✓ Configured' : '✗ Not configured'}`)
  console.log(`✓ DeepSeek API: ${API_KEYS.DEEPSEEK ? '✓ Configured' : '✗ Not configured'}`)
  console.log('=================================')
  console.log('\nAvailable endpoints:')
  console.log('  GET  /api/health              - Health check')
  console.log('  GET  /api/models             - List available models')
  console.log('  POST /api/proxy/chat         - Unified chat proxy')
  console.log('  POST /api/proxy/glm          - GLM-4.7 chat')
  console.log('  POST /api/proxy/deepseek     - DeepSeek chat')
  console.log('  POST /api/proxy/image        - Image generation')
  console.log('=================================\n')
})

// ========== GRACEFUL SHUTDOWN ==========

process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received, shutting down gracefully...')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received, shutting down gracefully...')
  process.exit(0)
})

module.exports = app
