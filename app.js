App({
  globalData: {
    // SECURITY: API keys should be managed by a backend proxy server
    // TODO: Implement backend API endpoint that handles AI model requests
    // Current implementation uses client-side storage (not secure for production)
    bigModelApiKey: '', // Set via wx.setStorageSync('bigModelApiKey')
    deepseekApiKey: '', // Set via wx.setStorageSync('deepseekApiKey')
    selectedModel: 'deepseek-chat', // Options: 'glm-4.7', 'deepseek-chat', or 'deepseek-reasoner'
    language: 'zh',
    debugMode: false, // Set to true for development, false for production

    // API configuration for backend migration
    apiConfig: {
      useBackendProxy: false, // TODO: Set to true when backend is ready
      backendUrl: '' // TODO: Configure backend URL when ready
    }
  },

  onLaunch() {
    // Load saved settings
    const savedModel = wx.getStorageSync('selectedModel')
    if (savedModel) {
      this.globalData.selectedModel = savedModel
    }

    // Load API keys from storage (priority: storage > globalData default)
    const savedDeepseekKey = wx.getStorageSync('deepseekApiKey')
    if (savedDeepseekKey) {
      this.globalData.deepseekApiKey = savedDeepseekKey
    }

    const customGlmKey = wx.getStorageSync('customGlmApiKey')
    if (customGlmKey) {
      this.globalData.bigModelApiKey = customGlmKey
    }

    const savedDebugMode = wx.getStorageSync('debugMode')
    if (savedDebugMode !== undefined && savedDebugMode !== null) {
      this.globalData.debugMode = savedDebugMode
    }
  }
})
