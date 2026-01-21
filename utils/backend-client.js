/**
 * Backend Client Utility
 * Handles communication with the backend server
 */

const logger = require('./logger.js')

/**
 * Get backend URL from app configuration
 * @returns {string} Backend URL
 */
function getBackendUrl() {
  const app = getApp()

  // Try to get from storage first
  const storedUrl = wx.getStorageSync('backendUrl')
  if (storedUrl) {
    return storedUrl
  }

  // Fall back to app config
  if (app.globalData.apiConfig.useBackendProxy && app.globalData.apiConfig.backendUrl) {
    return app.globalData.apiConfig.backendUrl
  }

  // Return empty if not configured
  return ''
}

/**
 * Check if backend proxy is enabled
 * @returns {boolean} True if backend is configured
 */
function isBackendEnabled() {
  const url = getBackendUrl()
  return url && url.length > 0
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
          resolve(response.data)
        } else {
          reject(new Error(response.data.error || `Backend error: ${response.statusCode}`))
        }
      },
      fail: (error) => {
        logger.error('[Backend] Request failed:', error)
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
 * @returns {Promise<string>} Image URL
 */
async function generateImage(prompt, size = '1024x1024') {
  const result = await makeBackendRequest('/api/proxy/image', {
    prompt: prompt,
    size: size
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
  generateImage
}
