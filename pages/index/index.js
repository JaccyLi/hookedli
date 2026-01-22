const bigModelModule = require('../../utils/bigmodel.js')
const categoriesModule = require('../../utils/categories.js')
const backendClient = require('../../utils/backend-client.js')
const flashcardsModule = require('./flashcards/fly-fishing-flashcards.js')
const flyCastingFlashcardsModule = require('./flashcards/fly_casting_flashcards.js')
const distanceCastingFlashcardsModule = require('./flashcards/distance_casting_flashcards.js')
const slacklinePresentationFlashcardsModule = require('./flashcards/slackline_presentation_flashcards.js')
const articlesList = require('../articles/articles-list.js')
const logger = require('../../utils/logger.js')
const validator = require('../../utils/validator.js')
const errorHandler = require('../../utils/error-handler.js')
const { globalDebouncer, globalRateLimiter } = require('../../utils/rate-limiter.js')

const generateArticleOutline = bigModelModule.generateArticleOutline
const expandSection = bigModelModule.expandSection
const generateImagesForParagraphs = bigModelModule.generateImagesForParagraphs
const generateHeroImage = bigModelModule.generateHeroImage
const generateImage = bigModelModule.generateImage

const categories = categoriesModule.categories
const categoryLabels = categoriesModule.categoryLabels

// Merge all flashcard sources
const flashcards = [
  ...flashcardsModule.flashcards,
  ...flyCastingFlashcardsModule.flashcards,
  ...distanceCastingFlashcardsModule.flashcards,
  ...slacklinePresentationFlashcardsModule.flashcards
]

const i18n = {
  en: {
    title: 'HookedLee',
    subtitle: 'Search and discover fly fishing knowledge',
    generateBtn: 'Search',
    searching: 'Searching...',
    cancelBtn: 'Cancel',
    cancelling: 'Cancelling...',
    cancelled: 'Search cancelled',
    backBtn: '← Back',
    nextBtn: 'Next',
    loadingText: 'Searching for relevant articles...',
    errorText: 'Search failed. Please try again.',
    emptyText: 'Enter a topic to search',
    filterLabel: 'Category:',
    placeholderCategory: 'Enter topic to search...',
    copyArticle: 'Copy Article',
    jokeBtn: 'Flashcard Q&A 🎯',
    showAnswer: 'Show Answer',
    hideAnswer: 'Hide Answer',
    question: 'Question',
    answer: 'Answer',
    categories: categories.en,
    categoryLabels: categoryLabels.en
  },
  zh: {
    title: 'HookedLee',
    subtitle: '搜索并发现飞钓知识',
    generateBtn: '搜索',
    searching: '搜索中...',
    cancelBtn: '取消',
    cancelling: '取消中...',
    cancelled: '已取消搜索',
    backBtn: '← 返回',
    nextBtn: '下一个',
    loadingText: '正在搜索相关文章...',
    errorText: '搜索失败，请重试',
    emptyText: '输入主题开始搜索',
    filterLabel: '分类：',
    placeholderCategory: '输入主题搜索...',
    copyArticle: '复制文章',
    jokeBtn: '闪卡问答 🎯',
    showAnswer: '显示答案',
    hideAnswer: '隐藏答案',
    question: '问题',
    answer: '答案',
    categories: categories.zh,
    categoryLabels: categoryLabels.zh
  }
}

Page({
  data: {
    cardData: null,
    loading: false,
    error: null,
    selectedCategory: 'all',
    customCategory: '',
    navigationHistory: [],
    currentArticleIndex: -1,
    hasPreviousArticle: false,
    hasNextArticle: false,
    language: 'en',
    uiText: {},
    loadingText: '',
    shouldCancel: false,
    showTipsCard: false,
    currentTipIndex: 0,
    lastTipIndex: -1,
    flashcards: [],
    showFloatingButtons: false,
    flashcardCategories: {},
    currentFlashcardCategory: {
      key: 'casting',
      color: '#FF6B6B',
      icon: '🎯',
      label: 'CASTING'
    },
    showAnswer: false,
    cardTranslateX: 0,
    cardOpacity: 1,
    articleCount: 0
  },

  onLoad() {
    // Enable sharing in production
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })

    const app = getApp()
    const savedLanguage = app.globalData.language || 'en'

    const navigationHistory = wx.getStorageSync('navigationHistory') || []
    const articleCount = articlesList.getArticleCount()

    this.setData({
      language: savedLanguage,
      loadingText: i18n[savedLanguage].loadingText,
      navigationHistory: navigationHistory,
      currentArticleIndex: navigationHistory.length - 1,
      articleCount: articleCount
    })

    this.updateUIText()
    this.initializeFlashcardCategories()
  },

  onPageScroll(e) {
    // Show floating buttons when scrolling down
    if (e.scrollTop > 100) {
      if (!this.data.showFloatingButtons) {
        this.setData({
          showFloatingButtons: true
        })
      }
    } else {
      if (this.data.showFloatingButtons) {
        this.setData({
          showFloatingButtons: false
        })
      }
    }
  },

  initializeFlashcardCategories() {
    const categoryMap = {
      'casting': { color: '#FF6B6B', icon: '🎯', label: { en: 'CASTING', zh: '抛投' } },
      'equipment': { color: '#4ECDC4', icon: '🎣', label: { en: 'GEAR', zh: '装备' } },
      'techniques': { color: '#95E1D3', icon: '🪰', label: { en: 'TECHNIQUE', zh: '技巧' } },
      'knots': { color: '#F38181', icon: '🪢', label: { en: 'KNOTS', zh: '绳结' } },
      'flies': { color: '#AA96DA', icon: '🦋', label: { en: 'FLIES', zh: '毛钩' } },
      'etiquette': { color: '#FCBAD3', icon: '🤝', label: { en: 'ETIQUETTE', zh: '礼仪' } },
      'reading': { color: '#FFFFD2', icon: '👀', label: { en: 'READING', zh: '读水' } },
      'conservation': { color: '#A8E6CF', icon: '🌿', label: { en: 'CONSERVE', zh: '保护' } },
      'distance': { color: '#FFD93D', icon: '📏', label: { en: 'DISTANCE', zh: '距离' } },
      'presentation': { color: '#6BCB77', icon: '🎨', label: { en: 'PRESENTATION', zh: '呈现' } }
    }

    this.setData({
      flashcardCategories: categoryMap
    })
  },

  getFlashcardCategory(questionText) {
    const text = questionText.toLowerCase()

    // Check both English and Chinese keywords
    const castingKeywords = ['cast', 'rod', 'haul', 'loop', '抛投', '竿', '线环', '拉']
    const equipmentKeywords = ['line', 'leader', 'tippet', 'rod weight', '主线', '前导线', '子线', '竿重']
    const techniquesKeywords = ['nymph', 'dry fly', 'streamer', 'wet fly', '若虫', '干毛钩', '毛式流苏', '湿毛钩']
    const knotsKeywords = ['knot', 'tie', '结', '绑制']
    const fliesKeywords = ['pattern', 'hatch', 'insect', 'fly pattern', '样式', '孵化', '昆虫', '毛钩样式']
    const etiquetteKeywords = ['other angler', 'courteous', 'space', 'respect', '其他钓者', '礼貌', '空间', '尊重']
    const readingKeywords = ['water', 'current', 'pool', 'riffle', 'seam', '水', '水流', '深潭', '急流', '水流边缘']
    const conservationKeywords = ['release', 'handle', 'survival', 'catch and release', '放流', '处理', '存活', '钓获放流']
    const distanceKeywords = ['distance', 'feet', 'yards', 'length', 'far', 'long', 'stroke', 'drift', 'body', '距离', '英尺', '码', '长度', '远', '行程', '身体']
    const presentationKeywords = ['slack', 'dump', 'wiggle', 'mend', 'reach', 'tuck', 'drag', 'drift', 'curve', '松线', '堆积', '摆动', '控线', '伸展', '扎入', '拖拽', '曲线']

    if (distanceKeywords.some(keyword => text.includes(keyword))) {
      return 'distance'
    } else if (presentationKeywords.some(keyword => text.includes(keyword))) {
      return 'presentation'
    } else if (castingKeywords.some(keyword => text.includes(keyword))) {
      return 'casting'
    } else if (equipmentKeywords.some(keyword => text.includes(keyword))) {
      return 'equipment'
    } else if (techniquesKeywords.some(keyword => text.includes(keyword))) {
      return 'techniques'
    } else if (knotsKeywords.some(keyword => text.includes(keyword))) {
      return 'knots'
    } else if (fliesKeywords.some(keyword => text.includes(keyword))) {
      return 'flies'
    } else if (etiquetteKeywords.some(keyword => text.includes(keyword))) {
      return 'etiquette'
    } else if (readingKeywords.some(keyword => text.includes(keyword))) {
      return 'reading'
    } else if (conservationKeywords.some(keyword => text.includes(keyword))) {
      return 'conservation'
    }

    return 'casting' // default
  },

  updateUIText() {
    const lang = this.data.language
    this.setData({
      uiText: i18n[lang]
    })
  },

  toggleLanguage() {
    const newLanguage = this.data.language === 'en' ? 'zh' : 'en'
    this.setData({ language: newLanguage })

    const app = getApp()
    app.globalData.language = newLanguage
    this.updateUIText()

    wx.showToast({
      title: newLanguage === 'en' ? 'Switched to English' : '已切换到中文',
      icon: 'success',
      duration: 1000
    })
  },

  goToSettings() {
    wx.navigateTo({
      url: '/pages/settings/settings'
    })
  },

  goToArticles() {
    wx.navigateTo({
      url: '/pages/articles/articles'
    })
  },

  scrollToCategories() {
    wx.pageScrollTo({
      scrollTop: 600,
      duration: 300
    })
  },

  selectCategory(e) {
    const category = e.currentTarget.dataset.category
    logger.log('[selectCategory] Selected predefined category:', category)

    // Clear custom input when selecting a predefined category
    this.setData({
      selectedCategory: category,
      customCategory: ''  // Clear custom input
    })

    logger.log('[selectCategory] customCategory cleared')
  },

  cancelGeneration() {
    this.setData({
      shouldCancel: true,
      loading: false,
      loadingText: this.data.language === 'en' ? i18n[this.data.language].cancelled : i18n[this.data.language].cancelled
    })

    wx.showToast({
      title: this.data.language === 'en' ? i18n[this.data.language].cancelled : i18n[this.data.language].cancelled,
      icon: 'none',
      duration: 2000
    })
  },

  generateJoke() {
    logger.log('[generateJoke] ========== START ==========')
    logger.log('[generateJoke] Current lastTipIndex:', this.data.lastTipIndex)
    logger.log('[generateJoke] Current currentTipIndex:', this.data.currentTipIndex)

    try {
      const cards = flashcards || []
      logger.log('[generateJoke] Loaded flashcards count:', cards.length)

      if (cards.length === 0) {
        logger.error('[generateJoke] No flashcards found in data')
        wx.showToast({
          title: this.data.language === 'en' ? 'No flashcards available' : '没有可用闪卡',
          icon: 'none'
        })
        return
      }

      // Only one card exists, just show it
      if (cards.length === 1) {
        logger.log('[generateJoke] Only 1 card, showing index 0')
        this.setData({
          showTipsCard: true,
          currentTipIndex: 0,
          lastTipIndex: 0,
          flashcards: cards,
          showAnswer: false
        }, () => {
          this.updateFlashcardStyle()
        })
        return
      }

      // Keep selecting random index until we get a different card from the last one
      let randomIndex
      let attempts = 0
      const maxAttempts = 50 // Increased attempts for better randomness

      do {
        randomIndex = Math.floor(Math.random() * cards.length)
        logger.log(`[generateJoke] Attempt ${attempts + 1}: Generated random index ${randomIndex}`)
        attempts++
      } while (randomIndex === this.data.lastTipIndex && attempts < maxAttempts)

      logger.log('[generateJoke] ========== FINAL RESULT ==========')
      logger.log('[generateJoke] Selected random flashcard index:', randomIndex)
      logger.log('[generateJoke] Previous index was:', this.data.lastTipIndex)
      logger.log('[generateJoke] Attempts needed:', attempts)

      this.setData({
        showTipsCard: true,
        currentTipIndex: randomIndex,
        lastTipIndex: randomIndex,
        flashcards: cards,
        showAnswer: false
      }, () => {
        logger.log('[generateJoke] setData completed, currentTipIndex is now:', this.data.currentTipIndex)
        this.updateFlashcardStyle()
      })
    } catch (error) {
      logger.error('[generateJoke] Error loading flashcards:', error)
      wx.showToast({
        title: this.data.language === 'en' ? 'Error loading flashcards' : '加载闪卡失败',
        icon: 'none'
      })
    }
  },

  closeTipsCard() {
    this.setData({
      showTipsCard: false,
      showAnswer: false
    })
  },

  toggleAnswer() {
    this.setData({
      showAnswer: !this.data.showAnswer
    })
  },

  stopPropagation() {
    // Prevent event from bubbling to overlay
  },

  handleTouchStart(e) {
    if (!this.data.showTipsCard) return
    this.setData({
      touchStartX: e.touches[0].pageX,
      touchStartTime: Date.now()
    })
  },

  handleTouchMove(e) {
    if (!this.data.showTipsCard) return

    const currentX = e.touches[0].pageX
    const diff = currentX - this.data.touchStartX

    // Limit the drag distance
    const maxDrag = 200
    const translateX = Math.max(-maxDrag, Math.min(maxDrag, diff))

    // Calculate opacity based on drag distance
    const opacity = 1 - Math.abs(translateX) / 400

    this.setData({
      cardTranslateX: translateX,
      cardOpacity: opacity
    })
  },

  handleTouchEnd(e) {
    if (!this.data.showTipsCard) return

    const touchEndX = e.changedTouches[0].pageX
    const touchStartX = this.data.touchStartX
    const diff = touchEndX - touchStartX
    const touchDuration = Date.now() - this.data.touchStartTime

    // Reset card position first
    this.setData({
      cardTranslateX: 0,
      cardOpacity: 1
    })

    // Swipe threshold (50px) OR quick swipe with less distance
    const isQuickSwipe = touchDuration < 300 && Math.abs(diff) > 30
    const isNormalSwipe = Math.abs(diff) > 50

    if (isQuickSwipe || isNormalSwipe) {
      if (diff > 0) {
        // Swipe right - previous tip
        this.showPreviousTip()
      } else {
        // Swipe left - next tip
        this.showNextTip()
      }
    }
  },

  showPreviousTip() {
    const newIndex = this.data.currentTipIndex > 0
      ? this.data.currentTipIndex - 1
      : this.data.flashcards.length - 1

    // Animate card out to the right
    this.setData({
      cardTranslateX: 100,
      cardOpacity: 0
    })

    setTimeout(() => {
      this.setData({
        currentTipIndex: newIndex,
        cardTranslateX: -100,
        cardOpacity: 0,
        showAnswer: false
      })

      this.updateFlashcardStyle()

      // Animate card in from the left
      setTimeout(() => {
        this.setData({
          cardTranslateX: 0,
          cardOpacity: 1
        })
      }, 50)
    }, 200)
  },

  showNextTip() {
    const newIndex = this.data.currentTipIndex < this.data.flashcards.length - 1
      ? this.data.currentTipIndex + 1
      : 0

    // Animate card out to the left
    this.setData({
      cardTranslateX: -100,
      cardOpacity: 0
    })

    setTimeout(() => {
      this.setData({
        currentTipIndex: newIndex,
        cardTranslateX: 100,
        cardOpacity: 0,
        showAnswer: false
      })

      this.updateFlashcardStyle()

      // Animate card in from the right
      setTimeout(() => {
        this.setData({
          cardTranslateX: 0,
          cardOpacity: 1
        })
      }, 50)
    }, 200)
  },

  updateFlashcardStyle() {
    if (!this.data.flashcards.length) return

    const card = this.data.flashcards[this.data.currentTipIndex]
    const questionText = this.data.language === 'en' ? card.question.en : card.question.zh
    const categoryKey = this.getFlashcardCategory(questionText)
    const category = this.data.flashcardCategories[categoryKey]

    this.setData({
      currentFlashcardCategory: {
        key: categoryKey,
        color: category.color,
        icon: category.icon,
        label: category.label[this.data.language]
      }
    })
  },

  onCategoryInput(e) {
    const value = e.detail.value
    logger.log('[onCategoryInput] Input received:', value)

    // Validate input
    const validation = validator.validateCategoryInput(value)

    if (!validation.valid) {
      logger.warn('[onCategoryInput] Invalid input:', validation.error)

      // Show warning but don't block typing (just sanitize)
      if (value.length > 100) {
        wx.showToast({
          title: this.data.language === 'en'
            ? 'Input too long (max 100 chars)'
            : '输入过长（最多100个字符）',
          icon: 'none',
          duration: 2000
        })
        return
      }
    }

    // Use sanitized input
    const sanitizedValue = validation.valid ? validation.sanitized : value
    this.setData({
      customCategory: sanitizedValue
    })
  },

  clearCustomCategory() {
    logger.log('[clearCustomCategory] Clearing custom input')
    this.setData({
      customCategory: ''
    })
  },

  goBackToPrevious() {
    const navigationHistory = this.data.navigationHistory
    const currentArticleIndex = this.data.currentArticleIndex

    if (currentArticleIndex <= 0) {
      logger.log('[Navigation] No previous articles')
      return
    }

    const prevIndex = currentArticleIndex - 1
    const prevArticle = navigationHistory[prevIndex]

    this.setData({
      cardData: prevArticle,
      currentArticleIndex: prevIndex,
      hasPreviousArticle: prevIndex > 0,
      hasNextArticle: navigationHistory.length > prevIndex
    })
  },

  goBackToNext() {
    const navigationHistory = this.data.navigationHistory
    const currentArticleIndex = this.data.currentArticleIndex

    if (currentArticleIndex >= navigationHistory.length - 1) {
      logger.log('[Navigation] No next articles')
      return
    }
    
    const nextIndex = currentArticleIndex + 1
    const nextArticle = navigationHistory[nextIndex]
    
    this.setData({
      cardData: nextArticle,
      currentArticleIndex: nextIndex,
      hasPreviousArticle: nextIndex > 0,
      hasNextArticle: navigationHistory.length > nextIndex
    })
  },

  addToNavigationHistory(article) {
    const newNavigationHistory = this.data.navigationHistory.slice(0)
    newNavigationHistory.push(article)
    wx.setStorageSync('navigationHistory', newNavigationHistory)
  },

  async generateCard() {
    logger.log('[generateCard] Called')

    if (this.data.loading) {
      logger.warn('[generateCard] Already loading, ignoring request')
      return
    }

    // Check rate limit
    if (!globalRateLimiter.canMakeRequest()) {
      const waitTime = Math.ceil(globalRateLimiter.getTimeUntilNextRequest() / 1000)
      wx.showToast({
        title: this.data.language === 'en'
          ? `Please wait ${waitTime}s before trying again`
          : `请等待${waitTime}秒后重试`,
        icon: 'none',
        duration: 2500
      })
      return
    }

    const app = getApp()
    const apiKey = app.globalData.bigModelApiKey

    // Skip API key validation if backend proxy is enabled
    // Backend manages API keys securely
    const useBackend = backendClient.isBackendEnabled()

    if (!useBackend && !validator.validateApiKey(apiKey)) {
      logger.error('[generateCard] Invalid API key and no backend configured')
      wx.showToast({
        title: this.data.language === 'en'
          ? 'Please configure API key in settings'
          : '请在设置中配置API密钥',
        icon: 'none',
        duration: 3000
      })
      return
    }

    logger.log('[generateCard] Using backend:', useBackend)

    if (this.data.shouldCancel) {
      this.setData({
        shouldCancel: false
      })
      return
    }

    if (this.data.cardData) {
      this.addToNavigationHistory(this.data.cardData)
    }

    const isEn = this.data.language === 'en'
    const self = this

    this.setData({
      loading: true,
      error: null,
      showJoke: false,
      jokeText: '',
      loadingTitle: isEn ? 'Searching Articles' : '正在搜索文章',
      loadingStep: isEn ? 'Searching database...' : '搜索数据库中...',
      loadingTip: isEn ? 'Finding relevant content' : '查找相关内容',
      loadingDetail: ''
    })

    logger.log('[generateCard] Category Selection:', {
      selectedCategory: this.data.selectedCategory,
      customCategory: this.data.customCategory
    })

    const categoryToUse = this.data.customCategory ? this.data.customCategory : this.data.selectedCategory

    // Validate category input
    const validation = validator.validateCategoryInput(categoryToUse)
    if (!validation.valid) {
      logger.error('[generateCard] Invalid category:', validation.error)
      self.setData({
        error: validation.error,
        loading: false
      })

      wx.showToast({
        title: self.data.language === 'en' ? validation.error : '输入无效',
        icon: 'none',
        duration: 2000
      })
      return
    }

    try {
      const selectedModel = app.globalData.selectedModel || 'deepseek-chat'
      const apiKeys = {
        glmApiKey: app.globalData.bigModelApiKey,
        deepseekApiKey: app.globalData.deepseekApiKey
      }

      logger.log('[Model] Using:', selectedModel)

      this.setData({
        loadingStep: isEn ? 'Finding results...' : '查找结果中...',
        loadingTip: isEn ? 'Matching articles' : '匹配文章',
        loadingDetail: ''
      })

      const outline = await generateArticleOutline(
        categoryToUse,
        apiKey,
        this.data.language,
        (progress) => {
          if (self.data.shouldCancel) return

          logger.log('[Progress]', progress)

          self.setData({
            loadingStep: progress.message,
            loadingDetail: progress.detail
          })
        },
        selectedModel,
        apiKeys
      )

      if (this.data.shouldCancel) {
        return
      }

      this.setData({
        loadingStep: isEn ? 'Compiling content...' : '编译内容中...',
        loadingTip: isEn ? 'Gathering information' : '收集信息',
        loadingDetail: isEn ? `Retrieving details...` : `获取详细信息...`
      })

      // Step 1: Expand all 5 sections sequentially (one at a time) to avoid rate limiting
      logger.log('[generateCard] Starting sequential expansion of', outline.sections.length, 'sections')

      const expandedSections = []

      for (let index = 0; index < outline.sections.length; index++) {
        if (self.data.shouldCancel) break

        const section = outline.sections[index]
        logger.log(`[generateCard] Expanding section ${index + 1}/${outline.sections.length}:`, section.title)

        // Update progress UI
        this.setData({
          loadingDetail: isEn ? `Expanding section ${index + 1}/${outline.sections.length}...` : `正在扩展第 ${index + 1}/${outline.sections.length} 章节...`
        })

        // Assign model based on user selection
        let sectionModel
        if (selectedModel === 'deepseek-reasoner') {
          // High quality mode: Use DeepSeek-Reasoner for all sections
          sectionModel = 'deepseek-reasoner'
          logger.log(`[generateCard] Section ${index + 1} using: DeepSeek-Reasoner (high quality mode)`)
        } else {
          // Default mode: Fixed model assignment for 3 sections
          if (index === 0) {
            // Section 1: DeepSeek-Reasoner (highest quality for first section)
            sectionModel = 'deepseek-reasoner'
            logger.log(`[generateCard] Section ${index + 1} using: DeepSeek-Reasoner (default mode)`)
          } else if (index === 1) {
            // Section 2: DeepSeek-Chat (fast and good quality)
            sectionModel = 'deepseek-chat'
            logger.log(`[generateCard] Section ${index + 1} using: DeepSeek-Chat (default mode)`)
          } else {
            // Section 3: GLM-4.7 (reliable quality)
            sectionModel = 'glm-4.7'
            logger.log(`[generateCard] Section ${index + 1} using: GLM-4.7 (default mode)`)
          }
        }

        try {
          const expandedSection = await expandSection(section, apiKey, self.data.language, sectionModel, apiKeys)
          logger.log(`[generateCard] Section ${index + 1} expanded, subParagraphs count:`, expandedSection.subParagraphs?.length || 0)
          expandedSections.push({ index, expandedSection })
        } catch (error) {
          logger.error(`[generateCard] Section ${index + 1} expansion failed:`, error)
          // Return fallback section with summary only
          expandedSections.push({
            index,
            expandedSection: {
              intro: section.summary,
              subParagraphs: [],
              imageUrl: ''
            }
          })
        }
      }

      logger.log('[generateCard] All sections expanded sequentially')

      // Step 2: Generate all images sequentially (one at a time) to avoid rate limiting
      this.setData({
        loadingStep: isEn ? 'Loading images...' : '加载图片中...',
        loadingTip: isEn ? 'Fetching visual content' : '获取视觉内容',
        loadingDetail: isEn ? 'Loading images for all sections...' : '加载所有章节图片...'
      })

      const paragraphs = []

      // Generate section images one at a time
      for (let i = 0; i < expandedSections.length; i++) {
        if (self.data.shouldCancel) break

        const { index, expandedSection } = expandedSections[i]
        this.setData({
          loadingDetail: isEn ? `Generating image ${i + 1}/${expandedSections.length}...` : `正在生成第 ${i + 1}/${expandedSections.length} 张图片...`
        })

        let imageUrl = ''
        try {
          imageUrl = await generateImage(outline.sections[index].imagePrompt, apiKey)
          logger.log(`[Section ${index + 1}] Image generated`)
        } catch (error) {
          logger.error(`[Section ${index + 1}] Image generation failed:`, error)
        }

        const finalSection = Object.assign({}, expandedSection, {
          imageUrl: imageUrl
        })
        logger.log(`[generateCard] Section ${index + 1} final subParagraphs count:`, finalSection.subParagraphs?.length || 0)
        paragraphs.push(finalSection)
      }

      // Generate hero image
      this.setData({
        loadingDetail: isEn ? 'Generating hero image...' : '正在生成封面图...'
      })

      const heroImageUrl = await generateHeroImage(outline.title, outline.originalCategory, apiKey)
      if (heroImageUrl) {
        logger.log('[generateCard] Hero image generated')
      } else {
        logger.warn('[generateCard] Hero image generation failed, continuing without it')
      }

      logger.log('[generateCard] All sections processed sequentially')
      logger.log('[generateCard] Total paragraphs count:', paragraphs.length)
      paragraphs.forEach((para, index) => {
        logger.log(`[generateCard] Final paragraph ${index + 1} subParagraphs count:`, para.subParagraphs?.length || 0)
      })

      if (self.data.shouldCancel) {
        return
      }

      this.setData({
        loadingStep: isEn ? 'Preparing results...' : '准备结果中...',
        loadingDetail: ''
      })

      const cardData = {
        title: outline.title,
        paragraphs: paragraphs,
        references: outline.references || [],
        category: outline.category,
        imageUrl: heroImageUrl || '',
        source: 'Article',
        timestamp: new Date().toISOString()
      }

      logger.log('[generateCard] cardData created')
      logger.log('[generateCard] cardData.paragraphs count:', cardData.paragraphs.length)
      cardData.paragraphs.forEach((para, index) => {
        logger.log(`[generateCard] cardData paragraph ${index + 1}:`, {
          introLength: para.intro?.length || 0,
          subParagraphsCount: para.subParagraphs?.length || 0,
          hasImageUrl: !!para.imageUrl
        })
      })

      if (!self.data.shouldCancel) {
        this.addToNavigationHistory(cardData)
        self.setData({
          cardData: cardData
        })

        wx.showToast({
          title: this.data.language === 'en' ? 'Article written!' : '文章已写好！',
          icon: 'success',
          duration: 2000
        })
      }
    } catch (err) {
      if (self.data.shouldCancel) {
        return
      }

      // Handle error with proper categorization and user messaging
      errorHandler.handleError(err, 'generateCard', self.data.language, wx.showToast)

      self.setData({
        error: errorHandler.getErrorMessage(err, self.data.language)
      })
    } finally {
      self.setData({
        loading: false,
        shouldCancel: false
      })
    }
  },

  copyArticle() {
    if (!this.data.cardData) {
      return
    }

    const cardData = this.data.cardData
    let articleText = ''

    articleText += `${cardData.title}\nCategory: ${cardData.category}\n\n`

    if (cardData.imageUrl) {
      articleText += `Hero Image: ${cardData.imageUrl}\n\n`
    }

    if (cardData.paragraphs && cardData.paragraphs.length > 0) {
      cardData.paragraphs.forEach((para, index) => {
        articleText += `--- Section ${index + 1} ---\n`
        articleText += `${para.intro}\n`

        if (para.imageUrl) {
          articleText += `Image: ${para.imageUrl}\n\n`
        }

        if (para.subParagraphs && para.subParagraphs.length > 0) {
          para.subParagraphs.forEach(sub => {
            articleText += `• ${sub}\n`
          })
        }

        articleText += '\n'
      })
    }

    if (cardData.references && cardData.references.length > 0) {
      articleText += '--- References ---\n'
      cardData.references.forEach(ref => {
        articleText += `${ref.title}\n${ref.url}\n\n`
      })
    }

    articleText += `\nWritten by HookedLee`

    wx.setClipboardData({
      data: articleText,
      success: () => {
        wx.showToast({
          title: this.data.language === 'en' ? 'Article copied!' : '文章已复制！',
          icon: 'success',
          duration: 2000
        })
      },
      fail: () => {
        wx.showToast({
          title: this.data.language === 'en' ? 'Copy failed' : '复制失败',
          icon: 'none'
        })
      }
    })
  },

  copyUrl(e) {
    const url = e.currentTarget.dataset.url
    wx.setClipboardData({
      data: url,
      success: () => {
        wx.showToast({
          title: this.data.language === 'en' ? 'URL copied!' : '链接已复制！',
          icon: 'success',
          duration: 2000
        })
      },
      fail: () => {
        wx.showToast({
          title: this.data.language === 'en' ? 'Copy failed' : '复制失败',
          icon: 'none'
        })
      }
    })
  },

  scrollToTop() {
    wx.pageScrollTo({
      scrollTop: 0,
      duration: 300
    })
  },

  onShareAppMessage() {
    const language = this.data.language || 'en'
    return {
      title: language === 'en' ? 'HookedLee - Your Fly Fishing Knowledge Base' : 'HookedLee - 你的飞钓知识库',
      path: '/pages/index/index',
      imageUrl: '/images/share-cover.jpg'
    }
  },

  onShareTimeline() {
    const language = this.data.language || 'en'
    return {
      title: language === 'en' ? 'HookedLee - Your Fly Fishing Knowledge Base' : 'HookedLee - 你的飞钓知识库',
      imageUrl: '/images/share-cover.jpg',
      query: ''
    }
  }
})
