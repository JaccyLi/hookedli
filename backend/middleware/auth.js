/**
 * WeChat Mini Program Authentication Middleware
 * Validates JWT tokens and manages user-specific rate limiting
 */

const jwt = require('jsonwebtoken')

// WeChat App credentials (from .env)
const WECHAT_APP_ID = process.env.WECHAT_APP_ID
const WECHAT_APP_SECRET = process.env.WECHAT_APP_SECRET
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'

// In-memory user rate limiting (production should use Redis)
const userRateLimits = new Map()

/**
 * Verify WeChat login code and get openid
 */
async function verifyWeChatCode(code) {
  try {
    const axios = require('axios')
    const url = 'https://api.weixin.qq.com/sns/jscode2session'

    const response = await axios.get(url, {
      params: {
        appid: WECHAT_APP_ID,
        secret: WECHAT_APP_SECRET,
        js_code: code,
        grant_type: 'authorization_code'
      }
    })

    const { openid, session_key, errcode, errmsg } = response.data

    if (errcode) {
      console.error('[WeChat Auth] Code verification failed:', errcode, errmsg)
      return null
    }

    return { openid, session_key }
  } catch (error) {
    console.error('[WeChat Auth] Code verification error:', error.message)
    return null
  }
}

/**
 * Generate JWT token for user
 */
function generateToken(openid) {
  return jwt.sign(
    { openid },
    JWT_SECRET,
    { expiresIn: '30d' } // Token valid for 30 days
  )
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    console.error('[Auth] Token verification failed:', error.message)
    return null
  }
}

/**
 * Check user-specific rate limit
 */
function checkUserRateLimit(openid, maxRequests = 20, windowMs = 60000) {
  const now = Date.now()
  const userData = userRateLimits.get(openid) || { requests: [], lastCleanup: now }

  // Clean old requests
  if (now - userData.lastCleanup > windowMs) {
    userData.requests = userData.requests.filter(ts => now - ts < windowMs)
    userData.lastCleanup = now
  }

  // Check limit
  if (userData.requests.length >= maxRequests) {
    const oldestRequest = Math.min(...userData.requests)
    const retryAfter = Math.ceil((oldestRequest + windowMs - now) / 1000)
    return { allowed: false, retryAfter }
  }

  // Add current request
  userData.requests.push(now)
  userRateLimits.set(openid, userData)

  return { allowed: true, retryAfter: 0 }
}

/**
 * Authentication middleware for protected routes
 */
function authenticate(req, res, next) {
  try {
    // Get token from Authorization header or query parameter
    const authHeader = req.headers.authorization
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : req.query.token

    if (!token) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please login first'
      })
    }

    // Verify token
    const decoded = verifyToken(token)
    if (!decoded || !decoded.openid) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Token expired or invalid'
      })
    }

    // Check rate limit for this user
    const rateLimit = checkUserRateLimit(decoded.openid, 20, 60000) // 20 requests per minute
    if (!rateLimit.allowed) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Too many requests. Try again in ${rateLimit.retryAfter} seconds.`,
        retryAfter: rateLimit.retryAfter
      })
    }

    // Attach user info to request
    req.user = { openid: decoded.openid }
    next()
  } catch (error) {
    console.error('[Auth] Authentication error:', error)
    res.status(500).json({ error: 'Authentication error' })
  }
}

/**
 * Optional authentication middleware (allows requests without auth, but adds user info if present)
 */
function optionalAuthenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : req.query.token

    if (token) {
      const decoded = verifyToken(token)
      if (decoded && decoded.openid) {
        req.user = { openid: decoded.openid }
      }
    }

    next()
  } catch (error) {
    // Continue without authentication
    next()
  }
}

/**
 * Cleanup old rate limit data periodically (every hour)
 */
setInterval(() => {
  const now = Date.now()
  const hourAgo = now - 3600000

  for (const [openid, data] of userRateLimits.entries()) {
    // Remove users with no recent activity
    if (data.lastCleanup < hourAgo) {
      userRateLimits.delete(openid)
    }
  }

  console.log(`[Auth] Cleanup: ${userRateLimits.size} active users tracked`)
}, 3600000) // Run every hour

module.exports = {
  verifyWeChatCode,
  generateToken,
  verifyToken,
  authenticate,
  optionalAuthenticate,
  checkUserRateLimit
}
