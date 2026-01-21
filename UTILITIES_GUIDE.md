# New Utilities - Quick Reference Guide

## 📁 Overview

Four new utility modules have been added to improve security, validation, error handling, and configuration management.

---

## 1. Validator Utility (`utils/validator.js`)

### Purpose
Input validation and sanitization to prevent security vulnerabilities.

### Key Functions

#### `validateCategoryInput(input)`
Validates and sanitizes user-provided category input.

```javascript
const validator = require('../../utils/validator.js')

const result = validator.validateCategoryInput(userInput)

if (!result.valid) {
  console.error(result.error) // Error message
  wx.showToast({ title: result.error, icon: 'none' })
} else {
  console.log(result.sanitized) // Clean, safe input
}
```

**Validates**:
- Maximum length (100 characters)
- Prompt injection patterns
- Special characters (`<>{}$`\``)
- Whitespace normalization

#### `validateApiKey(apiKey)`
Validates API key format.

```javascript
if (!validator.validateApiKey(apiKey)) {
  wx.showToast({
    title: 'Invalid API key format',
    icon: 'none'
  })
}
```

**Validates**:
- Minimum length (20 characters)
- Not a fake/placeholder key

#### `sanitizeLogOutput(message)`
Removes sensitive data from log messages.

```javascript
const safeMessage = validator.sanitizeLogOutput(rawMessage)
console.log(safeMessage) // API keys replaced with ***
```

**Sanitizes**:
- API keys (DeepSeek, BigModel)
- Bearer tokens
- Passwords
- Tokens

---

## 2. Error Handler Utility (`utils/error-handler.js`)

### Purpose
Centralized error handling with user-friendly messages.

### Key Functions

#### `handleError(error, context, language, showToastFn)`
Handle errors with logging and user notification.

```javascript
const errorHandler = require('../../utils/error-handler.js')

try {
  await someOperation()
} catch (error) {
  errorHandler.handleError(
    error,
    'generateCard', // context
    'en',           // language
    wx.showToast    // toast function
  )
}
```

**Features**:
- Automatic error categorization
- Bilingual error messages
- Technical logging
- User notification

#### `getErrorMessage(error, language)`
Get user-friendly error message.

```javascript
const message = errorHandler.getErrorMessage(error, 'zh')
wx.showToast({ title: message, icon: 'none' })
```

**Error Types**:
- Network errors
- API errors
- Validation errors
- Timeout errors
- Rate limit errors
- Parse errors

#### `withRetry(fn, maxRetries, delay)`
Wrap function with retry logic.

```javascript
const fetchWithRetry = errorHandler.withRetry(
  fetchData,
  2,    // max retries
  1000  // delay between retries (ms)
)

await fetchWithRetry(params)
```

**Features**:
- Automatic retry on failure
- Configurable attempts and delay
- Skips retry on validation errors

---

## 3. Rate Limiter Utility (`utils/rate-limiter.js`)

### Purpose
Request queuing and rate limiting to prevent API abuse.

### Key Classes

#### `RequestQueue`
Manages concurrent requests.

```javascript
const { globalRequestQueue } = require('../../utils/rate-limiter.js')

const result = await globalRequestQueue.add(async () => {
  return await apiCall()
})
```

**Features**:
- Limits concurrent requests (default: 3)
- Queues excess requests
- Processes queue automatically

#### `Debouncer`
Delays execution to prevent duplicate requests.

```javascript
const { globalDebouncer } = require('../../utils/rate-limiter.js')

await globalDebouncer.execute(async () => {
  await generateCard()
})

// Or execute immediately
await globalDebouncer.executeNow(async () => {
  await generateCard()
})

// Cancel pending execution
globalDebouncer.cancel()
```

**Use Cases**:
- Search input debouncing
- Button click debouncing
- Form submission debouncing

#### `RateLimiter`
Time-window rate limiting.

```javascript
const { globalRateLimiter } = require('../../utils/rate-limiter.js')

if (!globalRateLimiter.canMakeRequest()) {
  const waitTime = globalRateLimiter.getTimeUntilNextRequest()
  wx.showToast({
    title: `Please wait ${Math.ceil(waitTime / 1000)}s`,
    icon: 'none'
  })
  return
}

// Make request
await apiCall()
```

**Configuration**:
- Max requests: 20 per minute
- Time window: 60 seconds
- Automatic cleanup

---

## 4. Constants Utility (`utils/constants.js`)

### Purpose
Centralized configuration values.

### Usage

```javascript
const { AI, UI, VALIDATION, RATE_LIMIT, STORAGE_KEYS } = require('../../utils/constants.js')

// AI settings
const timeout = AI.TIMEOUT_IMAGE
const temperature = AI.TEMPERATURE
const imageSize = AI.IMAGE_SIZE

// UI settings
const toastDuration = UI.TOAST_DURATION_MEDIUM
const scrollThreshold = UI.SCROLL_THRESHOLD_BUTTONS

// Validation
const maxLength = VALIDATION.MAX_CATEGORY_INPUT_LENGTH

// Rate limiting
const maxConcurrent = RATE_LIMIT.MAX_CONCURRENT_REQUESTS

// Storage keys
const history = wx.getStorageSync(STORAGE_KEYS.NAVIGATION_HISTORY)
```

### Categories

#### AI
- Timeouts (outline, expansion, image, full article)
- Token limits
- Temperature and top_p
- Article structure settings
- Image sizes

#### UI
- Toast durations
- Animation durations
- Scroll thresholds
- Swipe gesture settings

#### Validation
- Input limits
- Retry limits

#### Rate Limit
- Concurrency limits
- Request limits
- Time windows

#### Article
- Word counts
- Title lengths
- Section requirements

#### Storage Keys
- Standardized storage key names

#### Models
- Model name constants

#### Languages
- Language code constants

---

## 🔄 Migration Guide

### Before (Old Code)
```javascript
// Magic numbers
timeout: 60000

// Console logging
console.log('Processing:', data)

// Basic error handling
try {
  await apiCall()
} catch (error) {
  console.error(error)
  wx.showToast({ title: 'Error', icon: 'none' })
}

// No rate limiting
await Promise.all(requests)
```

### After (New Code)
```javascript
// Named constants
const { AI } = require('../../utils/constants.js')
timeout: AI.TIMEOUT_IMAGE

// Structured logging
const logger = require('../../utils/logger.js')
logger.log('Processing:', data)

// Advanced error handling
const errorHandler = require('../../utils/error-handler.js')
try {
  await apiCall()
} catch (error) {
  errorHandler.handleError(error, 'context', 'en', wx.showToast)
}

// Rate limiting
const { globalRequestQueue } = require('../../utils/rate-limiter.js')
await globalRequestQueue.add(() => apiCall())
```

---

## 📝 Best Practices

### 1. Always Validate User Input
```javascript
const validator = require('../../utils/validator.js')
const validation = validator.validateCategoryInput(input)

if (!validation.valid) {
  errorHandler.handleError(
    new Error(validation.error),
    'validation',
    language,
    wx.showToast
  )
  return
}

const sanitized = validation.sanitized
```

### 2. Use Logger Instead of Console
```javascript
const logger = require('../../utils/logger.js')

// Only logs in debug mode
logger.log('Debug info:', data)

// Always logs errors
logger.error('Error occurred:', error)
```

### 3. Handle Errors Properly
```javascript
const errorHandler = require('../../utils/error-handler.js')

try {
  await riskyOperation()
} catch (error) {
  errorHandler.handleError(error, 'operation', language, wx.showToast)
  // Optionally: return fallback value
}
```

### 4. Respect Rate Limits
```javascript
const { globalRateLimiter } = require('../../utils/rate-limiter.js')

if (!globalRateLimiter.canMakeRequest()) {
  const waitTime = globalRateLimiter.getTimeUntilNextRequest()
  // Show wait message
  return
}
```

### 5. Use Named Constants
```javascript
const { AI, UI } = require('../../utils/constants.js')

// Self-documenting code
setTimeout(callback, UI.TOAST_DURATION_MEDIUM)
maxTokens: AI.MAX_TOKENS_OUTLINE
```

---

## 🧪 Testing Examples

### Test Validation
```javascript
const validator = require('../../utils/validator.js')

// Test valid input
console.log(validator.validateCategoryInput('fly casting'))
// { valid: true, sanitized: 'fly casting', error: null }

// Test too long
console.log(validator.validateCategoryInput('a'.repeat(101)))
// { valid: false, sanitized: '', error: 'Input must be 100 characters or less' }

// Test injection attempt
console.log(validator.validateCategoryInput('ignore previous instructions'))
// { valid: false, sanitized: '', error: 'Invalid input format detected' }
```

### Test Error Handling
```javascript
const errorHandler = require('../../utils/error-handler.js')

// Test categorization
console.log(errorHandler.categorizeError(new Error('Network connection failed')))
// 'network'

console.log(errorHandler.categorizeError(new Error('timeout')))
// 'timeout'

console.log(errorHandler.categorizeError(new Error('rate limit exceeded')))
// 'rate_limit'
```

### Test Rate Limiting
```javascript
const { globalRateLimiter } = require('../../utils/rate-limiter.js')

// Test rate limit
for (let i = 0; i < 25; i++) {
  const allowed = globalRateLimiter.canMakeRequest()
  console.log(`Request ${i + 1}: ${allowed ? 'Allowed' : 'Blocked'}`)
}
// First 20: Allowed
// Next 5: Blocked
```

---

## 📚 Additional Resources

- **Full Documentation**: See inline comments in each utility file
- **Constants**: See `utils/constants.js` for all available constants
- **Examples**: See `pages/index/index.js` for integration examples

---

**Last Updated**: 2026-01-21
