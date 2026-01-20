// Logger utility with debug mode support
// Usage:
//   logger.log('Message', data) - only logs in debug mode
//   logger.error('Error', error) - always logs errors
//   logger.warn('Warning', data) - always logs warnings

const logger = {
  // Check if debug mode is enabled
  isDebugEnabled() {
    const app = getApp()
    return app && app.globalData && app.globalData.debugMode
  },

  // Log only in debug mode
  log(...args) {
    if (this.isDebugEnabled()) {
      console.log('[DEBUG]', ...args)
    }
  },

  // Always log errors
  error(...args) {
    console.error('[ERROR]', ...args)
  },

  // Always log warnings
  warn(...args) {
    console.warn('[WARN]', ...args)
  },

  // Log info in debug mode
  info(...args) {
    if (this.isDebugEnabled()) {
      console.info('[INFO]', ...args)
    }
  }
}

module.exports = logger
