App({
  globalData: {
    bigModelApiKey: 'bae66e9df8274f079451d708744af0b2.8sEcD3QeAPPvERLh',
    deepseekApiKey: 'sk-f746ad4d77de44269b1bb500460c083d', // User needs to add their DeepSeek API key
    selectedModel: 'deepseek-chat', // Options: 'glm-4.7', 'deepseek-chat', or 'deepseek-reasoner'
    language: 'zh'
  },

  onLaunch() {
    // Load saved settings
    const savedModel = wx.getStorageSync('selectedModel')
    if (savedModel) {
      this.globalData.selectedModel = savedModel
    }

    const savedDeepseekKey = wx.getStorageSync('deepseekApiKey')
    if (savedDeepseekKey) {
      this.globalData.deepseekApiKey = savedDeepseekKey
    }

    const customGlmKey = wx.getStorageSync('customGlmApiKey')
    if (customGlmKey) {
      this.globalData.bigModelApiKey = customGlmKey
    }
  }
})
