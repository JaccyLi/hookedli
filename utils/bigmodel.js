/**
 * Multi-Model API Integration Module
 * Supports BigModel GLM-4.7, DeepSeek-Chat, and DeepSeek-Reasoner APIs
 * Can use backend proxy for secure API key management
 */

const GLM_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'
const IMAGE_API_URL = 'https://open.bigmodel.cn/api/paas/v4/images/generations'

// Import category data from central source
const { categoryPrompts: categoryPromptsData, categoryLabels: categoryLabelsData } = require('./categories.js')
const logger = require('./logger.js')
const { AI, MODELS } = require('./constants.js')
const backendClient = require('./backend-client.js')

/**
 * Get API URL and key based on model selection
 * @param {string} model - Model name ('glm-4.7', 'deepseek-chat', or 'deepseek-reasoner')
 * @param {Object} apiKeys - Object containing both API keys
 * @returns {Object} { url, key, model }
 */
function getApiConfig(model, apiKeys) {
  if (model === MODELS.DEEPSEEK_CHAT) {
    return {
      url: DEEPSEEK_API_URL,
      key: apiKeys.deepseekApiKey,
      model: MODELS.DEEPSEEK_CHAT
    }
  } else if (model === MODELS.DEEPSEEK_REASONER) {
    return {
      url: DEEPSEEK_API_URL,
      key: apiKeys.deepseekApiKey,
      model: MODELS.DEEPSEEK_REASONER
    }
  } else if (model === MODELS.GLM_4_7_FLASHX) {
    // GLM-4.7-FlashX uses BigModel API
    return {
      url: GLM_API_URL,
      key: apiKeys.glmApiKey,
      model: MODELS.GLM_4_7_FLASHX
    }
  } else if (model === MODELS.GLM_4_7_FLASH) {
    // GLM-4.7-Flash uses BigModel API
    return {
      url: GLM_API_URL,
      key: apiKeys.glmApiKey,
      model: MODELS.GLM_4_7_FLASH
    }
  } else {
    // Default to GLM-4.7
    return {
      url: GLM_API_URL,
      key: apiKeys.glmApiKey,
      model: MODELS.GLM_4_7
    }
  }
}

/**
 * Generate a fly fishing article using BigModel API
 * @param {string} category - Article category (fly tying, fly casting, biology, gear)
 * @param {string} apiKey - BigModel API key
 * @param {string} language - Article language ('en' for English, 'zh' for Chinese)
 * @param {Function} onProgress - Callback for progress updates {stage, message, detail}
 * @returns {Promise<Object>} Generated article with structured data
 */
function generateArticle(category, apiKey, language = 'en', onProgress = null) {
  return new Promise((resolve, reject) => {
    const categoryPrompts = categoryPromptsData

    // Use the category directly if it's not in the predefined list (custom input)
    // Otherwise use the predefined prompt
    const topic = categoryPrompts[language][category] || category
    const categoryLabel = categoryLabelsData[language][category] || category

    const systemPrompt = language === 'en'
      ? `You are an expert fly fishing writer. Create engaging, informative, and practical articles about ${topic}.

IMPORTANT: You must output ONLY valid JSON. Do NOT output any HTML or markdown text outside the JSON structure.

Required Article Structure:
1. A compelling, descriptive title (50-100 characters)
2. Exactly 5 paragraphs
3. Each paragraph must have:
   - An introductory section (2-4 sentences)
   - Between 1 and 5 sub-paragraphs (each 1-3 sentences)
4. Each paragraph needs an image search keyword (describe the scene for that section)
5. An appendix with 3-5 reference URLs (real fly fishing websites, X posts, Facebook posts, or Reddit discussions)

JSON Format:
{
  "title": "Article Title Here",
  "paragraphs": [
    {
      "intro": "Introduction text for paragraph 1...",
      "subParagraphs": [
        "Sub-paragraph 1 text...",
        "Sub-paragraph 2 text..."
      ],
      "imagePrompt": "Image search keyword describing this paragraph..."
    }
  ],
  "references": [
    {
      "title": "Article or Post Title",
      "url": "https://example.com/article"
    }
  ]
}

Image Prompt Guidelines:
- Describe professional fly fishing photography scene
- Include specific details: lighting, composition, subject
- Relate to the paragraph content
- Example: "Professional fly fishing photography showing an angler casting on a pristine river at golden hour. High quality, natural lighting, fly rod bending, trout rising in background, scenic mountain landscape"

Content Requirements:
- Total length: 500-800 words
- Provide actionable tips and techniques
- Use clear, professional language
- Include practical examples
- Make it engaging for fly fishing enthusiasts

Output ONLY the JSON object - no markdown formatting, no code blocks, no explanatory text.`
      : `你是一位资深的飞钓专家。请创作关于${topic}的引人入胜、信息丰富且实用的文章。

重要说明：你必须只输出有效的JSON格式。不要输出JSON结构之外的任何HTML或markdown文本。

要求的文章结构：
1. 一个吸引人且描述准确的标题（50-100个字符）
2. 正好5个段落
3. 每个段落必须包含：
   - 一个介绍部分（2-4个句子）
   - 1到5个子段落（每个1-3个句子）
4. 每个段落需要一个图片搜索关键词（描述该段落的场景）
5. 一个附录，包含3-5个参考URL（真实的飞钓网站、X帖子、Facebook帖子或Reddit讨论）

JSON格式：
{
  "title": "文章标题",
  "paragraphs": [
    {
      "intro": "第1段介绍文本...",
      "subParagraphs": [
        "子段落1文本...",
        "子段落2文本..."
      ],
      "imagePrompt": "图片搜索关键词..."
    }
  ],
  "references": [
    {
      "title": "文章或帖子标题",
      "url": "https://example.com/article"
    }
  ]
}

图片提示词指南：
- 描述专业飞钓摄影场景
- 包含具体细节：光线、构图、主题
- 与段落内容相关
- 示例："专业飞钓摄影，展示钓手在黄金时段的原始河流上抛投。高质量，自然光线，飞钓竿弯曲，背景中鳟鱼跃出，风景优美的山地景观"

内容要求：
- 总篇幅：500-800字
- 提供可操作的技巧和技术
- 使用清晰、专业的语言
- 包含实际例子
- 使其对飞钓爱好者具有吸引力

只输出JSON对象 - 没有markdown格式，没有代码块，没有解释性文本。`

    const userPrompt = language === 'en'
      ? `Write a comprehensive article about ${topic} in the specified JSON format. Include specific techniques, tips, and practical advice that anglers can apply.`
      : `请按照指定的JSON格式写一篇关于${topic}的综合文章。包含具体的技术、技巧和飞钓玩家可以应用的实际建议。`

    const requestPayload = {
      model: MODELS.GLM_4_7,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      temperature: AI.TEMPERATURE,
      top_p: AI.TOP_P,
      max_tokens: AI.MAX_TOKENS_FULL_ARTICLE,
      stream: false
    }

    function makeApiRequest(retryCount = 0) {
      // Report starting content generation
      if (onProgress) {
        onProgress({
          stage: 'content',
          message: language === 'en' ? 'Searching article content...' : '正在搜索文章内容...',
          detail: language === 'en' ? 'Finding title and sections' : '查找标题和章节'
        })
      }

      wx.request({
        url: API_URL,
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        data: requestPayload,
        timeout: AI.TIMEOUT_FULL_ARTICLE,
        success: (response) => {
          try {
            if (response.statusCode === 200 && response.data.choices && response.data.choices.length > 0) {
              let content = response.data.choices[0].message.content.trim()

              content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '')

              // Report parsing content
              if (onProgress) {
                onProgress({
                  stage: 'parsing',
                  message: language === 'en' ? 'Parsing article structure...' : '正在解析文章结构...',
                  detail: language === 'en' ? 'Processing title and paragraphs' : '处理标题和段落'
                })
              }

              const articleData = JSON.parse(content)

              if (!articleData.title || !articleData.paragraphs || !Array.isArray(articleData.paragraphs) || articleData.paragraphs.length !== 5) {
                throw new Error('Invalid article structure')
              }

              // Report completion
              if (onProgress) {
                onProgress({
                  stage: 'content_complete',
                  message: language === 'en' ? 'Content found!' : '内容已找到！',
                  detail: language === 'en' ? `Title: "${articleData.title.substring(0, 30)}..."` : `标题："${articleData.title.substring(0, 30)}..."`
                })
              }

              resolve({
                title: articleData.title,
                paragraphs: articleData.paragraphs,
                references: articleData.references || [],
                category: categoryLabel,
                originalCategory: category
              })
            } else {
              reject(new Error('Invalid API response'))
            }
          } catch (error) {
            if (retryCount < 1) {
              console.log(`JSON parse failed, retrying... (attempt ${retryCount + 2})`)
              if (onProgress) {
                onProgress({
                  stage: 'retry',
                  message: language === 'en' ? 'Retrying...' : '正在重试...',
                  detail: language === 'en' ? 'Parse failed, retrying request' : '解析失败，正在重试请求'
                })
              }
              setTimeout(() => makeApiRequest(retryCount + 1), 1000)
            } else {
              reject(new Error(`Failed to parse API response: ${error.message}`))
            }
          }
        },
        fail: (error) => {
          if (retryCount < 1) {
            console.log(`API request failed, retrying... (attempt ${retryCount + 2})`)
            setTimeout(() => makeApiRequest(retryCount + 1), 1000)
          } else {
            reject(new Error(`API request failed: ${error.errMsg || 'Network error'}`))
          }
        }
      })
    }

    makeApiRequest()
  })
}

/**
 * Generate article outline (title + section summaries) for faster parallel processing
 * @param {string} category - Article category
 * @param {string} apiKey - API key (deprecated, use apiKeys instead)
 * @param {string} language - Article language ('en' or 'zh')
 * @param {Function} onProgress - Progress callback
 * @param {string} model - Model to use ('glm-4.7' or 'deepseek-chat')
 * @param {Object} apiKeys - Object containing { glmApiKey, deepseekApiKey }
 * @returns {Promise<Object>} Article outline with title and section summaries
 */
function generateArticleOutline(category, apiKey, language = 'en', onProgress = null, model = 'glm-4.7', apiKeys = null) {
  return new Promise(async (resolve, reject) => {
    const categoryPrompts = categoryPromptsData

    // Use the category directly if it's not in the predefined list (custom input)
    // Otherwise use the predefined prompt
    const topic = categoryPrompts[language][category] || category
    const categoryLabel = categoryLabelsData[language][category] || category

    logger.log('[generateArticleOutline] category input:', category)
    logger.log('[generateArticleOutline] topic used:', topic)
    logger.log('[generateArticleOutline] categoryLabel:', categoryLabel)

    // Use DeepSeek-Chat for outline generation (fast and efficient framework)
    const outlineModel = MODELS.DEEPSEEK_CHAT
    logger.log('[generateArticleOutline] User model:', model, '→ Outline model:', outlineModel, '(DeepSeek-Chat for fast framework)')

    const systemPrompt = language === 'en'
      ? `You are an expert fly fishing writer. Create a comprehensive article outline about ${topic}.

Required Structure:
{
  "title": "Article title (50-100 characters)",
  "sections": [
    {
      "index": 1,
      "title": "Section 1 brief title",
      "sentences": [
        "First key point about this section (10-15 words)",
        "Second key point about this section (10-15 words)",
        "Third key point about this section (10-15 words)"
      ],
      "imagePrompt": "Detailed image description for this section"
    },
    ... (3 sections total)
  ],
  "references": [
    {"title": "Reference title", "url": "https://example.com"}
  ]
}

REQUIREMENTS:
- Create exactly 3 sections covering different aspects of the topic
- Each section MUST have exactly 3 sentences
- Each sentence should be 10-15 words
- Sentences should outline key points to be expanded into paragraphs later
- Image prompts should describe professional fly fishing photography
- Include 3-5 real reference URLs

Output ONLY the JSON object.`
      : `你是一位资深的飞钓专家。请创作关于${topic}的文章大纲。

要求的结构：
{
  "title": "文章标题（50-100个字符）",
  "sections": [
    {
      "index": 1,
      "title": "第1节简短标题",
      "sentences": [
        "关于本节的第一个要点（10-15个词）",
        "关于本节的第二个要点（10-15个词）",
        "关于本节的第三个要点（10-15个词）"
      ],
      "imagePrompt": "本节的详细图片描述"
    },
    ... (共3个章节)
  ],
  "references": [
    {"title": "参考标题", "url": "https://example.com"}
  ]
}

要求：
- 创建正好3个章节，涵盖主题的不同方面
- 每个章节必须有3个句子
- 每个句子应该是10-15个词
- 句子应该概述稍后要扩展成段落的关键点
- 图片提示应该描述专业的飞钓摄影
- 包括3-5个真实的参考URL

只输出JSON对象。`

    try {
      // Check if backend proxy is enabled
      const useBackend = backendClient.isBackendEnabled()
      logger.log('[generateArticleOutline] Using backend:', useBackend)

      let content = ''
      let backendFailed = false

      if (useBackend) {
        // Try backend proxy first
        try {
          const response = await backendClient.generateArticleOutline({
            model: outlineModel,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: language === 'en' ? `Create a detailed article outline about ${topic}.` : `请创建关于${topic}的详细文章大纲。` }
            ],
            temperature: AI.TEMPERATURE,
            top_p: AI.TOP_P,
            max_tokens: AI.MAX_TOKENS_OUTLINE
          })

          if (response.choices && response.choices.length > 0) {
            content = response.choices[0].message.content.trim()
            logger.log('[generateArticleOutline] Backend success')
          } else {
            throw new Error('Invalid backend response')
          }
        } catch (backendError) {
          logger.warn('[generateArticleOutline] Backend failed, falling back to direct API:', backendError.message)
          backendFailed = true
        }
      }

      // Fallback to direct API call if backend failed or was not enabled
      if (!content) {
        logger.log('[generateArticleOutline] Using direct API call')
        const apiConfig = getApiConfig(outlineModel, apiKeys || { glmApiKey: apiKey, deepseekApiKey: '' })

        const requestPayload = {
          model: apiConfig.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: language === 'en' ? `Create a detailed article outline about ${topic}.` : `请创建关于${topic}的详细文章大纲。` }
          ],
          temperature: AI.TEMPERATURE,
          top_p: AI.TOP_P,
          max_tokens: AI.MAX_TOKENS_OUTLINE,
          stream: false
        }

        const response = await new Promise((resolve, reject) => {
          wx.request({
            url: apiConfig.url,
            method: 'POST',
            header: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiConfig.key}`
            },
            data: requestPayload,
            timeout: AI.TIMEOUT_OUTLINE,
            success: resolve,
            fail: reject
          })
        })

        if (response.statusCode === 200 && response.data.choices && response.data.choices.length > 0) {
          content = response.data.choices[0].message.content.trim()
        } else {
          throw new Error('Invalid API response')
        }
      }

      // Parse and validate content
      content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '')
      const outlineData = JSON.parse(content)

      if (!outlineData.title || !outlineData.sections || !Array.isArray(outlineData.sections) || outlineData.sections.length < 3) {
        throw new Error('Invalid outline structure: expected at least 3 sections')
      }

      // Validate each section has 3 sentences
      for (const section of outlineData.sections) {
        if (!section.sentences || !Array.isArray(section.sentences) || section.sentences.length !== 3) {
          throw new Error(`Invalid section structure: expected 3 sentences in section "${section.title}"`)
        }
      }

      if (onProgress) {
        onProgress({
          stage: 'outline_complete',
          message: language === 'en' ? 'Outline ready!' : '大纲已就绪！',
          detail: language === 'en' ? `Title: "${outlineData.title.substring(0, 30)}..."` : `标题："${outlineData.title.substring(0, 30)}..."`
        })
      }

      resolve({
        title: outlineData.title,
        sections: outlineData.sections,
        references: outlineData.references || [],
        category: categoryLabel,
        originalCategory: category
      })
    } catch (error) {
      logger.error('[generateArticleOutline] Error:', error)
      reject(error)
    }
  })
}

/**
 * Expand a single section with sentences into full content
 * @param {Object} section - Section with index, title, sentences, imagePrompt
 * @param {string} apiKey - API key (deprecated, backend used when available)
 * @param {string} language - Language
 * @param {string} model - Model to use
 * @param {Object} apiKeys - Object containing { glmApiKey, deepseekApiKey }
 * @returns {Promise<Object>} Expanded section with intro and subParagraphs
 */
async function expandSection(section, apiKey, language = 'en', model = 'glm-4.7', apiKeys = null) {
  logger.log('[expandSection] START - Section:', section.title)
  logger.log('[expandSection] Language:', language)
  logger.log('[expandSection] Model:', model)

  // Use the exact model specified - no substitution
  // User wants GLM-4.7 (not flash), so use it as-is
  const expandModel = model
  logger.log('[expandSection] Using model:', expandModel)

  // Get sentences from section
  const sentences = section.sentences || []
  const sentencesText = sentences.map((s, i) => `${i + 1}. ${s}`).join('\n')

  const systemPrompt = language === 'en'
    ? `You are an expert fly fishing writer. Expand the following section sentences into a complete article section.

Section Title: ${section.title}

Section Sentences to Expand:
${sentencesText}

Requirements:
- Write a brief introduction (1-2 sentences) that sets up the section
- Expand EACH of the 3 sentences above into a detailed paragraph
- Each expanded paragraph should be 4-8 sentences with in-depth information
- Keep the same order as the input sentences
- Content must be practical, actionable, and highly informative
- Include specific techniques, tips, or examples
- Use clear, professional language
- IMPORTANT: Each paragraph MUST start with a number prefix (1., 2., 3.)

Output ONLY valid JSON in this format:
{
  "intro": "Brief introduction text...",
  "subParagraphs": [
    "1. First expanded paragraph (from sentence 1)...",
    "2. Second expanded paragraph (from sentence 2)...",
    "3. Third expanded paragraph (from sentence 3)..."
  ]
}`
    : `你是一位资深的飞钓专家。将以下章节句子扩展为完整的文章章节。

章节标题：${section.title}

要扩展的章节句子：
${sentencesText}

要求：
- 撰写简短介绍（1-2句话）作为章节开场
- 将上述3个句子中的每一个扩展为详细段落
- 每个扩展段落应为4-8句话，包含深入信息
- 保持与输入句子相同的顺序
- 内容必须实用、可操作且信息丰富
- 包含具体技巧、提示或示例
- 使用清晰、专业的语言
- 重要：每个段落必须以数字前缀开头（1.、2.、3.）

只输出以下格式的有效JSON：
{
  "intro": "简短介绍文本...",
  "subParagraphs": [
    "1. 第一个扩展段落（来自句子1）...",
    "2. 第二个扩展段落（来自句子2）...",
    "3. 第三个扩展段落（来自句子3）..."
  ]
}`

  try {
    // Check if backend proxy is enabled
    const useBackend = backendClient.isBackendEnabled()
    logger.log('[expandSection] Using backend:', useBackend)

    let content = ''

    if (useBackend) {
      // Try backend proxy first
      try {
        logger.log('[expandSection] Calling backend with model:', expandModel, '(user selected:', model, ')')
        const response = await backendClient.expandSection({
          model: expandModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: language === 'en' ? 'Expand this section into full content.' : '将此章节扩展为完整内容。' }
          ],
          temperature: AI.TEMPERATURE,
          top_p: AI.TOP_P,
          max_tokens: AI.MAX_TOKENS_EXPANSION
        })

        if (response.choices && response.choices.length > 0) {
          content = response.choices[0].message.content.trim()
          logger.log('[expandSection] Backend success')
        } else {
          throw new Error('Invalid backend response')
        }
      } catch (backendError) {
        logger.warn('[expandSection] Backend failed, falling back to direct API:', backendError.message)
      }
    }

    // Fallback to direct API call if backend failed or was not enabled
    if (!content) {
      logger.log('[expandSection] Using direct API call with model:', expandModel, '(user selected:', model, ')')
      const apiConfig = getApiConfig(expandModel, apiKeys || { glmApiKey: apiKey, deepseekApiKey: '' })

      const requestPayload = {
        model: apiConfig.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: language === 'en' ? 'Expand this section into full content.' : '将此章节扩展为完整内容。' }
        ],
        temperature: AI.TEMPERATURE,
        top_p: AI.TOP_P,
        max_tokens: AI.MAX_TOKENS_EXPANSION,
        stream: false
      }

      const response = await new Promise((resolve, reject) => {
        wx.request({
          url: apiConfig.url,
          method: 'POST',
          header: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiConfig.key}`
          },
          data: requestPayload,
          timeout: AI.TIMEOUT_EXPANSION,
          success: resolve,
          fail: reject
        })
      })

      if (response.statusCode === 200 && response.data.choices && response.data.choices.length > 0) {
        content = response.data.choices[0].message.content.trim()
      } else {
        throw new Error('Invalid API response')
      }
    }

    // Parse and return content
    content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    const sectionData = JSON.parse(content)
    logger.log('[expandSection] Parsed sectionData, subParagraphs count:', sectionData.subParagraphs?.length || 0)

    return {
      intro: sectionData.intro || section.summary,
      subParagraphs: sectionData.subParagraphs || [],
      imagePrompt: section.imagePrompt
    }
  } catch (error) {
    logger.error('[expandSection] Error:', error)
    // Fallback to original summary on error
    return {
      intro: section.summary,
      subParagraphs: [],
      imagePrompt: section.imagePrompt
    }
  }
}

/**
 * Expand a single sentence into a detailed numbered paragraph
 * @param {Object} section - Section object with title
 * @param {string} sentence - The sentence to expand
 * @param {number} sentenceIndex - Index of the sentence (1-5)
 * @param {string} apiKey - API key (deprecated, backend used when available)
 * @param {string} language - Language
 * @param {string} model - Model to use
 * @param {Object} apiKeys - Object containing { glmApiKey, deepseekApiKey }
 * @returns {Promise<string>} Expanded numbered paragraph
 */
async function expandSentence(section, sentence, sentenceIndex, apiKey, language = 'en', model = 'deepseek-chat', apiKeys = null) {
  logger.log('[expandSentence] START - Section:', section.title, 'Sentence:', sentenceIndex + 1)
  logger.log('[expandSentence] Language:', language)
  logger.log('[expandSentence] Model:', model)

  const systemPrompt = language === 'en'
    ? `You are an expert fly fishing writer. Expand the following sentence into a detailed paragraph.

Section Title: ${section.title}

Sentence to Expand (number ${sentenceIndex + 1} of 3):
${sentence}

Requirements:
- Expand this single sentence into a detailed, informative paragraph
- The paragraph should be 4-8 sentences long
- Content must be practical, actionable, and highly informative
- Include specific techniques, tips, or examples related to fly fishing
- Use clear, professional language
- CRITICAL: The paragraph MUST start with the number prefix "${sentenceIndex + 1}."

Output ONLY the expanded paragraph text starting with the number.`
    : `你是一位资深的飞钓专家。将以下句子扩展为详细段落。

章节标题：${section.title}

要扩展的句子（第${sentenceIndex + 1}个，共3个）：
${sentence}

要求：
- 将这个单个句子扩展为详细、信息丰富的段落
- 段落应为4-8句话长
- 内容必须实用、可操作且信息丰富
- 包含与飞钓相关的具体技巧、提示或示例
- 使用清晰、专业的语言
- 关键：段落必须以数字前缀"${sentenceIndex + 1}."开头

只输出以数字开头的扩展段落文本。`

  try {
    // Use backend proxy for sentence expansion
    logger.log('[expandSentence] Calling backend proxy with model:', model)

    const content = await backendClient.makeBackendRequest('/api/proxy/chat', {
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: language === 'en' ? 'Expand this sentence.' : '扩展此句子。' }
      ],
      temperature: 0.8,
      top_p: 0.95,
      max_tokens: 2048
    })

    logger.log('[expandSentence] Backend response received')

    // The backend returns the content directly (not wrapped in choices)
    let expandedContent = typeof content === 'string' ? content : content

    // If it's the full API response format, extract the content
    if (expandedContent.choices && expandedContent.choices.length > 0) {
      expandedContent = expandedContent.choices[0].message.content
    }

    // Clean up the response
    expandedContent = expandedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim()

    // Ensure it starts with the correct number
    if (!expandedContent.startsWith(`${sentenceIndex + 1}.`)) {
      expandedContent = `${sentenceIndex + 1}. ${expandedContent}`
    }

    logger.log('[expandSentence] Completed, paragraph length:', expandedContent.length)
    return expandedContent
  } catch (error) {
    logger.error('[expandSentence] Error:', error)
    logger.error('[expandSentence] Error details:', {
      message: error.message,
      stack: error.stack,
      section: section.title,
      sentenceIndex: sentenceIndex,
      model: model
    })
    // Fallback to original sentence with numbering
    return `${sentenceIndex + 1}. ${sentence}`
  }
}

/**
 * Generate an image using BigModel's CogView API
 * @param {string} prompt - Image generation prompt
 * @param {string} apiKey - BigModel API key (deprecated, backend used when available)
 * @param {boolean} isHero - Whether this is a hero image (uses GLM-Image model)
 * @param {string} imageModel - Image model to use (e.g., 'cogview-3-flash', 'qwen-image-max')
 * @returns {Promise<string>} Image URL
 */
function generateImage(prompt, apiKey, isHero = false, imageModel = null) {
  return new Promise(async (resolve, reject) => {
    try {
      let imageUrl = ''

      // Check if backend proxy is enabled
      const useBackend = backendClient.isBackendEnabled()
      logger.log('[generateImage] Using backend:', useBackend, 'isHero:', isHero, 'imageModel:', imageModel)

      if (useBackend) {
        // Try backend proxy first
        try {
          imageUrl = await backendClient.generateImage(prompt, AI.IMAGE_SIZE, isHero, imageModel)
          logger.log('[generateImage] Backend success')
          resolve(imageUrl)
          return
        } catch (backendError) {
          logger.warn('[generateImage] Backend failed, falling back to direct API:', backendError.message)
          // Continue to fallback instead of rejecting
        }
      }

      // Fallback to direct API call if backend failed or was not enabled
      logger.log('[generateImage] Using direct API call')
      // Use CogView-3-Flash for all images (free model)
      const model = 'cogview-3-flash'
      const requestPayload = {
        model: model,
        prompt: prompt,
        size: AI.IMAGE_SIZE
      }

      wx.request({
        url: IMAGE_API_URL,
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        data: requestPayload,
        timeout: AI.TIMEOUT_IMAGE,
        success: (response) => {
          try {
            if (response.statusCode === 200 && response.data && response.data.data && response.data.data.length > 0) {
              const imageUrl = response.data.data[0].url
              resolve(imageUrl)
            } else {
              logger.error('[generateImage] Invalid image API response, returning empty string')
              resolve('') // Resolve with empty string instead of rejecting
            }
          } catch (error) {
            logger.error('[generateImage] Failed to parse image API response:', error)
            resolve('') // Resolve with empty string instead of rejecting
          }
        },
        fail: (error) => {
          logger.error('[generateImage] Image API request failed:', error)
          resolve('') // Resolve with empty string instead of rejecting
        }
      })
    } catch (error) {
      logger.error('[generateImage] Error:', error)
      resolve('') // Resolve with empty string instead of rejecting
    }
  })
}

/**
 * Generate multiple images for article paragraphs in parallel
 * @param {Array} paragraphs - Array of paragraph objects with imagePrompt
 * @param {string} apiKey - BigModel API key
 * @param {Function} onProgress - Callback for progress updates {stage, current, total, message}
 * @returns {Promise<Array>} Array of image objects with url and description
 */
async function generateImagesForParagraphs(paragraphs, apiKey, onProgress = null) {
  // Report starting parallel image generation
  if (onProgress) {
    onProgress({
      stage: 'parallel_images_start',
      total: paragraphs.length,
      message: `Starting parallel image generation for ${paragraphs.length} sections...`,
      detail: 'Generating all images simultaneously'
    })
  }

  // Generate all images in parallel
  const imagePromises = paragraphs.map(async (paragraph, index) => {
    try {
      const prompt = paragraph.imagePrompt
      const imageUrl = await generateImage(prompt, apiKey)

      // Report individual image completion
      if (onProgress) {
        onProgress({
          stage: 'paragraph_image_complete',
          current: index + 1,
          total: paragraphs.length,
          message: `Image ${index + 1}/${paragraphs.length} complete!`,
          detail: `Section ${index + 1} image ready`
        })
      }

      return {
        url: imageUrl,
        description: prompt,
        index: index
      }
    } catch (error) {
      logger.error(`Failed to generate image for paragraph ${index + 1}:`, error)
      // Return placeholder for failed image
      return {
        url: '',
        description: paragraph.imagePrompt,
        index: index
      }
    }
  })

  // Wait for all images to complete
  const images = await Promise.all(imagePromises)

  // Sort by original index and remove index property
  const sortedImages = images
    .sort((a, b) => a.index - b.index)
    .map(({ url, description }) => ({ url, description }))

  // Report all images complete
  if (onProgress) {
    onProgress({
      stage: 'parallel_images_complete',
      total: paragraphs.length,
      message: 'All images generated!',
      detail: `${sortedImages.filter(img => img.url).length}/${paragraphs.length} images successful`
    })
  }

  return sortedImages
}

/**
 * Generate a hero image for the article
 * @param {string} title - Article title
 * @param {string} category - Article category
 * @param {string} apiKey - BigModel API key
 * @param {Function} onProgress - Callback for progress updates {stage, message}
 * @returns {Promise<string>} Image URL
 */
async function generateHeroImage(title, category, apiKey, onProgress = null, imageModel = null) {
  const categoryPrompts = {
    'fly tying': 'fly fishing flies, fly tying tools, colorful artificial flies, detailed fly patterns',
    'fly casting': 'fly casting technique, angler casting fly rod, fly fishing action shot',
    'biology': 'trout fish in natural habitat, fish behavior, river ecosystem',
    'gear': 'fly fishing rod and reel, fly fishing equipment, fishing gear setup',
    'all': 'fly fishing scene, river fishing, angler with fly rod'
  }

  // Use predefined prompt if available, otherwise use the category directly
  const basePrompt = categoryPrompts[category] || `${category}, fly fishing`
  const prompt = `${basePrompt}. ${title}. Professional photography, high quality, natural lighting, scenic landscape.`

  try {
    // Report starting hero image generation
    if (onProgress) {
      onProgress({
        stage: 'hero_image',
        message: 'Loading hero image...',
        detail: 'Main cover image'
      })
    }

    // Pass isHero=true and imageModel to generateImage
    const imageUrl = await generateImage(prompt, apiKey, true, imageModel)

    // Report completion
    if (onProgress) {
      onProgress({
        stage: 'hero_image_complete',
        message: 'Hero image loaded!',
        detail: 'Main cover image ready'
      })
    }

    return imageUrl
  } catch (error) {
    console.error('Failed to generate hero image:', error)
    return null
  }
}

/**
 * Generate images for article based on alt text prompts in HTML
 * @param {string} htmlContent - Article HTML content with <img> tags containing descriptive alt text
 * @param {string} apiKey - BigModel API key
 * @returns {Promise<string>} HTML content with actual image URLs
 */
async function generateAndInsertImages(htmlContent, apiKey) {
  const imgRegex = /<img([^>]*?)alt=["']([^"']+)["']([^>]*?)>/gi
  const images = htmlContent.match(imgRegex)
  
  if (!images || images.length === 0) {
    return htmlContent
  }

  const replacementPromises = []
  
  images.forEach(imgMatch => {
    replacementPromises.push(
      new Promise(async (resolve) => {
        const promptMatch = imgMatch.match(/alt=["']([^"']+)["']/)
        if (!promptMatch) {
          resolve({ original: imgMatch, replacement: imgMatch })
          return
        }

        const prompt = promptMatch[1]
        
        try {
          const imageUrl = await generateImage(prompt, apiKey)
          const replacement = imgMatch.replace(/alt=["'][^"']*["']/, `src="${imageUrl}" alt="${prompt}"`)
          resolve({ original: imgMatch, replacement })
        } catch (error) {
          console.error('Failed to generate image:', error)
          resolve({ original: imgMatch, replacement: imgMatch })
        }
      })
    )
  })

  const replacements = await Promise.all(replacementPromises)
  
  let modifiedContent = htmlContent
  replacements.forEach(({ original, replacement }) => {
    modifiedContent = modifiedContent.replace(original, replacement)
  })

  return modifiedContent
}

/**
 * Parse markdown content to extract title and body
 * @param {string} markdown - Raw markdown content
 * @returns {Object} Object with title and content
 */
function parseMarkdownArticle(markdown) {
  const trimmed = markdown.trim()

  const lines = trimmed.split('\n')
  let title = 'Fly Fishing Insights'
  let content = trimmed

  if (lines.length > 0) {
    const firstLine = lines[0].trim()

    if (firstLine.startsWith('#')) {
      title = firstLine.replace(/^#+\s*/, '').trim()
      content = lines.slice(1).join('\n').trim()
    } else {
      if (firstLine.length > 10 && firstLine.length < 100) {
        title = firstLine
        content = lines.slice(1).join('\n').trim()
      }
    }
  }

  return {
    title,
    content
  }
}

/**
 * Validate API key format
 * @param {string} apiKey - API key to validate
 * @returns {boolean} True if valid format
 */
function validateApiKey(apiKey) {
  return apiKey && apiKey.length > 20
}

module.exports = {
  generateArticle,
  generateArticleOutline,
  expandSection,
  expandSentence,
  generateImage,
  generateImagesForParagraphs,
  generateHeroImage,
  generateAndInsertImages,
  parseMarkdownArticle,
  validateApiKey
}
