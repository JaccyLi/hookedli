// pages/articles/articles.js
const articlesList = require('./articles-list.js')

const i18n = {
  en: {
    title: 'Featured Articles',
    subtitle: 'Explore our curated fly fishing content',
    back: 'Back',
    readMore: 'Read More',
    share: 'Share',
    tableOfContents: 'Table of Contents'
  },
  zh: {
    title: '精选文章',
    subtitle: '探索我们策划的飞钓内容',
    back: '返回',
    readMore: '阅读更多',
    share: '分享',
    tableOfContents: '目录'
  }
}

// Simple markdown to HTML parser
function parseMarkdownToHtml(markdown) {
  if (!markdown) return ''

  let html = markdown

  // Parse images first - handle both ![](path) and ![alt](path)
  html = html.replace(/!\[(.*?)\]\(([^)]+)\)/gim, '<img src="https://suosuoli.com/img/ffi-casting/$2" alt="$1" style="width: 100%; border-radius: 8px; margin: 16px 0;" />')
  html = html.replace(/!\[\]\(([^)]+)\)/gim, '<img src="https://suosuoli.com/img/ffi-casting/$1" alt="FFI Casting Diagram" style="width: 100%; border-radius: 8px; margin: 16px 0;" />')

  // Parse headers (## to h2, ### to h3)
  html = html.replace(/^### (.*$)/gim, '<h3 style="font-size: 18px; font-weight: bold; margin: 20px 0 10px;">$1</h3>')
  html = html.replace(/^## (.*$)/gim, '<h2 style="font-size: 20px; font-weight: bold; margin: 25px 0 15px; color: #333;">$1</h2>')
  html = html.replace(/^# (.*$)/gim, '<h1 style="font-size: 24px; font-weight: bold; margin: 30px 0 20px;">$1</h1>')

  // Parse bold and italic
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
  html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>')

  // Parse line breaks
  html = html.replace(/\n\n/g, '</p><p style="margin: 10px 0; line-height: 1.6;">')
  html = '<p style="margin: 10px 0; line-height: 1.6;">' + html + '</p>'

  return html
}

Page({
  data: {
    language: 'en',
    uiText: {},
    articles: [],
    currentArticle: null,
    showArticleDetail: false,
    loading: true
  },

  onLoad() {
    const app = getApp()
    const savedLanguage = app.globalData.language || 'en'

    // Parse markdown content for each article
    const articlesWithContent = articlesList.articlesData.map(article => {
      const result = Object.assign({}, article)
      result.tagColors = article.tags.reduce((acc, tag) => {
        acc[tag] = this.getTagColor(tag)
        return acc
      }, {})

      // Get markdown content from separate article files
      const articleEn = require('./articles/' + article.markdownFile.en)
      const articleZh = require('./articles/' + article.markdownFile.zh)
      const markdownEn = articleEn || ''
      const markdownZh = articleZh || ''

      // Convert markdown to HTML
      result.content = {
        en: parseMarkdownToHtml(markdownEn),
        zh: parseMarkdownToHtml(markdownZh)
      }

      return result
    })

    this.setData({
      language: savedLanguage,
      articles: articlesWithContent
    })

    this.updateUIText()
    this.setData({ loading: false })
  },

  updateUIText() {
    this.setData({
      uiText: i18n[this.data.language]
    })
  },

  getTagColor(tag) {
    const colors = {
      casting: '#FF6B6B',
      tying: '#4ECDC4',
      anglingBio: '#45B7D1',
      gear: '#FFA07A'
    }
    return colors[tag] || '#95E1D3'
  },

  openArticle(e) {
    const articleId = e.currentTarget.dataset.id
    const article = this.data.articles.find(a => a.id === articleId)

    if (article) {
      this.setData({
        currentArticle: article,
        showArticleDetail: true
      })

      wx.pageScrollTo({
        scrollTop: 0,
        duration: 300
      })
    }
  },

  closeArticle() {
    this.setData({
      showArticleDetail: false,
      currentArticle: null
    })
  },

  goBack() {
    if (this.data.showArticleDetail) {
      this.closeArticle()
    } else {
      wx.navigateBack()
    }
  },

  onShow() {
    const app = getApp()
    if (app.globalData.language !== this.data.language) {
      this.setData({
        language: app.globalData.language
      })
      this.updateUIText()
    }
  }
})
