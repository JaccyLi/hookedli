/**
 * Backend Client Utility
 * Handles communication with the backend server
 */

const logger = require('./logger.js')

// Health status cache
let healthCheckCache = {
  isHealthy: null,
  lastCheck: 0,
  cacheDuration: 60000 // 60 seconds cache
}

/**
 * Get backend URL from app configuration
 * @returns {string} Backend URL
 */
function getBackendUrl() {
  const app = getApp()

  // Try to get from storage first
  const storedUrl = wx.getStorageSync('backendUrl')
  if (storedUrl) {
    logger.log('[Backend] Using stored URL:', storedUrl)
    return storedUrl
  }

  // Fall back to app config
  if (app.globalData.apiConfig.useBackendProxy && app.globalData.apiConfig.backendUrl) {
    logger.log('[Backend] Using app config URL:', app.globalData.apiConfig.backendUrl)
    return app.globalData.apiConfig.backendUrl
  }

  logger.log('[Backend] No backend URL configured')
  // Return empty if not configured
  return ''
}

/**
 * Check if backend is configured
 * Only checks if URL is configured, not health status
 * Health failures are handled by fallback logic in bigmodel.js
 * @returns {boolean} True if backend is configured
 */
function isBackendEnabled() {
  const url = getBackendUrl()
  const enabled = url && url.length > 0
  logger.log('[Backend] isBackendEnabled:', enabled, 'URL:', url)
  return enabled
}

/**
 * Update health check cache
 * @param {boolean} isHealthy - Whether backend is healthy
 */
function updateHealthCache(isHealthy) {
  healthCheckCache.isHealthy = isHealthy
  healthCheckCache.lastCheck = Date.now()
  logger.log('[Backend] Health cache updated:', { isHealthy, timestamp: new Date().toISOString() })
}

/**
 * Invalidate health check cache (call when backend configuration changes)
 */
function invalidateHealthCache() {
  healthCheckCache.isHealthy = null
  healthCheckCache.lastCheck = 0
  logger.log('[Backend] Health cache invalidated')
}

/**
 * Make request to backend
 * @param {string} endpoint - API endpoint (e.g., '/api/proxy/chat')
 * @param {Object} data - Request data
 * @param {string} method - HTTP method
 * @returns {Promise<Object>} Response data
 */
function makeBackendRequest(endpoint, data = {}, method = 'POST') {
  return new Promise((resolve, reject) => {
    const backendUrl = getBackendUrl()

    if (!backendUrl) {
      reject(new Error('Backend not configured. Please configure backend URL in settings.'))
      updateHealthCache(false)
      return
    }

    const url = `${backendUrl}${endpoint}`

    logger.log('[Backend] Request:', { url, method, data })

    wx.request({
      url: url,
      method: method,
      data: data,
      header: {
        'Content-Type': 'application/json'
      },
      timeout: 120000,
      success: (response) => {
        logger.log('[Backend] Response:', { status: response.statusCode, data: response.data })

        if (response.statusCode === 200) {
          updateHealthCache(true)
          resolve(response.data)
        } else {
          updateHealthCache(false)
          reject(new Error(response.data.error || `Backend error: ${response.statusCode}`))
        }
      },
      fail: (error) => {
        logger.error('[Backend] Request failed:', error)
        updateHealthCache(false)
        reject(new Error(error.errMsg || 'Network error'))
      }
    })
  })
}

/**
 * Test backend connection
 * @returns {Promise<boolean>} True if connection successful
 */
async function testConnection() {
  try {
    const backendUrl = getBackendUrl()
    if (!backendUrl) {
      return false
    }

    const response = await new Promise((resolve, reject) => {
      wx.request({
        url: `${backendUrl}/api/health`,
        method: 'GET',
        timeout: 10000,
        success: resolve,
        fail: reject
      })
    })

    return response.statusCode === 200
  } catch (error) {
    logger.error('[Backend] Connection test failed:', error)
    return false
  }
}

/**
 * Get available models from backend
 * @returns {Promise<Array>} List of available models
 */
async function getAvailableModels() {
  try {
    const result = await makeBackendRequest('/api/models', {}, 'GET')
    return result.models || []
  } catch (error) {
    logger.error('[Backend] Failed to get models:', error)
    return []
  }
}

/**
 * Generate article outline via backend
 * @param {Object} params - Generation parameters
 * @returns {Promise<Object>} Generated outline
 */
async function generateArticleOutline(params) {
  return makeBackendRequest('/api/proxy/chat', {
    model: params.model,
    messages: params.messages,
    temperature: params.temperature || 0.8,
    top_p: params.top_p || 0.95,
    max_tokens: params.max_tokens || 4096,
    stream: false
  })
}

/**
 * Expand section via backend
 * @param {Object} params - Expansion parameters
 * @returns {Promise<Object>} Expanded section
 */
async function expandSection(params) {
  return makeBackendRequest('/api/proxy/chat', {
    model: params.model,
    messages: params.messages,
    temperature: params.temperature || 0.8,
    top_p: params.top_p || 0.95,
    max_tokens: params.max_tokens || 4096,
    stream: false
  })
}

/**
 * Generate image via backend
 * @param {string} prompt - Image generation prompt
 * @param {string} size - Image size
 * @param {boolean} isHero - Whether this is a hero image (uses GLM-Image model)
 * @returns {Promise<string>} Image URL
 */
async function generateImage(prompt, size = '1024x1024', isHero = false) {
  const result = await makeBackendRequest('/api/proxy/image', {
    prompt: prompt,
    size: size,
    isHero: isHero
  })

  if (result.data && result.data.length > 0) {
    return result.data[0].url
  }

  throw new Error('Failed to generate image')
}

module.exports = {
  getBackendUrl,
  isBackendEnabled,
  makeBackendRequest,
  testConnection,
  getAvailableModels,
  generateArticleOutline,
  expandSection,
  generateImage,
  updateHealthCache,
  invalidateHealthCache
}
