/**
 * API Key Security Manager
 * Provides obfuscation and rate limiting for client-side API key storage
 *
 * SECURITY WARNING: Client-side API keys can NEVER be truly secure.
 * This module provides basic obfuscation and rate limiting as mitigation.
 *
 * For production, use a backend proxy server.
 */

const logger = require('./logger.js')

// Rate limiting storage
const rateLimitStore = {
  requests: {}, // { timestamp1, timestamp2, ... }
  lastCleanup: Date.now()
}

// Rate limit configuration
const RATE_LIMIT = {
  MAX_REQUESTS_PER_MINUTE: 20,
  MAX_REQUESTS_PER_HOUR: 100,
  WINDOW_MS: 60000 // 1 minute
}

/**
 * Simple XOR obfuscation (NOT encryption, just obscures plain text)
 * This prevents casual viewing but won't stop reverse engineering
 */
function encodeKey(key) {
  try {
    const xorKey = 0x42
    return Buffer.from(key).map((b, i) => b ^ xorKey ^ (i % 256)).toString('base64')
  } catch (error) {
    logger.error('[APIKeyManager] Encode failed:', error)
    return ''
  }
}

function decodeKey(encoded) {
  try {
    const xorKey = 0x42
    const buf = Buffer.from(encoded, 'base64')
    return buf.map((b, i) => b ^ xorKey ^ (i % 256)).toString()
  } catch (error) {
    logger.error('[APIKeyManager] Decode failed:', error)
    return ''
  }
}

/**
 * Check if rate limit would be exceeded
 * @returns {Object} { allowed: boolean, retryAfter: number }
 */
function checkRateLimit() {
  const now = Date.now()

  // Clean up old requests (older than 1 hour)
  if (now - rateLimitStore.lastCleanup > 3600000) {
    rateLimitStore.requests = rateLimitStore.requests.filter(ts => now - ts < 3600000)
    rateLimitStore.lastCleanup = now
  }

  // Count requests in last minute
  const recentRequests = rateLimitStore.requests.filter(ts => now - ts < RATE_LIMIT.WINDOW_MS)

  if (recentRequests.length >= RATE_LIMIT.MAX_REQUESTS_PER_MINUTE) {
    const oldestRequest = Math.min(...recentRequests)
    const retryAfter = Math.ceil((oldestRequest + RATE_LIMIT.WINDOW_MS - now) / 1000)
    return { allowed: false, retryAfter }
  }

  // Count requests in last hour
  if (rateLimitStore.requests.length >= RATE_LIMIT.MAX_REQUESTS_PER_HOUR) {
    return { allowed: false, retryAfter: 3600 }
  }

  return { allowed: true, retryAfter: 0 }
}

/**
 * Record an API request for rate limiting
 */
function recordRequest() {
  rateLimitStore.requests.push(Date.now())
}

/**
 * Get API key with rate limiting check
 * @param {string} keyType - 'bigmodel' or 'deepseek'
 * @returns {Object} { key: string, error: string }
 */
function getApiKey(keyType) {
  // Check rate limit first
  const limitCheck = checkRateLimit()
  if (!limitCheck.allowed) {
    return {
      key: null,
      error: `Rate limit exceeded. Try again in ${limitCheck.retryAfter} seconds.`
    }
  }

  try {
    const storageKey = keyType === 'bigmodel' ? 'customGlmApiKey' : 'deepseekApiKey'
    const encodedKey = wx.getStorageSync(storageKey)

    if (!encodedKey) {
      return { key: null, error: `No ${keyType} API key configured` }
    }

    const decodedKey = decodeKey(encodedKey)

    // Validate key format
    if (!decodedKey || decodedKey.length < 20) {
      return { key: null, error: 'Invalid API key format' }
    }

    // Record this request
    recordRequest()

    return { key: decodedKey, error: null }
  } catch (error) {
    logger.error('[APIKeyManager] Get key failed:', error)
    return { key: null, error: 'Failed to retrieve API key' }
  }
}

/**
 * Save API key (obfuscated)
 * @param {string} keyType - 'bigmodel' or 'deepseek'
 * @param {string} key - Plain text API key
 * @returns {boolean} Success
 */
function saveApiKey(keyType, key) {
  try {
    const encodedKey = encodeKey(key)
    const storageKey = keyType === 'bigmodel' ? 'customGlmApiKey' : 'deepseekApiKey'
    wx.setStorageSync(storageKey, encodedKey)
    logger.log(`[APIKeyManager] Saved ${keyType} key`)
    return true
  } catch (error) {
    logger.error('[APIKeyManager] Save key failed:', error)
    return false
  }
}

/**
 * Clear API key
 */
function clearApiKey(keyType) {
  try {
    const storageKey = keyType === 'bigmodel' ? 'customGlmApiKey' : 'deepseekApiKey'
    wx.removeStorageSync(storageKey)
    logger.log(`[APIKeyManager] Cleared ${keyType} key`)
    return true
  } catch (error) {
    logger.error('[APIKeyManager] Clear key failed:', error)
    return false
  }
}

/**
 * Get rate limit status
 */
function getRateLimitStatus() {
  const now = Date.now()
  const recentRequests = rateLimitStore.requests.filter(ts => now - ts < RATE_LIMIT.WINDOW_MS)
  const hourlyRequests = rateLimitStore.requests.length

  return {
    requestsLastMinute: recentRequests.length,
    requestsLastHour: hourlyRequests,
    limitPerMinute: RATE_LIMIT.MAX_REQUESTS_PER_MINUTE,
    limitPerHour: RATE_LIMIT.MAX_REQUESTS_PER_HOUR,
    resetTime: recentRequests.length > 0 ? Math.min(...recentRequests) + RATE_LIMIT.WINDOW_MS : now
  }
}

module.exports = {
  encodeKey,
  decodeKey,
  getApiKey,
  saveApiKey,
  clearApiKey,
  checkRateLimit,
  getRateLimitStatus
}
