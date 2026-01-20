// pages/articles/articles-list.js
// Article metadata with markdown file paths
const articlesData = [
  {
    id: 1,
    title: {
      en: 'FFI Fly Casting Definitions: The Complete Guide',
      zh: 'FFI飞钓抛投定义：完整指南'
    },
    summary: {
      en: 'Official FFI casting definitions covering loops, mechanics, techniques, and physics for mastering fly casting.',
      zh: '官方FFI抛投定义，涵盖线环、力学、技巧和物理学，助您掌握飞钓抛投。'
    },
    tags: ['casting'],
    category: 'fly casting',
    imageUrl: 'https://suosuoli.com/img/ffi-casting/Casting_Plane_InPlaneLoop.png',
    readTime: {
      en: '15 min read',
      zh: '15分钟阅读'
    },
    markdownFile: {
      en: 'ffi-casting-definitions.en.js',
      zh: 'ffi-casting-definitions.zh.js'
    }
  }
]

module.exports = {
  articlesData: articlesData,
  getArticleCount: function() {
    return articlesData.length
  }
}
