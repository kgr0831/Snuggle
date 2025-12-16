import { useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import ToolbarButton from './ToolbarButton'
import { uploadTempImage } from '@/lib/api/upload'

interface EditorToolbarProps {
    editor: Editor | null
    onImageUpload?: (url: string) => void
}

// 선택 영역의 서식 상태 확인 (전체 선택이 해당 마크를 가지고 있는지)
function isMarkFullyActive(editor: Editor, markName: string): boolean {
    const { from, to, empty } = editor.state.selection

    if (empty) {
        return editor.isActive(markName)
    }

    // 선택 영역의 모든 텍스트가 해당 마크를 가지고 있는지 확인
    let allHaveMark = true
    editor.state.doc.nodesBetween(from, to, (node) => {
        if (node.isText) {
            const mark = editor.schema.marks[markName]
            if (mark && !mark.isInSet(node.marks)) {
                allHaveMark = false
            }
        }
    })

    return allHaveMark
}

// 서식 토글 (전체 선택이 마크를 가지면 제거, 아니면 추가)
function handleToggleMark(editor: Editor, markName: string) {
    const isFullyActive = isMarkFullyActive(editor, markName)

    if (isFullyActive) {
        // 모든 텍스트가 마크를 가지고 있으면 제거
        editor.chain().focus().unsetMark(markName).run()
    } else {
        // 일부 또는 전체가 마크가 없으면 추가
        editor.chain().focus().setMark(markName).run()
    }
}

// 코드블록 토글 (여러 줄 선택 시 하나의 코드블록으로 생성)
function handleToggleCodeBlock(editor: Editor) {
    // 이미 코드블록 안에 있으면 해제
    if (editor.isActive('codeBlock')) {
        editor.chain().focus().toggleCodeBlock().run()
        return
    }

    const { from, to } = editor.state.selection

    // 선택 영역의 텍스트를 줄바꿈으로 연결하여 추출
    const textParts: string[] = []
    editor.state.doc.nodesBetween(from, to, (node) => {
        if (node.isTextblock) {
            textParts.push(node.textContent)
        }
    })

    if (textParts.length > 1) {
        // 여러 줄이 선택된 경우: 선택 영역 삭제 후 코드블록 삽입
        const content = textParts.join('\n')
        editor
            .chain()
            .focus()
            .deleteSelection()
            .insertContent({
                type: 'codeBlock',
                attrs: { language: 'javascript' },
                content: [{ type: 'text', text: content }],
            })
            .run()
    } else {
        // 단일 줄 또는 선택 없음: 기본 토글 사용
        editor.chain().focus().toggleCodeBlock().run()
    }
}

export default function EditorToolbar({ editor, onImageUpload }: EditorToolbarProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isUploading, setIsUploading] = useState(false)

    const handleImageClick = () => {
        fileInputRef.current?.click()
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0 || !editor) return

        setIsUploading(true)

        // 현재 커서 위치 저장
        const { from } = editor.state.selection
        let insertOffset = 0

        for (const file of Array.from(files)) {
            if (!file.type.startsWith('image/')) continue

            const url = await uploadTempImage(file)
            if (url) {
                // 저장된 위치 + 오프셋에 이미지 삽입
                const insertPos = from + insertOffset
                const { tr, schema } = editor.state
                const imageNode = schema.nodes.image.create({ src: url })

                editor.view.dispatch(tr.insert(insertPos, imageNode))
                onImageUpload?.(url)

                // 다음 이미지는 방금 삽입한 이미지 뒤에
                insertOffset += imageNode.nodeSize
            }
        }

        // 마지막 이미지 뒤로 커서 이동
        editor.commands.focus()

        setIsUploading(false)
        // 같은 파일 재선택 가능하도록 초기화
        e.target.value = ''
    }

    if (!editor) return null

    return (
        <div className="mb-4 flex flex-wrap items-center gap-1 border-b border-black/10 pb-4 dark:border-white/10">
            {/* 텍스트 스타일 */}
            <ToolbarButton
                onClick={() => handleToggleMark(editor, 'bold')}
                isActive={editor.isActive('bold')}
                title="굵게"
            >
                <span className="font-bold">B</span>
            </ToolbarButton>
            <ToolbarButton
                onClick={() => handleToggleMark(editor, 'italic')}
                isActive={editor.isActive('italic')}
                title="기울임"
            >
                <span className="italic">I</span>
            </ToolbarButton>
            <ToolbarButton
                onClick={() => handleToggleMark(editor, 'underline')}
                isActive={editor.isActive('underline')}
                title="밑줄"
            >
                <span className="underline">U</span>
            </ToolbarButton>
            <ToolbarButton
                onClick={() => handleToggleMark(editor, 'strike')}
                isActive={editor.isActive('strike')}
                title="취소선"
            >
                <span className="line-through">S</span>
            </ToolbarButton>

            <ToolbarDivider />

            {/* 제목 */}
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                isActive={editor.isActive('heading', { level: 1 })}
                title="제목 1"
            >
                H1
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                isActive={editor.isActive('heading', { level: 2 })}
                title="제목 2"
            >
                H2
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                isActive={editor.isActive('heading', { level: 3 })}
                title="제목 3"
            >
                H3
            </ToolbarButton>

            <ToolbarDivider />

            {/* 목록 */}
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                isActive={editor.isActive('bulletList')}
                title="글머리 기호"
            >
                <BulletListIcon />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                isActive={editor.isActive('orderedList')}
                title="번호 목록"
            >
                <OrderedListIcon />
            </ToolbarButton>

            <ToolbarDivider />

            {/* 블록 */}
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                isActive={editor.isActive('blockquote')}
                title="인용구"
            >
                <BlockquoteIcon />
            </ToolbarButton>
            <ToolbarButton
                onClick={() => handleToggleCodeBlock(editor)}
                isActive={editor.isActive('codeBlock')}
                title="코드 블록"
            >
                <CodeBlockIcon />
            </ToolbarButton>

            <ToolbarDivider />

            {/* 이미지 */}
            <ToolbarButton
                onClick={handleImageClick}
                isActive={false}
                title="이미지 추가"
                disabled={isUploading}
            >
                {isUploading ? <LoadingIcon /> : <ImageIcon />}
            </ToolbarButton>
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
            />
        </div>
    )
}

// 구분선 컴포넌트
function ToolbarDivider() {
    return <div className="mx-2 h-6 w-px bg-black/10 dark:bg-white/10" />
}

// 아이콘 컴포넌트들
function BulletListIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="9" y1="6" x2="20" y2="6" />
            <line x1="9" y1="12" x2="20" y2="12" />
            <line x1="9" y1="18" x2="20" y2="18" />
            <circle cx="4" cy="6" r="1.5" fill="currentColor" />
            <circle cx="4" cy="12" r="1.5" fill="currentColor" />
            <circle cx="4" cy="18" r="1.5" fill="currentColor" />
        </svg>
    )
}

function OrderedListIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="10" y1="6" x2="20" y2="6" />
            <line x1="10" y1="12" x2="20" y2="12" />
            <line x1="10" y1="18" x2="20" y2="18" />
            <text x="2" y="8" fontSize="8" fill="currentColor">1</text>
            <text x="2" y="14" fontSize="8" fill="currentColor">2</text>
            <text x="2" y="20" fontSize="8" fill="currentColor">3</text>
        </svg>
    )
}

function BlockquoteIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 17h3l2-4V7H5v6h3l-2 4zm8 0h3l2-4V7h-6v6h3l-2 4z" />
        </svg>
    )
}

function CodeBlockIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="16,18 22,12 16,6" />
            <polyline points="8,6 2,12 8,18" />
        </svg>
    )
}

function ImageIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
        </svg>
    )
}

function LoadingIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
        </svg>
    )
}

