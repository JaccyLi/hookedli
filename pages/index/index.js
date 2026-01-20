const bigModelModule = require('../../utils/bigmodel.js')
const categoriesModule = require('../../utils/categories.js')
const flashcardsModule = require('./flashcards/fly-fishing-flashcards.js')
const flyCastingFlashcardsModule = require('./flashcards/fly_casting_flashcards.js')
const distanceCastingFlashcardsModule = require('./flashcards/distance_casting_flashcards.js')
const slacklinePresentationFlashcardsModule = require('./flashcards/slackline_presentation_flashcards.js')
const articlesList = require('../articles/articles-list.js')

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
    subtitle: 'Discover fly fishing tips, techniques & more',
    generateBtn: 'Generate New Article',
    generating: 'Writing...',
    cancelBtn: 'Cancel',
    cancelling: 'Cancelling...',
    cancelled: 'Generation cancelled',
    backBtn: '← Back',
    nextBtn: 'Next',
    loadingText: 'Writing your article...',
    errorText: 'Failed to generate article. Please try again.',
    emptyText: 'Tap button below to generate a new article',
    filterLabel: 'Category:',
    placeholderCategory: 'Enter custom topic...',
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
    subtitle: '一键生成文章-解锁各种飞钓技巧',
    generateBtn: '生成新文章',
    generating: '写作中...',
    cancelBtn: '取消',
    cancelling: '取消中...',
    cancelled: '已取消',
    backBtn: '← Back',
    nextBtn: 'Next',
    loadingText: '正在为您撰写文章...',
    errorText: '生成文章失败，请重试',
    emptyText: '点击下方按钮生成新文章',
    filterLabel: '分类：',
    placeholderCategory: '输入自定义主题...',
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
    console.log('[selectCategory] Selected predefined category:', category)

    // Clear custom input when selecting a predefined category
    this.setData({
      selectedCategory: category,
      customCategory: ''  // Clear custom input
    })

    console.log('[selectCategory] customCategory cleared')
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
    console.log('[generateJoke] ========== START ==========')
    console.log('[generateJoke] Current lastTipIndex:', this.data.lastTipIndex)
    console.log('[generateJoke] Current currentTipIndex:', this.data.currentTipIndex)

    try {
      const cards = flashcards || []
      console.log('[generateJoke] Loaded flashcards count:', cards.length)

      if (cards.length === 0) {
        console.error('[generateJoke] No flashcards found in data')
        wx.showToast({
          title: this.data.language === 'en' ? 'No flashcards available' : '没有可用闪卡',
          icon: 'none'
        })
        return
      }

      // Only one card exists, just show it
      if (cards.length === 1) {
        console.log('[generateJoke] Only 1 card, showing index 0')
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
        console.log(`[generateJoke] Attempt ${attempts + 1}: Generated random index ${randomIndex}`)
        attempts++
      } while (randomIndex === this.data.lastTipIndex && attempts < maxAttempts)

      console.log('[generateJoke] ========== FINAL RESULT ==========')
      console.log('[generateJoke] Selected random flashcard index:', randomIndex)
      console.log('[generateJoke] Previous index was:', this.data.lastTipIndex)
      console.log('[generateJoke] Attempts needed:', attempts)

      this.setData({
        showTipsCard: true,
        currentTipIndex: randomIndex,
        lastTipIndex: randomIndex,
        flashcards: cards,
        showAnswer: false
      }, () => {
        console.log('[generateJoke] setData completed, currentTipIndex is now:', this.data.currentTipIndex)
        this.updateFlashcardStyle()
      })
    } catch (error) {
      console.error('[generateJoke] Error loading flashcards:', error)
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
    console.log('=== onCategoryInput ===')
    console.log('[1] Input received:', value)
    console.log('[2] Current customCategory:', this.data.customCategory)

    // Don't update selectedCategory when user types custom input
    // Only update customCategory
    this.setData({
      customCategory: value
    }, () => {
      console.log('[3] After setData customCategory:', this.data.customCategory)
    })

    console.log('[4] selectedCategory remains:', this.data.selectedCategory)
    console.log('=====================')
  },

  clearCustomCategory() {
    console.log('[clearCustomCategory] Clearing custom input')
    this.setData({
      customCategory: ''
    })
  },

  goBackToPrevious() {
    const navigationHistory = this.data.navigationHistory
    const currentArticleIndex = this.data.currentArticleIndex

    if (currentArticleIndex <= 0) {
      console.log('[Navigation] No previous articles')
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
      console.log('[Navigation] No next articles')
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
    console.log('=== generateCard called ===')

    if (this.data.loading) {
      return
    }

    console.log('selectedCategory:', this.data.selectedCategory)
    const app = getApp()
    const apiKey = app.globalData.bigModelApiKey

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
      loadingTitle: isEn ? 'Writing Your Article' : '正在为您撰写文章',
      loadingStep: isEn ? 'Brainstorming...' : '构思中...',
      loadingTip: isEn ? 'Planning content' : '规划内容',
      loadingDetail: ''
    })

    console.log('=== Category Selection ===')
    console.log('selectedCategory:', this.data.selectedCategory)
    console.log('customCategory:', this.data.customCategory)

    const categoryToUse = this.data.customCategory ? this.data.customCategory : this.data.selectedCategory

    console.log('categoryToUse (FINAL):', categoryToUse)
    console.log('======================')

    try {
      const selectedModel = app.globalData.selectedModel || 'deepseek-chat'
      const apiKeys = {
        glmApiKey: app.globalData.bigModelApiKey,
        deepseekApiKey: app.globalData.deepseekApiKey
      }

      console.log('[Model] Using:', selectedModel)

      this.setData({
        loadingStep: isEn ? 'Drafting outline...' : '草拟大纲中...',
        loadingTip: isEn ? 'Structuring article' : '构建文章结构',
        loadingDetail: ''
      })

      const outline = await generateArticleOutline(
        categoryToUse,
        apiKey,
        this.data.language,
        (progress) => {
          if (self.data.shouldCancel) return

          console.log('[Progress]', progress)

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
        loadingStep: isEn ? 'Writing sections...' : '撰写章节...',
        loadingTip: isEn ? 'Creating detailed content' : '创建详细内容',
        loadingDetail: isEn ? `Using ${selectedModel} - Writing content...` : `使用 ${selectedModel} - 正在撰写内容...`
      })

      // Step 1: Expand all section content in parallel
      const expansionPromises = outline.sections.map(async (section, index) => {
        console.log(`[generateCard] Expanding section ${index + 1}:`, section.title)
        const expandedSection = await expandSection(section, apiKey, self.data.language, selectedModel, apiKeys)
        console.log(`[generateCard] Section ${index + 1} expanded, subParagraphs count:`, expandedSection.subParagraphs?.length || 0)
        return { index, expandedSection }
      })

      const expandedSections = await Promise.all(expansionPromises)
      console.log('[generateCard] All sections expanded')

      // Step 2: Generate all images in parallel
      this.setData({
        loadingStep: isEn ? 'Generating images...' : '生成图片...',
        loadingTip: isEn ? 'Creating visual content' : '创建视觉内容',
        loadingDetail: isEn ? 'Generating images for all sections...' : '为所有章节生成图片...'
      })

      const imagePromises = expandedSections.map(async ({ index, expandedSection }) => {
        let imageUrl = ''
        try {
          imageUrl = await generateImage(outline.sections[index].imagePrompt, apiKey)
          console.log(`[Section ${index + 1}] Image generated`)
        } catch (error) {
          console.error(`[Section ${index + 1}] Image generation failed:`, error)
        }

        const finalSection = Object.assign({}, expandedSection, {
          imageUrl: imageUrl
        })
        console.log(`[generateCard] Section ${index + 1} final subParagraphs count:`, finalSection.subParagraphs?.length || 0)
        return finalSection
      })

      const heroImagePromise = generateHeroImage(outline.title, outline.originalCategory, apiKey)

      const [paragraphs, heroImageUrl] = await Promise.all([
        Promise.all(imagePromises),
        heroImagePromise
      ])

      console.log('[generateCard] All sections processed')
      console.log('[generateCard] Total paragraphs count:', paragraphs.length)
      paragraphs.forEach((para, index) => {
        console.log(`[generateCard] Final paragraph ${index + 1} subParagraphs count:`, para.subParagraphs?.length || 0)
      })

      if (self.data.shouldCancel) {
        return
      }

      this.setData({
        loadingStep: isEn ? 'Assembling article...' : '整合文章...',
        loadingDetail: ''
      })

      const cardData = {
        title: outline.title,
        paragraphs: paragraphs,
        references: outline.references || [],
        category: outline.category,
        imageUrl: heroImageUrl || '',
        source: 'Generated by AI',
        timestamp: new Date().toISOString()
      }

      console.log('[generateCard] cardData created')
      console.log('[generateCard] cardData.paragraphs count:', cardData.paragraphs.length)
      cardData.paragraphs.forEach((para, index) => {
        console.log(`[generateCard] cardData paragraph ${index + 1}:`, {
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
      console.error('Generate card error:', err)
      self.setData({
        error: this.data.language === 'en' ? 'Failed to generate article. Please try again.' : '生成文章失败，请重试。'
      })

      wx.showToast({
        title: this.data.language === 'en' ? 'Writing failed' : '写作失败',
        icon: 'error',
        duration: 2000
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
  }
})
