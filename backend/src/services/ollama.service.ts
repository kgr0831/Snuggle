import { env } from '../config/env.js'
import { logger } from '../utils/logger.js'

export interface GeneratedTheme {
  message: string
  sections: {
    html_template?: string
    custom_css: string
  }
}

// 기본 HTML 템플릿 (AI가 이를 기반으로 수정)
const DEFAULT_HTML_TEMPLATE = `
<div class="custom-skin-unified">
  <!-- Header -->
  <header class="blog-header">
    <div class="header-inner">
      <div class="header-left">
        <a href="/" class="logo">Snuggle</a>
        <span class="divider">/</span>
        <a href="/blog/{{blog_id}}" class="blog-name">{{blog_name}}</a>
      </div>
      <div class="header-right">
        <nav class="header-nav">
          <a href="/" class="nav-link">Home</a>
          <a href="/feed" class="nav-link">Feed</a>
        </nav>
      </div>
    </div>
  </header>

  <div class="blog-container">
    <!-- Main Content -->
    <main class="blog-main">
      <div class="post-list-area">
        {{#posts}}
          <article class="post-card">
            <a href="{{post_url}}" class="post-link">
              {{#if thumbnail_url}}<div class="thumbnail-wrap"><img src="{{thumbnail_url}}" class="post-thumb" /></div>{{/if}}
              <div class="post-content">
                <h2 class="post-title">{{post_title}}</h2>
                <p class="post-excerpt">{{post_excerpt}}</p>
                <div class="post-meta">
                  <span>{{post_date}}</span>
                  <span>Views {{view_count}}</span>
                </div>
              </div>
            </a>
          </article>
        {{/posts}}
      </div>
    </main>

    <!-- Sidebar -->
    <aside class="blog-sidebar">
      <div class="profile-card">
        {{#if profile_image}}<img src="{{profile_image}}" class="profile-img" />{{/if}}
        <h3 class="profile-name">{{blog_name}}</h3>
        <p class="profile-desc">{{blog_description}}</p>
        <div class="profile-stats">
          <div class="stat"><span>Posts</span><strong>{{post_count}}</strong></div>
          <div class="stat"><span>Visitors</span><strong>{{visitor_count}}</strong></div>
        </div>
      </div>
    </aside>
  </div>
</div>`

/**
 * Ollama 요청
 */
async function ollamaRequest(systemPrompt: string, userPrompt: string): Promise<string> {
  logger.info(`[Ollama] Requesting...`)

  const response = await fetch(`${env.ollama.baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: env.ollama.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      stream: false,
      format: 'json',
      options: { temperature: 0.7, num_predict: 8000 }, // Increased token limit for HTML
    }),
  })

  if (!response.ok) throw new Error(`Ollama error: ${response.status}`)
  const data = await response.json() as { message?: { content?: string } }
  const content = data.message?.content || ''
  logger.info(`[Ollama] Response length: ${content.length}`)
  return content
}

/**
 * 테마 생성 (HTML + CSS)
 */
// 기본 CSS (AI가 이를 기반으로 수정)
const DEFAULT_CSS = `
:root {
  --bg: #fafafa;
  --card: #ffffff;
  --text: #18181b;
  --text-secondary: #71717a;
  --accent: #7c3aed;
  --border: #e4e4e7;
  --shadow: rgba(0,0,0,0.05);
}

.custom-skin-unified {
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
}

/* Header */
.blog-header {
  background: var(--card);
  border-bottom: 1px solid var(--border);
  padding: 1rem 0;
}
.header-inner {
  max-width: 1024px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 1.5rem;
}
.header-left { display: flex; align-items: center; gap: 0.5rem; }
.logo { font-weight: 700; font-size: 1.125rem; }
.divider { color: var(--border); }
.blog-name { color: var(--text-secondary); }
.header-nav { display: flex; gap: 1rem; }
.nav-link { font-size: 0.875rem; color: var(--text-secondary); }
.nav-link:hover { color: var(--accent); }

/* Layout */
.blog-container {
  max-width: 1024px;
  margin: 2rem auto;
  padding: 0 1.5rem;
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 2rem;
}
.blog-main { min-width: 0; }

/* Posts */
.post-list-area { display: flex; flex-direction: column; gap: 1.5rem; }
.post-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  transition: transform 0.2s;
}
.post-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px var(--shadow); }
.post-link { display: block; text-decoration: none; color: inherit; }
.post-content { padding: 1.5rem; }
.post-title { margin: 0 0 0.5rem; font-size: 1.25rem; font-weight: 700; }
.post-excerpt { color: var(--text-secondary); font-size: 0.9375rem; line-height: 1.6; margin-bottom: 1rem; }
.post-meta { display: flex; gap: 0.75rem; font-size: 0.75rem; color: var(--text-secondary); }

/* Sidebar */
.profile-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
}
.profile-img { width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 1rem; object-fit: cover; }
.profile-name { margin: 0 0 0.5rem; font-weight: 700; }
.profile-desc { font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 1.5rem; }
.profile-stats { display: flex; justify-content: center; gap: 1.5rem; border-top: 1px solid var(--border); padding-top: 1.rem; }
.stat { display: flex; flex-direction: column; font-size: 0.75rem; color: var(--text-secondary); }
.stat strong { font-size: 1rem; color: var(--text); font-weight: 600; margin-top: 0.25rem; }

/* Footer */
.blog-footer { text-align: center; padding: 3rem 0; color: var(--text-secondary); font-size: 0.875rem; }

/* Responsive */
@media (max-width: 768px) {
  .blog-container { grid-template-columns: 1fr; }
  .blog-sidebar { order: -1; }
}
`


async function generateThemeData(userRequest: string): Promise<{ html: string; css: string }> {
  // 시스템 프롬프트: 기본 HTML을 제공하고, 이를 기반으로 HTML 구조와 CSS를 모두 수정하도록 요청
  const systemPrompt = `You are a Senior Web Designer.
Your task: Modify the provided HTML and CSS to create a beautiful blog theme matching the user's request.

=== BASE HTML (Must Maintain Key Structure) ===
${DEFAULT_HTML_TEMPLATE}

=== RULES ===
1. **HTML**: You can modify the HTML structure, classes, and content, but keep the core logic (Mustache templates like {{#posts}}).
2. **CSS**: Write beautiful, modern CSS. Use Google Fonts if needed.
3. **Response**: Return a JSON object with "html" and "css" fields.

=== USER REQUEST ===
"${userRequest}"
`

  // Request to Ollama
  const result = await ollamaRequest(systemPrompt, `Generate a theme for: "${userRequest}"`)
  logger.info(`[Ollama] Raw result: ${JSON.stringify(result)}`)

  // Clean Control Characters
  const cleanResult = result.replace(/[\u0000-\u001F\u007F-\u009F]/g, (c) => {
    if (c === '\n' || c === '\r' || c === '\t') return c
    return ''
  })

  try {
    // Remove Markdown Code Blocks
    const jsonStr = cleanResult.replace(/```json\n?|\n?```/g, '').trim()
    const parsed = JSON.parse(jsonStr)
    return {
      html: parsed.html || DEFAULT_HTML_TEMPLATE, // Fallback to default if empty
      css: parsed.css || '',
    }
  } catch {
    logger.error('Failed to parse AI response as JSON', cleanResult)

    // Fallback Regex Extraction
    const htmlMatch = cleanResult.match(/"html"\s*:\s*"([\s\S]*?)(?:"\s*,\s*"css|"\s*})/);
    const cssMatch = cleanResult.match(/"css"\s*:\s*"([\s\S]*?)(?:"\s*}|"\s*,|$)/);

    return {
      html: htmlMatch?.[1]?.replace(/\\n/g, '\n').replace(/\\"/g, '"') || DEFAULT_HTML_TEMPLATE,
      css: cssMatch?.[1]?.replace(/\\n/g, '\n').replace(/\\"/g, '"') || '',
    }
  }
}

/**
 * 테마 생성 메인 함수
 */
export async function generateTheme(userRequest: string): Promise<GeneratedTheme> {
  logger.info(`\n ========================================`)
  logger.info(`🎨 Theme Request: "${userRequest}"`)
  logger.info(`========================================\n`)

  logger.info(`[Generating Theme(HTML + CSS)...]`)
  const { html, css } = await generateThemeData(userRequest)

  if (!html && !css) {
    throw new Error('테마 생성 실패 (응답 없음)')
  }

  logger.info(`[Generation Done]HTML: ${html.length} chars, CSS: ${css.length} chars`)
  logger.info(`========================================\n`)

  return {
    message: `"${userRequest}" 테마를 만들었어요! \n(HTML 구조와 CSS가 함께 생성되었습니다)`,
    sections: {
      html_template: html,
      custom_css: css,
    },
  }
}

/**
 * Ollama 헬스체크
 */
export async function checkOllamaHealth(): Promise<{
  available: boolean
  model: string
  modelLoaded: boolean
}> {
  try {
    const response = await fetch(`${env.ollama.baseUrl} /api/tags`)
    if (!response.ok) return { available: false, model: env.ollama.model, modelLoaded: false }

    const tags = await response.json() as { models?: { name: string }[] }
    const modelLoaded = (tags.models || []).some(
      (m) => m.name === env.ollama.model || m.name.startsWith(`${env.ollama.model}: `)
    )

    return { available: true, model: env.ollama.model, modelLoaded }
  } catch {
    return { available: false, model: env.ollama.model, modelLoaded: false }
  }
}
