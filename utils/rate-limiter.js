/**
 * Rate Limiting and Debouncing Utility
 * Prevents API abuse and manages request queuing
 */

const logger = require('./logger.js')
const { RATE_LIMIT } = require('./constants.js')

/**
 * Request Queue Manager
 */
class RequestQueue {
  constructor(maxConcurrent = 3) {
    this.maxConcurrent = maxConcurrent
    this.currentRequests = 0
    this.queue = []
  }

  /**
   * Add a request to the queue
   * @param {Function} requestFn - Function that returns a promise
   * @returns {Promise} Request result
   */
  async add(requestFn) {
    // If under the limit, execute immediately
    if (this.currentRequests < this.maxConcurrent) {
      this.currentRequests++
      logger.log(`[RequestQueue] Executing immediately. Active: ${this.currentRequests}`)

      try {
        const result = await requestFn()
        return result
      } finally {
        this.currentRequests--
        this.processQueue()
      }
    } else {
      // Otherwise, add to queue
      logger.log(`[RequestQueue] Queuing request. Queue length: ${this.queue.length}`)
      return new Promise((resolve, reject) => {
        this.queue.push({
          requestFn,
          resolve,
          reject
        })
      })
    }
  }

  /**
   * Process queued requests
   */
  processQueue() {
    if (this.queue.length === 0 || this.currentRequests >= this.maxConcurrent) {
      return
    }

    const { requestFn, resolve, reject } = this.queue.shift()
    this.currentRequests++

    logger.log(`[RequestQueue] Processing from queue. Remaining: ${this.queue.length}, Active: ${this.currentRequests}`)

    requestFn()
      .then(resolve)
      .catch(reject)
      .finally(() => {
        this.currentRequests--
        this.processQueue()
      })
  }
}

/**
 * Debounce utility
 */
class Debouncer {
  constructor(delay = 500) {
    this.delay = delay
    this.timeoutId = null
  }

  /**
   * Execute function after delay, resetting delay on each call
   * @param {Function} fn - Function to debounce
   * @param {...any} args - Arguments to pass to function
   * @returns {Promise} Promise that resolves when function executes
   */
  execute(fn, ...args) {
    return new Promise((resolve, reject) => {
      // Clear previous timeout
      if (this.timeoutId) {
        clearTimeout(this.timeoutId)
      }

      // Set new timeout
      this.timeoutId = setTimeout(async () => {
        try {
          const result = await fn(...args)
          resolve(result)
        } catch (error) {
          reject(error)
        }
      }, this.delay)
    })
  }

  /**
   * Cancel pending execution
   */
  cancel() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }
  }

  /**
   * Execute immediately (skip debounce)
   * @param {Function} fn - Function to execute
   * @param {...any} args - Arguments to pass to function
   * @returns {Promise} Promise that resolves when function executes
   */
  async executeNow(fn, ...args) {
    this.cancel()
    return fn(...args)
  }
}

/**
 * Rate Limiter by time window
 */
class RateLimiter {
  constructor(maxRequests = 10, windowMs = 60000) {
    this.maxRequests = maxRequests
    this.windowMs = windowMs
    this.requests = []
  }

  /**
   * Check if request is allowed
   * @returns {boolean} True if request is allowed
   */
  canMakeRequest() {
    const now = Date.now()

    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs)

    // Check if under the limit
    if (this.requests.length < this.maxRequests) {
      this.requests.push(now)
      return true
    }

    return false
  }

  /**
   * Get time until next request is allowed
   * @returns {number} Milliseconds until next allowed request
   */
  getTimeUntilNextRequest() {
    const now = Date.now()
    this.requests = this.requests.filter(time => now - time < this.windowMs)

    if (this.requests.length < this.maxRequests) {
      return 0
    }

    const oldestRequest = this.requests[0]
    return oldestRequest + this.windowMs - now
  }

  /**
   * Reset the rate limiter
   */
  reset() {
    this.requests = []
  }
}

// Global instances
const globalRequestQueue = new RequestQueue(RATE_LIMIT.MAX_CONCURRENT_REQUESTS)
const globalDebouncer = new Debouncer(RATE_LIMIT.DEBOUNCE_DELAY_MS)
const globalRateLimiter = new RateLimiter(RATE_LIMIT.MAX_REQUESTS_PER_MINUTE, RATE_LIMIT.RATE_LIMIT_WINDOW_MS)

module.exports = {
  RequestQueue,
  Debouncer,
  RateLimiter,
  globalRequestQueue,
  globalDebouncer,
  globalRateLimiter
}
