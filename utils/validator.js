/**
 * Input Validation Utility
 * Prevents prompt injection and validates user inputs
 */

/**
 * Validate and sanitize user-provided category input
 * @param {string} input - User input for category
 * @returns {Object} { valid: boolean, sanitized: string, error: string }
 */
function validateCategoryInput(input) {
  if (!input || typeof input !== 'string') {
    return {
      valid: false,
      sanitized: '',
      error: 'Input must be a non-empty string'
    }
  }

  const trimmed = input.trim()

  // Length validation
  if (trimmed.length === 0) {
    return {
      valid: false,
      sanitized: '',
      error: 'Input cannot be empty'
    }
  }

  if (trimmed.length > 100) {
    return {
      valid: false,
      sanitized: '',
      error: 'Input must be 100 characters or less'
    }
  }

  // Check for prompt injection patterns
  const injectionPatterns = [
    /ignore\s+(previous|all)\s+(instructions?|commands?)/i,
    /disregard\s+(previous|all)\s+(instructions?|commands?)/i,
    /forget\s+(previous|all)\s+(instructions?|commands?)/i,
    /override\s+(previous|all)\s+(instructions?|commands?)/i,
    /new\s+(instructions?|commands?)/i,
    /\b(system\s+prompt|assistant\s+instructions?)\b/i,
    /\bjailbreak\b/i,
    /\bdan\b/i, // DAN mode
    /<\|(.*?)\|>/, // Special token injection
    /\{\{(.*?)\}\}/, // Template injection
    /`{3,}/, // Code block injection attempt
    /\${(.*?)}/ // Template literal injection
  ]

  for (const pattern of injectionPatterns) {
    if (pattern.test(trimmed)) {
      return {
        valid: false,
        sanitized: '',
        error: 'Invalid input format detected'
      }
    }
  }

  // Sanitize: Remove special characters that could manipulate prompts
  // Keep only safe characters: letters, numbers, spaces, hyphens, and common punctuation
  const sanitized = trimmed
    .replace(/[<>{}$`]/g, '') // Remove dangerous characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()

  return {
    valid: true,
    sanitized: sanitized,
    error: null
  }
}

/**
 * Validate API key format
 * @param {string} apiKey - API key to validate
 * @returns {boolean} True if valid format
 */
function validateApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') {
    return false
  }

  const trimmed = apiKey.trim()

  // Basic format validation
  // Most API keys are 20+ characters with alphanumeric and some special chars
  if (trimmed.length < 20) {
    return false
  }

  // Check for obviously fake keys
  const fakePatterns = [
    /^(your-api-key-here|api-key|sk-xxxxxxxx|test-key|dummy-key)/i,
    /^\*+$/
  ]

  for (const pattern of fakePatterns) {
    if (pattern.test(trimmed)) {
      return false
    }
  }

  return true
}

/**
 * Validate language code
 * @param {string} language - Language code (en, zh)
 * @returns {boolean} True if valid
 */
function validateLanguage(language) {
  const validLanguages = ['en', 'zh']
  return validLanguages.includes(language)
}

/**
 * Validate model selection
 * @param {string} model - Model name
 * @returns {boolean} True if valid
 */
function validateModel(model) {
  const validModels = ['glm-4.7', 'deepseek-chat', 'deepseek-reasoner']
  return validModels.includes(model)
}

/**
 * Sanitize log output to prevent sensitive data leakage
 * @param {string} message - Log message to sanitize
 * @returns {string} Sanitized message
 */
function sanitizeLogOutput(message) {
  if (!message || typeof message !== 'string') {
    return ''
  }

  // Remove potential API keys from logs
  const sanitized = message
    .replace(/sk-[a-zA-Z0-9-]+/g, 'sk-***') // DeepSeek keys
    .replace(/[a-f0-9]{32}\.[a-zA-Z0-9]+/g, '***.***') // BigModel keys
    .replace(/Bearer\s+[^\s]+/g, 'Bearer ***') // Bearer tokens
    .replace(/password[=:][^\s]+/gi, 'password=***') // Passwords
    .replace(/token[=:][^\s]+/gi, 'token=***') // Tokens

  return sanitized
}

/**
 * Validate URL before making requests
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid URL
 */
function validateUrl(url) {
  if (!url || typeof url !== 'string') {
    return false
  }

  try {
    const parsed = new URL(url)
    // Only allow HTTPS
    if (parsed.protocol !== 'https:') {
      return false
    }
    // Block private IPs
    if (parsed.hostname === 'localhost' || /^127\./.test(parsed.hostname)) {
      return false
    }
    return true
  } catch (e) {
    return false
  }
}

module.exports = {
  validateCategoryInput,
  validateApiKey,
  validateLanguage,
  validateModel,
  sanitizeLogOutput,
  validateUrl
}
