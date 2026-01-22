Page({
  data: {
    selectedModel: 'default',
    language: 'en'
  },

  onLoad() {
    // Enable sharing in production
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })

    const app = getApp()

    // Map internal model to simplified UI options
    const savedModel = wx.getStorageSync('selectedModel')
    // 'high-quality' → High Quality mode (Reasoner outline, Chat sections)
    // 'default' or anything else → Default mode (All Chat)
    const uiModel = savedModel === 'high-quality' ? 'high-quality' : 'default'

    const savedLanguage = app.globalData.language || 'en'

    this.setData({
      selectedModel: uiModel,
      language: savedLanguage
    })
  },

  onModelChange(e) {
    const uiModel = e.detail.value
    this.setData({ selectedModel: uiModel })

    const app = getApp()

    // Map UI option back to internal model
    // 'default' → all DeepSeek-Chat
    // 'high-quality' → Reasoner for outline, Chat for sections
    const internalModel = uiModel // Store 'default' or 'high-quality' directly

    app.globalData.selectedModel = internalModel
    wx.setStorageSync('selectedModel', internalModel)

    const modelNames = {
      'default': { en: 'Standard Search', zh: '标准搜索' },
      'high-quality': { en: 'Premium Search', zh: '高级搜索' }
    }

    wx.showToast({
      title: this.data.language === 'en' ? `Switched to ${modelNames[uiModel].en}` : `已切换到${modelNames[uiModel].zh}`,
      icon: 'success',
      duration: 2000
    })
  },

  goBack() {
    wx.navigateBack()
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
