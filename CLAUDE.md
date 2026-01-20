# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HookedLee is a WeChat Mini Program that generates AI-powered fly fishing articles with accompanying images. The app uses multiple AI models (GLM-4.7 and DeepSeek-Chat) for content generation and BigModel's CogView-3-Flash for image generation.

**Important:** This codebase now focuses on AI-generated articles, NOT RSS feed fetching. The README.md contains outdated information about RSS fetching which is no longer the primary feature.

## Development Setup

1. **WeChat Developer Tools**: Required for development and testing
2. **API Keys**: Configure in `app.js`:
   - `bigModelApiKey`: BigModel API key (for GLM-4.7 and image generation)
   - `deepseekApiKey`: DeepSeek API key (optional, for DeepSeek-Chat model)

### Opening in WeChat Developer Tools

1. Launch WeChat Developer Tools
2. Import project and select this folder
3. AppID is configured in `project.config.json` (wx959be5518e08de0f)
4. For development without whitelist verification, enable "Do not verify legal domain names" in tools settings

## Architecture

### Multi-Model AI System

The app supports multiple AI models through a unified interface in `utils/bigmodel.js`:

- **GLM-4.7** (default): BigModel's language model
- **DeepSeek-Chat**: Alternative language model
- **Model Selection**: Stored in `app.globalData.selectedModel` and persisted via `wx.setStorageSync('selectedModel')`

The `getApiConfig()` function routes requests to the appropriate API endpoint based on model selection.

### Article Generation Pipeline

Located in `pages/index/index.js:generateCard()`:

1. **Outline Generation** (`generateArticleOutline`): Creates article structure with 5 sections
2. **Parallel Section Expansion** (`expandSection`): Each section expanded independently for speed
3. **Image Generation** (`generateImage`): CogView-3-Flash generates images for each section
4. **Hero Image** (`generateHeroImage`): Cover image based on title and category

All steps support progress callbacks for UI updates during generation.

### Data Flow

```
User clicks "Generate New Article"
    ↓
[Outline Generation] - Single API call to create structure
    ↓
[Parallel Processing] - 5 concurrent section expansions + 1 hero image
    ├─→ expandSection() for each of 5 sections
    └─→ generateHeroImage() in parallel
    ↓
[Image Generation] - generateImage() for each section (sequential)
    ↓
[Assembly] - Combine into cardData with paragraphs, images, references
    ↓
[Display] - Render in pages/index/index.wxml
```

### Key Files

- **app.js**: Global configuration, API keys, model selection, language settings
- **pages/index/index.js**: Main page logic, article generation orchestration
- **pages/settings/settings.js**: Model selection settings
- **utils/bigmodel.js**: Multi-model API integration, content and image generation
- **utils/categories.js**: Category definitions and prompts (add new categories here)
- **utils/rssfetcher.js**: Legacy RSS fetching (NO LONGER USED - kept for reference)

### Categories System

Categories are defined in `utils/categories.js` with three parallel structures:
- `categories`: Short labels for UI
- `categoryLabels`: Full display names
- `categoryPrompts`: AI prompts for each category

To add a new category, update all three objects in both English (`en`) and Chinese (`zh`).

## Bilingual Support

The app supports English and Chinese with toggle functionality in `pages/index/index.js:toggleLanguage()`.

- Language state: `app.globalData.language`
- UI strings: `i18n` object in `pages/index/index.js`
- Category strings: Separate objects in `utils/categories.js`
- Content language: Passed to AI generation functions

## Article Navigation

Articles are stored in navigation history (`wx.getStorageSync('navigationHistory')`) allowing users to navigate back/forward through generated articles using `goBackToPrevious()` and `goBackToNext()`.

## Common Tasks

### Add New Category

Edit `utils/categories.js`:
1. Add to `categories.en` and `categories.zh` (short labels)
2. Add to `categoryLabels.en` and `categoryLabels.zh` (display names)
3. Add to `categoryPrompts.en` and `categoryPrompts.zh` (AI prompts)
4. Add to `categoryPromptsData` in `utils/bigmodel.js` for article generation prompts

### Modify AI Prompts

- **Article structure**: Edit system prompts in `generateArticleOutline()` (utils/bigmodel.js:399-455)
- **Section expansion**: Edit system prompts in `expandSection()` (utils/bigmodel.js:554-594)
- **Image prompts**: Edit `generateHeroImage()` category prompts (utils/bigmodel.js:766-772)

### Change Generation Behavior

- **Number of sections**: Modify outline prompt requesting "5 sections"
- **Image size**: Change `size: '1024x1024'` in `generateImage()`
- **Model parameters**: Adjust `temperature`, `top_p`, `max_tokens` in API payloads

## API Endpoints

- **GLM-4.7**: `https://open.bigmodel.cn/api/paas/v4/chat/completions`
- **DeepSeek-Chat**: `https://api.deepseek.com/v1/chat/completions`
- **Image Generation**: `https://open.bigmodel.cn/api/paas/v4/images/generations`

For production deployment, whitelist these domains in WeChat Mini Program Console under "Server Domain Names".

## Security Notes

**WARNING**: API keys are stored client-side in `app.js`. This is acceptable for development but not production. For production:
1. Implement a backend proxy server
2. Have miniprogram call your backend
3. Backend makes AI API calls with proper rate limiting
4. Never expose API keys in client code

## WeChat Mini Program Specifics

- Storage: `wx.setStorageSync()` / `wx.getStorageSync()` for persistence
- Network: `wx.request()` for all API calls
- Navigation: `wx.navigateTo()` / `wx.navigateBack()` for page routing
- Toasts: `wx.showToast()` for user feedback
- Global state: `getApp().globalData` for app-wide data sharing
