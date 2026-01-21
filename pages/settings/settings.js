Page({
  data: {
    selectedModel: 'deepseek-chat',
    language: 'en',
    backendUrl: '',
    backendConnected: false
  },

  onLoad() {
    // Enable sharing in production
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })

    const app = getApp()

    const savedModel = wx.getStorageSync('selectedModel')
    const savedLanguage = app.globalData.language || 'en'
    const savedBackendUrl = wx.getStorageSync('backendUrl') || app.globalData.apiConfig.backendUrl || ''

    this.setData({
      selectedModel: savedModel || 'deepseek-chat',
      language: savedLanguage,
      backendUrl: savedBackendUrl,
      backendConnected: false // Will test on load if URL exists
    })

    // Auto-test connection if backend URL is saved
    if (savedBackendUrl) {
      this.testBackendConnection()
    }
  },

  onBackendUrlInput(e) {
    const value = e.detail.value
    this.setData({
      backendUrl: value,
      backendConnected: false
    })
  },

  async testBackendConnection() {
    const { backendUrl, language } = this.data

    if (!backendUrl) {
      wx.showToast({
        title: language === 'en' ? 'Please enter backend URL' : '请输入后端地址',
        icon: 'none',
        duration: 2000
      })
      return
    }

    wx.showLoading({
      title: language === 'en' ? 'Testing...' : '测试中...',
      mask: true
    })

    try {
      const response = await wx.request({
        url: `${backendUrl}/api/health`,
        method: 'GET',
        timeout: 10000
      })

      wx.hideLoading()

      if (response.statusCode === 200) {
        // Save backend URL
        wx.setStorageSync('backendUrl', backendUrl)

        const app = getApp()
        app.globalData.apiConfig.backendUrl = backendUrl
        app.globalData.apiConfig.useBackendProxy = true

        this.setData({ backendConnected: true })

        wx.showToast({
          title: language === 'en' ? '✓ Backend connected!' : '✓ 后端已连接！',
          icon: 'success',
          duration: 2000
        })
      } else {
        this.setData({ backendConnected: false })
        wx.showToast({
          title: language === 'en' ? 'Backend error' : '后端错误',
          icon: 'none',
          duration: 2000
        })
      }
    } catch (error) {
      wx.hideLoading()
      this.setData({ backendConnected: false })
      wx.showToast({
        title: language === 'en' ? 'Connection failed' : '连接失败',
        icon: 'none',
        duration: 2000
      })
    }
  },

  onModelChange(e) {
    const model = e.detail.value
    this.setData({ selectedModel: model })

    const app = getApp()
    app.globalData.selectedModel = model
    wx.setStorageSync('selectedModel', model)

    const modelNames = {
      'glm-4.7': { en: 'Quality Search', zh: '质量搜索' },
      'deepseek-chat': { en: 'Fast Search', zh: '快速搜索' },
      'deepseek-reasoner': { en: 'Deep Search', zh: '深度搜索' }
    }

    wx.showToast({
      title: this.data.language === 'en' ? `Switched to ${modelNames[model].en}` : `已切换到${modelNames[model].zh}`,
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
