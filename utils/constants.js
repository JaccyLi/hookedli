/**
 * Application Constants
 * Centralized configuration values
 */

// API Configuration
module.exports = {
  // AI Model Settings
  AI: {
    // Maximum tokens for different request types
    MAX_TOKENS_OUTLINE: 4096,
    MAX_TOKENS_EXPANSION: 4096,
    MAX_TOKENS_FULL_ARTICLE: 8192,

    // Request timeouts in milliseconds
    TIMEOUT_OUTLINE: 90000,
    TIMEOUT_EXPANSION: 60000,
    TIMEOUT_IMAGE: 60000,
    TIMEOUT_FULL_ARTICLE: 120000,

    // Model parameters
    TEMPERATURE: 0.8,
    TOP_P: 0.95,

    // Article structure
    DEFAULT_SECTION_COUNT: 3,
    MIN_SUBPARAGRAPHS: 4,
    MAX_SUBPARAGRAPHS: 6,
    MIN_SUBPARAGRAPH_SENTENCES: 4,
    MAX_SUBPARAGRAPH_SENTENCES: 8,

    // Image settings
    IMAGE_SIZE: '1024x1024',
    IMAGE_SIZE_SMALL: '512x512'
  },

  // UI Settings
  UI: {
    // Debounce delays
    DEBOUNCE_DELAY: 500,
    TOAST_DURATION_SHORT: 1500,
    TOAST_DURATION_MEDIUM: 2000,
    TOAST_DURATION_LONG: 2500,
    TOAST_DURATION_EXTRA_LONG: 3000,

    // Animation durations
    ANIMATION_DURATION_SHORT: 200,
    ANIMATION_DURATION_MEDIUM: 300,
    ANIMATION_DURATION_FAST: 50,

    // Scroll thresholds
    SCROLL_THRESHOLD_BUTTONS: 100,
    CATEGORY_SCROLL_POSITION: 600,

    // Swipe gestures
    SWIPE_THRESHOLD_NORMAL: 50,
    SWIPE_THRESHOLD_QUICK: 30,
    SWIPE_TIME_THRESHOLD: 300,
    MAX_DRAG_DISTANCE: 200,
    DRAG_OPACITY_DIVISOR: 400
  },

  // Validation
  VALIDATION: {
    // Input limits
    MAX_CATEGORY_INPUT_LENGTH: 100,
    MIN_API_KEY_LENGTH: 20,

    // Retry limits
    MAX_RETRY_ATTEMPTS: 1,
    MAX_FLASHCARD_RANDOM_ATTEMPTS: 50
  },

  // Rate Limiting
  RATE_LIMIT: {
    MAX_CONCURRENT_REQUESTS: 3,
    MAX_REQUESTS_PER_MINUTE: 20,
    RATE_LIMIT_WINDOW_MS: 60000,
    DEBOUNCE_DELAY_MS: 500
  },

  // Article Content
  ARTICLE: {
    MIN_TITLE_LENGTH: 50,
    MAX_TITLE_LENGTH: 100,
    MIN_WORD_COUNT: 500,
    MAX_WORD_COUNT: 800,
    SECTION_SUMMARY_MIN_WORDS: 5,
    SECTION_SUMMARY_MAX_WORDS: 10
  },

  // Flashcard Settings
  FLASHCARD: {
    TOTAL_COUNT: 168 // Total number of flashcards across all modules
  },

  // Storage Keys
  STORAGE_KEYS: {
    NAVIGATION_HISTORY: 'navigationHistory',
    SELECTED_MODEL: 'selectedModel',
    DEEPSEEK_API_KEY: 'deepseekApiKey',
    CUSTOM_GLM_API_KEY: 'customGlmApiKey',
    DEBUG_MODE: 'debugMode'
  },

  // Model Names
  MODELS: {
    GLM_4_7: 'glm-4.7',
    GLM_4_7_FLASH: 'glm-4.7-flash', // Fast variant for content expansion
    GLM_4_7_FLASHX: 'glm-4.7-flashx', // High-speed variant for framework generation
    DEEPSEEK_CHAT: 'deepseek-chat',
    DEEPSEEK_REASONER: 'deepseek-reasoner'
  },

  // Languages
  LANGUAGES: {
    ENGLISH: 'en',
    CHINESE: 'zh'
  }
}
