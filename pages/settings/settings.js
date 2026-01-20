Page({
  data: {
    selectedModel: 'deepseek-chat',
    language: 'en',
    debugMode: false
  },

  onLoad() {
    const app = getApp()

    const savedModel = wx.getStorageSync('selectedModel')
    const savedLanguage = app.globalData.language || 'en'
    const savedDebugMode = wx.getStorageSync('debugMode') || false

    this.setData({
      selectedModel: savedModel || 'deepseek-chat',
      language: savedLanguage,
      debugMode: savedDebugMode
    })
  },

  onModelChange(e) {
    const model = e.detail.value
    this.setData({ selectedModel: model })

    const app = getApp()
    app.globalData.selectedModel = model
    wx.setStorageSync('selectedModel', model)

    const modelNames = {
      'glm-4.7': { en: 'GLM-4.7', zh: 'GLM-4.7' },
      'deepseek-chat': { en: 'DeepSeek-Chat', zh: 'DeepSeek-Chat' },
      'deepseek-reasoner': { en: 'DeepSeek-Reasoner', zh: 'DeepSeek-Reasoner' }
    }

    wx.showToast({
      title: this.data.language === 'en' ? `Switched to ${modelNames[model].en}` : `已切换到${modelNames[model].zh}`,
      icon: 'success',
      duration: 2000
    })
  },

  onDebugModeChange(e) {
    const debugMode = e.detail.value
    this.setData({ debugMode })

    const app = getApp()
    app.globalData.debugMode = debugMode
    wx.setStorageSync('debugMode', debugMode)

    wx.showToast({
      title: this.data.language === 'en'
        ? (debugMode ? 'Debug mode enabled' : 'Debug mode disabled')
        : (debugMode ? '调试模式已开启' : '调试模式已关闭'),
      icon: 'success',
      duration: 2000
    })
  },

  goBack() {
    wx.navigateBack()
  }
})
