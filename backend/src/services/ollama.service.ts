import { env } from '../config/env.js'
import { logger } from '../utils/logger.js'

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface OllamaStreamChunk {
  model: string
  created_at: string
  message: {
    role: string
    content: string
  }
  done: boolean
}

/**
 * Build system prompt for custom skin editor AI assistant
 */
export function buildSystemPrompt(
  activeSection: string,
  currentCode: string
): string {
  const sectionType = activeSection === 'custom_css' ? 'CSS' : 'HTML'

  const sectionNames: Record<string, string> = {
    html_head: 'Head (메타태그/폰트)',
    html_header: '헤더 (상단 네비게이션)',
    html_post_list: '게시글 목록',
    html_post_item: '게시글 아이템 (반복 템플릿)',
    html_post_detail: '게시글 상세',
    html_sidebar: '사이드바',
    html_footer: '푸터',
    custom_css: '커스텀 CSS',
  }

  const sectionName = sectionNames[activeSection] || activeSection

  const sectionGuide: Record<string, string> = {
    html_head: `<head> 태그 내부에 들어갈 내용입니다.
- Google Fonts 등 외부 폰트 import
- 외부 CSS 라이브러리 (예: FontAwesome 아이콘)
- SEO를 위한 메타 태그는 시스템에서 자동 처리하므로 작성하지 않아도 됩니다.`,

    html_header: `블로그 상단 네비게이션 영역입니다.
- 블로그 로고/이름 ({{blog_name}} 사용)
- 메뉴 네비게이션 링크
- 검색 버튼, 다크모드 토글 등 액션 버튼
- 모바일 햄버거 메뉴 고려`,

    html_post_list: `게시글 목록을 표시하는 메인 영역입니다.
- {{#posts}}...{{/posts}} 루프로 게시글 순회
- 내부에서 {{> post_item}} 파셜을 사용하여 각 아이템 렌더링
- 그리드/리스트 레이아웃 선택
- 게시글이 없을 때 표시할 빈 상태 UI`,

    html_post_item: `목록에서 반복되는 개별 게시글 아이템 템플릿입니다.
- {{#posts}} 루프 내에서 사용됨
- 게시글 변수에 직접 접근 가능 ({{post_title}}, {{thumbnail_url}} 등)
- 카드 형태 또는 리스트 형태로 디자인
- 호버 효과, 썸네일 이미지 처리`,

    html_post_detail: `개별 게시글 상세 페이지입니다.
- {{post_title}}: 게시글 제목
- {{post_content}}: 본문 내용 (HTML 형식)
- {{post_date}}: 작성일
- {{category_name}}: 카테고리
- {{view_count}}, {{like_count}}: 조회수, 좋아요 수
- 이전글/다음글 네비게이션, 공유 버튼 등`,

    html_sidebar: `사이드바 영역입니다.
- 블로그 프로필 ({{profile_image}}, {{blog_name}}, {{blog_description}})
- 카테고리 목록 ({{#categories}}...{{/categories}})
- 통계 정보 ({{post_count}}, {{subscriber_count}}, {{visitor_count}})
- 최근 게시글, 태그 클라우드 등 위젯`,

    html_footer: `하단 푸터 영역입니다.
- 저작권 표시 ({{current_year}} 사용)
- SNS 링크, 연락처 정보
- 서비스 관련 링크
- 간결하게 유지`,

    custom_css: `블로그 전체 스타일링을 담당합니다.
- 반드시 CSS 변수를 사용하여 테마 색상 적용
- 다크모드는 CSS 변수로 자동 전환되므로 별도 처리 불필요
- 모바일 반응형 필수 (@media 쿼리)
- 부드러운 트랜지션으로 인터랙션 향상`,
  }

  return `당신은 Snuggle 블로그 플랫폼의 커스텀 스킨 제작을 돕는 시니어 프론트엔드 개발자입니다.
사용자가 원하는 디자인을 구현할 수 있도록 아름답고 실용적인 HTML/CSS 코드를 작성해주세요.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 현재 편집 중인 섹션: ${sectionName}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${sectionGuide[activeSection] || ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎨 테마 CSS 변수 (필수 사용)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

색상을 지정할 때 반드시 아래 CSS 변수를 사용하세요.
사용자가 테마를 변경하면 자동으로 색상이 바뀝니다.

var(--blog-bg)       /* 배경색 */
var(--blog-fg)       /* 텍스트 색상 */
var(--blog-accent)   /* 강조색 (링크, 버튼 등) */
var(--blog-muted)    /* 보조 텍스트 색상 */
var(--blog-border)   /* 테두리 색상 */
var(--blog-card-bg)  /* 카드 배경색 */

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 사용 가능한 템플릿 변수
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【블로그 정보】
{{blog_id}}          - 블로그 고유 ID
{{blog_name}}        - 블로그 이름
{{blog_description}} - 블로그 설명
{{profile_image}}    - 프로필 이미지 URL
{{post_count}}       - 전체 게시글 수
{{subscriber_count}} - 구독자 수
{{visitor_count}}    - 오늘 방문자 수
{{current_year}}     - 현재 연도 (예: 2024)

【게시글 정보】
{{post_id}}          - 게시글 고유 ID
{{post_title}}       - 게시글 제목
{{post_content}}     - 본문 내용 (HTML, 상세페이지 전용)
{{post_excerpt}}     - 요약/발췌문
{{post_date}}        - 작성일 (포맷팅됨)
{{thumbnail_url}}    - 썸네일 이미지 URL
{{category_name}}    - 카테고리명
{{view_count}}       - 조회수
{{like_count}}       - 좋아요 수

【제어 구문】
{{#posts}}...{{/posts}}         - 게시글 배열 순회
{{#categories}}...{{/categories}} - 카테고리 배열 순회
{{#if 변수명}}...{{/if}}         - 조건부 렌더링
{{> post_item}}                  - 게시글 아이템 파셜 삽입

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 현재 코드
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`\`\`${sectionType.toLowerCase()}
${currentCode || '(아직 작성된 코드가 없습니다)'}
\`\`\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ 코드 작성 가이드라인
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. **시맨틱 HTML**: <article>, <nav>, <section>, <aside> 등 의미있는 태그 사용
2. **모던 CSS**: Flexbox, Grid를 적극 활용. float 사용 지양
3. **테마 색상**: 절대로 색상값을 하드코딩하지 말고 CSS 변수 사용
4. **반응형**: 모바일 우선 설계, 768px, 1024px 브레이크포인트 활용
5. **접근성**: aria-label, alt 속성, 충분한 색상 대비
6. **인터랙션**: hover, focus 상태에 부드러운 transition 적용
7. **성능**: 불필요한 중첩 지양, 효율적인 셀렉터 사용

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💬 응답 방식
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- 항상 완성된, 바로 사용 가능한 코드를 제공하세요
- 코드 블록은 \`\`\`html 또는 \`\`\`css로 감싸주세요
- 코드가 무엇을 하는지 간단히 설명해주세요
- 수정 요청시 전체 코드를 보여주세요 (부분 코드 X)
- 더 나은 대안이 있다면 제안해주세요
- 한국어로 자연스럽게 대화해주세요

사용자가 "Insert" 버튼을 누르면 코드가 바로 에디터에 삽입됩니다.
완성도 높은 프로덕션 수준의 코드를 작성해주세요!`
}

/**
 * Stream chat completion from Ollama
 */
export async function streamChatCompletion(
  messages: OllamaMessage[],
  onChunk: (chunk: string) => void,
  onError: (error: Error) => void,
  onDone: () => void
): Promise<void> {
  try {
    const response = await fetch(`${env.ollama.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: env.ollama.model,
        messages,
        stream: true,
        options: {
          temperature: 0.7,
          top_p: 0.9,
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`)
    }

    if (!response.body) {
      throw new Error('No response body from Ollama')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        onDone()
        break
      }

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n').filter((line) => line.trim())

      for (const line of lines) {
        try {
          const data: OllamaStreamChunk = JSON.parse(line)

          if (data.message?.content) {
            onChunk(data.message.content)
          }

          if (data.done) {
            onDone()
            return
          }
        } catch {
          // Skip invalid JSON lines (partial chunks)
          continue
        }
      }
    }
  } catch (error) {
    logger.error('Ollama stream error:', error)
    onError(error instanceof Error ? error : new Error('Unknown error'))
  }
}

/**
 * Check if Ollama is available and model is loaded
 */
export async function checkOllamaHealth(): Promise<{
  available: boolean
  model: string
  modelLoaded: boolean
}> {
  try {
    // Check if Ollama is running
    const tagsResponse = await fetch(`${env.ollama.baseUrl}/api/tags`, {
      method: 'GET',
    })

    if (!tagsResponse.ok) {
      return { available: false, model: env.ollama.model, modelLoaded: false }
    }

    const tags = (await tagsResponse.json()) as { models?: { name: string }[] }
    const models = tags.models || []
    const modelLoaded = models.some(
      (m: { name: string }) =>
        m.name === env.ollama.model || m.name.startsWith(`${env.ollama.model}:`)
    )

    return {
      available: true,
      model: env.ollama.model,
      modelLoaded,
    }
  } catch (error) {
    logger.error('Ollama health check failed:', error)
    return { available: false, model: env.ollama.model, modelLoaded: false }
  }
}
