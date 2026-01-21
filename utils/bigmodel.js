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

    const systemPrompt = language === 'en'
      ? `You are an expert fly fishing writer. Create a comprehensive article outline about ${topic}.

!!! WARNING: SUMMARY WORD COUNT LIMIT - 5 TO 10 WORDS MAXIMUM !!!

Required Structure:
{
  "title": "Article title (50-100 characters)",
  "sections": [
    {
      "index": 1,
      "title": "Section 1 brief title",
      "summary": "5-10 words ONLY - NO MORE",
      "imagePrompt": "Detailed image description for this section"
    },
    ... (5 sections total)
  ],
  "references": [
    {"title": "Reference title", "url": "https://example.com"}
  ]
}

REQUIREMENTS:
- Create exactly 5 sections covering different aspects of the topic
- !!! SUMMARY LIMIT: 5-10 WORDS ABSOLUTE MAXIMUM !!!
- Count EVERY word - if summary has 11+ words, it's WRONG
- GOOD examples (5-10 words):
  * "Master basic casting techniques" (4 words)
  * "Select essential fishing gear" (4 words)
  * "Learn proper fly selection" (4 words)
- BAD examples (TOO LONG):
  * "Learn how to cast your fly accurately" (7 words - acceptable)
  * "Master the art of fly casting with these proven techniques for beginners" (12 words - WRONG, TOO LONG)
- Keep summaries ULTRA SHORT - like headlines, not descriptions
- Image prompts should describe professional fly fishing photography
- Include 3-5 real reference URLs

Output ONLY the JSON object.`
      : `你是一位资深的飞钓专家。请创作关于${topic}的文章大纲。

!!! 警告：摘要字数限制 - 最多5到10个单词 !!!

要求的结构：
{
  "title": "文章标题（50-100个字符）",
  "sections": [
    {
      "index": 1,
      "title": "第1节简短标题",
      "summary": "只许5-10个单词 - 不能再多",
      "imagePrompt": "本节的详细图片描述"
    },
    ... (共5个章节)
  ],
  "references": [
    {"title": "参考标题", "url": "https://example.com"}
  ]
}

要求：
- 创建正好5个章节，涵盖主题的不同方面
- !!! 摘要限制：绝对最多5-10个单词 !!!
- 每个单词都要数 - 如果摘要有11个或更多单词，就是错的
- 好的例子（5-10个单词）：
  * "掌握基本抛投技巧"（4个词）
  * "选择必要钓鱼装备"（4个词）
  * "学习正确拟饵选择"（4个词）
- 坏的例子（太长了）：
  * "学习如何准确抛出你的拟饵"（7个词 - 可以接受）
  * "通过这些经过验证的技术掌握飞钓艺术适合初学者"（12个词 - 错误，太长了）
- 保持摘要超级短 - 像标题，不是描述
- 图片提示词应描述专业飞钓摄影
- 包含3-5个真实参考URL

只输出JSON对象。`

    if (onProgress) {
      onProgress({
        stage: 'outline',
        message: language === 'en' ? 'Searching article outline...' : '正在搜索文章大纲...',
        detail: language === 'en' ? 'Finding title and section summaries' : '查找标题和章节摘要'
      })
    }

    try {
      // Check if backend proxy is enabled
      const useBackend = backendClient.isBackendEnabled()
      logger.log('[generateArticleOutline] Using backend:', useBackend)

      let content = ''

      if (useBackend) {
        // Use backend proxy
        const response = await backendClient.generateArticleOutline({
          model: model,
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
        } else {
          throw new Error('Invalid backend response')
        }
      } else {
        // Use direct API call
        const apiConfig = getApiConfig(model, apiKeys || { glmApiKey: apiKey, deepseekApiKey: '' })

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

      if (!outlineData.title || !outlineData.sections || !Array.isArray(outlineData.sections) || outlineData.sections.length !== 5) {
        throw new Error('Invalid outline structure')
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
 * Expand a single section summary into full content
 * @param {Object} section - Section with index, title, summary, imagePrompt
 * @param {string} apiKey - API key (deprecated)
 * @param {string} language - Language
 * @param {string} model - Model to use
 * @param {Object} apiKeys - Object containing { glmApiKey, deepseekApiKey }
 * @returns {Promise<Object>} Expanded section with intro and subParagraphs
 */
function expandSection(section, apiKey, language = 'en', model = 'glm-4.7', apiKeys = null) {
  logger.log('[expandSection] START - Section:', section.title)
  logger.log('[expandSection] Language:', language)
  logger.log('[expandSection] Model:', model)

  return new Promise((resolve, reject) => {
    const systemPrompt = language === 'en'
      ? `You are an expert fly fishing writer. Expand the following section summary into a complete section.

Section Title: ${section.title}
Section Summary: ${section.summary}

Requirements:
- Write an introduction (2-4 sentences expanding on the summary)
- Create 4-6 detailed sub-paragraphs
- Each sub-paragraph should be 4-8 sentences with in-depth information
- Start each sub-paragraph with a number prefix like "1. ", "2. ", "3. " etc.
- Content must be practical, actionable, and highly informative
- Include specific techniques, tips, or examples
- Use clear, professional language
- CRITICAL: If the intro text contains numbered points or sections, use Roman numerals (I., II., III., IV., V., VI., etc.) instead of Arabic numbers (1., 2., 3.)

Output ONLY valid JSON in this format:
{
  "intro": "Introduction text here. If you include numbered points in the intro, use Roman numerals like I., II., III., IV., V., VI.",
  "subParagraphs": [
    "1. First detailed point with comprehensive information...",
    "2. Second detailed point with comprehensive information...",
    "3. Third detailed point with comprehensive information..."
  ]
}`
      : `你是一位资深的飞钓专家。将以下章节摘要扩展为完整章节。

章节标题：${section.title}
章节摘要：${section.summary}

要求：
- 撰写介绍（2-4句话，扩展摘要）
- 创建4-6个详细子段落
- 每个子段落应为4-8句话，包含深入信息
- 每个子段落以数字前缀开头，如"1. "、"2. "、"3. "等
- 内容必须实用、可操作且信息丰富
- 包含具体技巧、提示或示例
- 使用清晰、专业的语言
- 关键：如果介绍文本中包含编号要点或章节，请使用罗马数字（I.、II.、III.、IV.、V.、VI. 等）而不是阿拉伯数字（1.、2.、3.）

只输出以下格式的有效JSON：
{
  "intro": "介绍文本... 如果您在介绍中包含编号要点，请使用罗马数字，如 I.、II.、III.、IV.、V.、VI.",
  "subParagraphs": [
    "1. 第一个详细要点，包含全面信息...",
    "2. 第二个详细要点，包含全面信息...",
    "3. 第三个详细要点，包含全面信息..."
  ]
}`

    // Get API config based on model selection
    const apiConfig = getApiConfig(model, apiKeys || { glmApiKey: apiKey, deepseekApiKey: '' })

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

    wx.request({
      url: apiConfig.url,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiConfig.key}`
      },
      data: requestPayload,
      timeout: AI.TIMEOUT_EXPANSION,
      success: (response) => {
        logger.log('[expandSection] Response status:', response.statusCode)

        try {
          if (response.statusCode === 200 && response.data.choices && response.data.choices.length > 0) {
            let content = response.data.choices[0].message.content.trim()
            logger.log('[expandSection] Raw content length:', content.length)

            content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '')

            const sectionData = JSON.parse(content)
            logger.log('[expandSection] Parsed sectionData, subParagraphs count:', sectionData.subParagraphs?.length || 0)

            const result = {
              intro: sectionData.intro || section.summary,
              subParagraphs: sectionData.subParagraphs || [],
              imagePrompt: section.imagePrompt
            }
            logger.log('[expandSection] RESOLVING with subParagraphs count:', result.subParagraphs.length)
            resolve(result)
          } else {
            logger.error('[expandSection] API returned non-200 or no choices, Status code:', response.statusCode)
            // Fallback to original summary if API fails
            const fallback = {
              intro: section.summary,
              subParagraphs: [],
              imagePrompt: section.imagePrompt
            }
            logger.warn('[expandSection] FALLBACK - using empty subParagraphs')
            resolve(fallback)
          }
        } catch (error) {
          logger.error('[expandSection] Parse error:', error.message)
          // Fallback to original summary on parse error
          const fallback = {
            intro: section.summary,
            subParagraphs: [],
            imagePrompt: section.imagePrompt
          }
          logger.warn('[expandSection] FALLBACK (parse error) - using empty subParagraphs')
          resolve(fallback)
        }
      },
      fail: (error) => {
        logger.error('[expandSection] Network error:', error.errMsg || 'Unknown error')
        // Fallback to original summary on network error
        const fallback = {
          intro: section.summary,
          subParagraphs: [],
          imagePrompt: section.imagePrompt
        }
        logger.warn('[expandSection] FALLBACK (network error) - using empty subParagraphs')
        resolve(fallback)
      }
    })
  })
}

/**
 * Generate an image using BigModel's CogView-3-Flash API
 * @param {string} prompt - Image generation prompt
 * @param {string} apiKey - BigModel API key (deprecated, backend used when available)
 * @returns {Promise<string>} Image URL
 */
function generateImage(prompt, apiKey) {
  return new Promise(async (resolve, reject) => {
    try {
      let imageUrl = ''

      // Check if backend proxy is enabled
      const useBackend = backendClient.isBackendEnabled()
      logger.log('[generateImage] Using backend:', useBackend)

      if (useBackend) {
        // Use backend proxy
        imageUrl = await backendClient.generateImage(prompt, AI.IMAGE_SIZE)
        resolve(imageUrl)
      } else {
        // Use direct API call
        const requestPayload = {
          model: 'cogview-3-flash',
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
                reject(new Error('Invalid image API response'))
              }
            } catch (error) {
              reject(new Error(`Failed to parse image API response: ${error.message}`))
            }
          },
          fail: (error) => {
            reject(new Error(`Image API request failed: ${error.errMsg || 'Network error'}`))
          }
        })
      }
    } catch (error) {
      logger.error('[generateImage] Error:', error)
      reject(error)
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
async function generateHeroImage(title, category, apiKey, onProgress = null) {
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

    const imageUrl = await generateImage(prompt, apiKey)

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
  generateImage,
  generateImagesForParagraphs,
  generateHeroImage,
  generateAndInsertImages,
  parseMarkdownArticle,
  validateApiKey
}
