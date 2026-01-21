/**
 * Error Handling Utility
 * Centralized error handling with user-friendly messages
 */

const logger = require('./logger.js')

/**
 * Error types for categorization
 */
const ErrorTypes = {
  NETWORK: 'network',
  API: 'api',
  VALIDATION: 'validation',
  TIMEOUT: 'timeout',
  RATE_LIMIT: 'rate_limit',
  PARSE: 'parse',
  UNKNOWN: 'unknown'
}

/**
 * Error messages in both languages
 */
const ErrorMessages = {
  en: {
    [ErrorTypes.NETWORK]: 'Network connection failed. Please check your internet.',
    [ErrorTypes.API]: 'Service temporarily unavailable. Please try again.',
    [ErrorTypes.VALIDATION]: 'Invalid input. Please check and try again.',
    [ErrorTypes.TIMEOUT]: 'Request timed out. Please try again.',
    [ErrorTypes.RATE_LIMIT]: 'Too many requests. Please wait a moment.',
    [ErrorTypes.PARSE]: 'Data processing error. Please try again.',
    [ErrorTypes.UNKNOWN]: 'An error occurred. Please try again.'
  },
  zh: {
    [ErrorTypes.NETWORK]: '网络连接失败。请检查您的网络。',
    [ErrorTypes.API]: '服务暂时不可用。请重试。',
    [ErrorTypes.VALIDATION]: '输入无效。请检查后重试。',
    [ErrorTypes.TIMEOUT]: '请求超时。请重试。',
    [ErrorTypes.RATE_LIMIT]: '请求过多。请稍候。',
    [ErrorTypes.PARSE]: '数据处理错误。请重试。',
    [ErrorTypes.UNKNOWN]: '发生错误。请重试。'
  }
}

/**
 * Categorize error from error object or message
 * @param {Error|string} error - Error to categorize
 * @returns {string} Error type
 */
function categorizeError(error) {
  const errorMessage = error?.message || error || ''

  if (errorMessage.includes('network') || errorMessage.includes('connection') || errorMessage.includes('ENET')) {
    return ErrorTypes.NETWORK
  }
  if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
    return ErrorTypes.TIMEOUT
  }
  if (errorMessage.includes('rate limit') || errorMessage.includes('429') || errorMessage.includes('too many')) {
    return ErrorTypes.RATE_LIMIT
  }
  if (errorMessage.includes('parse') || errorMessage.includes('JSON') || errorMessage.includes('SyntaxError')) {
    return ErrorTypes.PARSE
  }
  if (errorMessage.includes('invalid') || errorMessage.includes('validation')) {
    return ErrorTypes.VALIDATION
  }
  if (errorMessage.includes('API') || errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.includes('500')) {
    return ErrorTypes.API
  }

  return ErrorTypes.UNKNOWN
}

/**
 * Get user-friendly error message
 * @param {Error|string} error - Error to format
 * @param {string} language - Language code ('en' or 'zh')
 * @returns {string} User-friendly error message
 */
function getErrorMessage(error, language = 'en') {
  const errorType = categorizeError(error)
  const messages = ErrorMessages[language] || ErrorMessages.en
  return messages[errorType] || messages[ErrorTypes.UNKNOWN]
}

/**
 * Handle error with logging and user notification
 * @param {Error|string} error - Error to handle
 * @param {string} context - Context where error occurred
 * @param {string} language - Language code
 * @param {Function} showToastFn - Function to show toast (optional)
 */
function handleError(error, context = '', language = 'en', showToastFn = null) {
  const errorType = categorizeError(error)
  const userMessage = getErrorMessage(error, language)

  // Log error with context
  logger.error(`[${context}] ${errorType.toUpperCase()}:`, error)

  // Show user-friendly message
  if (showToastFn && typeof showToastFn === 'function') {
    showToastFn({
      title: userMessage,
      icon: 'none',
      duration: 2500
    })
  }

  return {
    type: errorType,
    message: userMessage,
    originalError: error
  }
}

/**
 * Create a retry wrapper for async functions
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} delay - Delay between retries in ms
 * @returns {Function} Wrapped function with retry logic
 */
function withRetry(fn, maxRetries = 2, delay = 1000) {
  return async function(...args) {
    let lastError

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn(...args)
      } catch (error) {
        lastError = error
        const errorType = categorizeError(error)

        // Don't retry on validation errors
        if (errorType === ErrorTypes.VALIDATION) {
          throw error
        }

        // Log retry attempt
        if (attempt < maxRetries) {
          logger.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    throw lastError
  }
}

/**
 * Safe async wrapper that never rejects
 * @param {Promise} promise - Promise to wrap
 * @param {*} defaultValue - Default value on error
 * @returns {Promise<*>} Result or default value
 */
async function safeAsync(promise, defaultValue = null) {
  try {
    return await promise
  } catch (error) {
    logger.error('safeAsync caught error:', error)
    return defaultValue
  }
}

module.exports = {
  ErrorTypes,
  categorizeError,
  getErrorMessage,
  handleError,
  withRetry,
  safeAsync
}
