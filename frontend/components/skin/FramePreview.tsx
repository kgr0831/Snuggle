
import { useRef, useEffect } from 'react'

interface FramePreviewProps {
  html: string
  css: string
  title?: string
}

export default function FramePreview({ html, css, title = 'Preview' }: FramePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const doc = iframeRef.current?.contentDocument
    if (!doc) return

    // 기본 HTML 템플릿
    // Tailwind Preflight와 유사한 리셋 CSS를 추가해도 좋음
    const content = `
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${title}</title>
        <style>
          /* 기본 리셋 */
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
          img { max-width: 100%; height: auto; }
          a { text-decoration: none; color: inherit; }
          
          /* 사용자 정의 CSS */
          ${css}
        </style>
      </head>
      <body>
        <div class="custom-skin-unified">
          ${html}
        </div>
      </body>
      </html>
    `

    doc.open()
    doc.write(content)
    doc.close()
  }, [html, css, title])

  return (
    <div className="h-full w-full overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <iframe
        ref={iframeRef}
        title={title}
        className="h-full w-full border-0"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  )
}
