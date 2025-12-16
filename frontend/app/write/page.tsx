'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEditor, EditorContent, ReactNodeViewRenderer, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Dropcursor from '@tiptap/extension-dropcursor'
import { all, createLowlight } from 'lowlight'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import CodeBlockComponent from '@/components/write/CodeBlockComponent'
import { uploadTempImage, deleteTempImage } from '@/lib/api/upload'
import { createPost, getPost, updatePost } from '@/lib/api/posts'
import { getCategories, createCategory } from '@/lib/api/categories'
import { useModal } from '@/components/common/Modal'
import { useBlogStore } from '@/lib/store/useBlogStore'

// highlight.js 커스텀 테마 (라이트/다크 모드 지원)
import '@/styles/highlight-theme.css'

// lowlight 인스턴스 생성 (모든 언어 포함)
const lowlight = createLowlight(all)

// localStorage 키


// temp 이미지 URL 패턴 (R2 public URL)
const TEMP_IMAGE_PATTERN = /temp\/[^/]+\/[^"'\s]+/

// HTML에서 temp 이미지 URL 추출
function extractTempImageUrls(html: string): string[] {
    const imgRegex = /<img[^>]+src=["']([^"']+)["']/g
    const urls: string[] = []
    let match

    while ((match = imgRegex.exec(html)) !== null) {
        if (TEMP_IMAGE_PATTERN.test(match[1])) {
            urls.push(match[1])
        }
    }

    return urls
}

// HTML에서 모든 이미지 URL 추출
function extractAllImageUrls(html: string): string[] {
    const imgRegex = /<img[^>]+src=["']([^"']+)["']/g
    const urls: string[] = []
    let match

    while ((match = imgRegex.exec(html)) !== null) {
        urls.push(match[1])
    }

    return urls
}

// 분리된 컴포넌트들
import WriteHeader from '@/components/write/WriteHeader'
import EditorToolbar from '@/components/write/EditorToolbar'

import TitleInput from '@/components/write/TitleInput'
import CategorySelector from '@/components/write/CategorySelector'
import PublishDrawer from '@/components/write/PublishDrawer'

// 에디터 전용 스타일
import '@/components/write/editor.css'

interface Category {
    id: string
    name: string
}



// 파일 크기 포맷 함수
function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// 드래그 중인 이미지 정보
interface DragImageInfo {
    name: string
    size: string
    preview: string | null
}

function WriteContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const editPostId = searchParams.get('id')
    const isEditMode = !!editPostId
    const { showAlert, showConfirm } = useModal()

    // 블로그 스토어 사용
    const { selectedBlog: blog, fetchBlogs, isLoading: isBlogLoading } = useBlogStore()

    const [user, setUser] = useState<User | null>(null)
    const [title, setTitle] = useState('')
    const [categoryIds, setCategoryIds] = useState<string[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [initialContent, setInitialContent] = useState('')

    // 드래그 오버레이 상태
    const [isDragging, setIsDragging] = useState(false)
    const [dragImages, setDragImages] = useState<DragImageInfo[]>([])
    const [uploadingImages, setUploadingImages] = useState<{ id: string; name: string; size: string }[]>([])
    const dragCounterRef = useRef(0)

    // 업로드된 이미지 URL 추적
    const uploadedImagesRef = useRef<Set<string>>(new Set())
    const isInitializedRef = useRef(false)

    // 초기 데이터 로딩 (인증 체크 & 수정 모드일 때 데이터 가져오기)
    useEffect(() => {
        const init = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                router.push('/')
                return
            }

            setUser(user)

            // 블로그 스토어에서 블로그 로드
            await fetchBlogs(user.id)

            // 수정 모드: 기존 글 데이터 불러오기
            if (isEditMode) {
                try {
                    const postData = await getPost(editPostId)
                    if (postData) {
                        // 본인 글인지 확인
                        if (postData.user_id !== user.id) {
                            await showAlert('수정 권한이 없습니다.')
                            router.back()
                            return
                        }
                        setTitle(postData.title)
                        setInitialContent(postData.content)
                        // 다중 카테고리 지원: categories 배열 사용, 없으면 기존 category 사용
                        const catIds = postData.categories?.map(c => c.id) || (postData.category ? [postData.category.id] : [])
                        setCategoryIds(catIds)

                        // 기존 이미지들도 추적 대상에 추가
                        const existingImages = extractTempImageUrls(postData.content)
                        existingImages.forEach(url => uploadedImagesRef.current.add(url))
                    }
                } catch (err) {
                    console.error('Failed to load post for edit:', err)
                    await showAlert('게시글을 불러오는데 실패했습니다.')
                    router.back()
                    return
                }
            } else {
                // 작성 모드
            }

            setLoading(false)
        }

        init()
    }, [router, isEditMode, editPostId, fetchBlogs, showAlert])

    // 블로그가 없으면 블로그 생성 페이지로 이동
    useEffect(() => {
        if (!isBlogLoading && !blog && user) {
            router.push('/create-blog')
        }
    }, [isBlogLoading, blog, user, router])

    // 선택된 블로그 변경 시 카테고리 로딩
    useEffect(() => {
        const loadCategories = async () => {
            if (!blog) return
            try {
                const categoryData = await getCategories(blog.id)
                setCategories(categoryData.map(c => ({ id: c.id, name: c.name })))
            } catch (err) {
                console.error('Failed to load categories:', err)
            }
        }
        loadCategories()
    }, [blog])

    // 블로그 변경 시 카테고리 로드 및 블로그 없으면 리다이렉트
    useEffect(() => {
        if (isBlogLoading) return

        // 블로그가 없으면 생성 페이지로
        if (!blog && user) {
            router.push('/create-blog')
            return
        }

        // 블로그가 있으면 카테고리 로드
        if (blog) {
            getCategories(blog.id)
                .then(categoryData => {
                    setCategories(categoryData.map(c => ({ id: c.id, name: c.name })))
                })
                .catch(err => {
                    console.error('Failed to load categories:', err)
                })
        }
    }, [blog, isBlogLoading, user, router])

    // 에디터에 초기 콘텐츠 설정
    useEffect(() => {
        if (editor && initialContent && !isInitializedRef.current) {
            editor.commands.setContent(initialContent)
            isInitializedRef.current = true
        }
    }, [initialContent])

    // Tiptap 에디터 설정
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                codeBlock: false, // CodeBlockLowlight 사용을 위해 비활성화
            }),
            CodeBlockLowlight.extend({
                addNodeView() {
                    return ReactNodeViewRenderer(CodeBlockComponent)
                },
                addKeyboardShortcuts() {
                    return {
                        'Tab': ({ editor }) => {
                            const { $from } = editor.state.selection
                            const node = $from.node($from.depth)

                            // 코드블록 안에 있는지 확인
                            if (node.type.name === 'codeBlock') {
                                editor.commands.insertContent('  ')
                                return true
                            }
                            return false
                        },
                        'Shift-Tab': ({ editor }) => {
                            const { $from } = editor.state.selection
                            const node = $from.node($from.depth)

                            // 코드블록 안에 있는지 확인
                            if (node.type.name === 'codeBlock') {
                                // 현재 줄의 시작 위치에서 2칸 공백 제거
                                const { state } = editor
                                const { from } = state.selection
                                const lineStart = state.doc.resolve(from).start()
                                const textBefore = state.doc.textBetween(lineStart, from)

                                if (textBefore.startsWith('  ')) {
                                    editor.commands.deleteRange({ from: lineStart, to: lineStart + 2 })
                                }
                                return true
                            }
                            return false
                        },
                        'Mod-a': ({ editor }) => {
                            const { $from } = editor.state.selection
                            const node = $from.node($from.depth)

                            // 코드블록 안에 있는지 확인
                            if (node.type.name === 'codeBlock') {
                                const pos = $from.before($from.depth)
                                const nodeSize = node.nodeSize
                                editor.commands.setTextSelection({
                                    from: pos + 1,
                                    to: pos + nodeSize - 1,
                                })
                                return true
                            }
                            return false
                        },
                    }
                },
            }).configure({
                lowlight,
                defaultLanguage: 'javascript',
            }),
            Underline,
            Image.configure({
                HTMLAttributes: {
                    class: 'max-w-full rounded-lg',
                },
            }),
            Dropcursor.configure({
                color: '#3b82f6',
                width: 3,
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-blue-500 underline',
                },
            }),
            Placeholder.configure({
                placeholder: '내용을 입력하세요...',
            }),
        ],
        content: '',
        immediatelyRender: false,
        editorProps: {
            attributes: {
                class: 'prose prose-lg dark:prose-invert max-w-none focus:outline-none min-h-[500px]',
            },
            handleDrop: (view, event, _slice, moved) => {
                if (!moved && event.dataTransfer?.files.length) {
                    const files = Array.from(event.dataTransfer.files)
                    const imageFiles = files.filter(file => file.type.startsWith('image/'))

                    if (imageFiles.length > 0) {
                        event.preventDefault()
                        setIsDragging(false)
                        setDragImages([])

                        // 드롭 위치 계산
                        const coordinates = view.posAtCoords({
                            left: event.clientX,
                            top: event.clientY,
                        })
                        const dropPos = coordinates?.pos || view.state.selection.from

                        // 업로드 중인 이미지 목록에 추가
                        const uploadItems = imageFiles.map((file, index) => ({
                            id: `upload-${Date.now()}-${index}`,
                            name: file.name,
                            size: formatFileSize(file.size),
                        }))
                        setUploadingImages(prev => [...prev, ...uploadItems])

                        // 순차적으로 업로드하고 드롭 위치에 삽입
                        let insertOffset = 0
                        const uploadAndInsert = async () => {
                            for (let i = 0; i < imageFiles.length; i++) {
                                const file = imageFiles[i]
                                const uploadItem = uploadItems[i]

                                const url = await uploadTempImage(file)

                                // 업로드 완료 - 목록에서 제거
                                setUploadingImages(prev => prev.filter(img => img.id !== uploadItem.id))

                                if (url) {
                                    uploadedImagesRef.current.add(url)

                                    // 드롭 위치 + 오프셋에 이미지 삽입
                                    const { schema, tr } = view.state
                                    const imageNode = schema.nodes.image.create({ src: url })
                                    const insertPos = Math.min(dropPos + insertOffset, view.state.doc.content.size)
                                    const transaction = tr.insert(insertPos, imageNode)
                                    view.dispatch(transaction)

                                    // 다음 이미지는 방금 삽입한 이미지 뒤에
                                    insertOffset += imageNode.nodeSize
                                }
                            }
                        }

                        uploadAndInsert()
                        return true
                    }
                }
                return false
            },
            handlePaste: (view, event) => {
                const items = event.clipboardData?.items
                if (!items) return false

                const imageItems = Array.from(items).filter(
                    item => item.type.startsWith('image/')
                )

                if (imageItems.length > 0) {
                    event.preventDefault()

                    imageItems.forEach(async (item) => {
                        const file = item.getAsFile()
                        if (file) {
                            const url = await uploadTempImage(file)
                            if (url && view.state) {
                                // 업로드된 이미지 추적
                                uploadedImagesRef.current.add(url)

                                const { schema } = view.state
                                const node = schema.nodes.image.create({ src: url })
                                const transaction = view.state.tr.replaceSelectionWith(node)
                                view.dispatch(transaction)
                            }
                        }
                    })

                    return true
                }

                return false
            },
        },
        onUpdate: ({ editor }) => {
            if (!isEditMode) {
                // 현재 에디터의 이미지 URL 추출
                const currentContent = editor.getHTML()
                const currentImages = new Set(extractTempImageUrls(currentContent))

                // 삭제된 이미지 찾기 및 R2에서 삭제
                uploadedImagesRef.current.forEach(url => {
                    if (!currentImages.has(url)) {
                        deleteTempImage(url)
                        uploadedImagesRef.current.delete(url)
                    }
                })
            }
        },
    })

    // 에디터 초기화 Effect (중복 제거됨, 위 useEffect 통합)
    useEffect(() => {
        if (editor && initialContent && !isInitializedRef.current) {
            editor.commands.setContent(initialContent)
            isInitializedRef.current = true
        }
    }, [editor, initialContent])



    // 새 카테고리 추가
    const handleAddCategory = async (name: string): Promise<Category | null> => {
        if (!blog) return null

        try {
            const data = await createCategory(blog.id, name)
            const newCategory = { id: data.id, name: data.name }
            setCategories(prev => [...prev, newCategory].sort((a, b) => a.name.localeCompare(b.name)))
            return newCategory
        } catch (err) {
            const message = err instanceof Error ? err.message : '카테고리 추가 실패'
            showAlert(message)
            return null
        }
    }



    // 발행 서랍 상태
    const [isDrawerOpen, setIsDrawerOpen] = useState(false)

    // 발행하기 버튼 클릭 -> 서랍 열기
    const handlePublishClick = async () => {
        if (!title.trim()) {
            await showAlert('제목을 입력해주세요.')
            return
        }

        const content = editor?.getHTML()
        if (!content || content === '<p></p>' || !content.trim()) {
            await showAlert('내용을 입력해주세요.')
            return
        }

        setIsDrawerOpen(true)
    }

    // 최종 발행 (서랍에서 확인 클릭 시)
    const handleConfirmPublish = async (options: {
        isPrivate: boolean
        allowComments: boolean
        thumbnailUrl: string | null
    }) => {
        if (!editor || !blog) return

        const content = editor.getHTML()
        setSaving(true)
        setIsDrawerOpen(false)

        try {
            if (isEditMode && editPostId) {
                // 수정
                await updatePost(editPostId, {
                    title: title.trim(),
                    content: content,
                    category_ids: categoryIds,
                    is_private: options.isPrivate,
                    is_allow_comment: options.allowComments,
                    thumbnail_url: options.thumbnailUrl,
                })
                await showAlert('게시글이 수정되었습니다.')
            } else {
                // 생성
                await createPost({
                    blog_id: blog.id,
                    title: title.trim(),
                    content: content,
                    category_ids: categoryIds,
                    published: true, // published는 true로 고정하되, is_private로 제어
                    is_private: options.isPrivate,
                    is_allow_comment: options.allowComments,
                    thumbnail_url: options.thumbnailUrl,
                })

                // 발행 성공 시 초안 삭제
                // clearDraft() // Removed
            }

            // 블로그 홈 또는 해당 글 상세로 이동
            if (isEditMode) {
                router.push(`/post/${editPostId}`)
            } else {
                router.push(`/blog/${blog.id}`)
            }

        } catch (error) {
            console.error(isEditMode ? '수정 실패:' : '발행 실패:', error)
            await showAlert((isEditMode ? '수정' : '발행') + '에 실패했습니다. 다시 시도해주세요.')
        } finally {
            setSaving(false)
        }
    }

    // 페이지 레벨 드래그 핸들러
    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        dragCounterRef.current++

        if (e.dataTransfer?.items) {
            const items = Array.from(e.dataTransfer.items)
            const imageItems = items.filter(item => item.type.startsWith('image/'))

            if (imageItems.length > 0) {
                setIsDragging(true)

                // 파일 정보 추출 (드래그 중에는 파일 접근 제한이 있음)
                const files = Array.from(e.dataTransfer.files)
                if (files.length > 0) {
                    const imageInfos: DragImageInfo[] = files
                        .filter(f => f.type.startsWith('image/'))
                        .map(f => ({
                            name: f.name,
                            size: formatFileSize(f.size),
                            preview: URL.createObjectURL(f)
                        }))
                    setDragImages(imageInfos)
                }
            }
        }
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        dragCounterRef.current--

        if (dragCounterRef.current === 0) {
            setIsDragging(false)
            // 미리보기 URL 해제
            dragImages.forEach(img => {
                if (img.preview) URL.revokeObjectURL(img.preview)
            })
            setDragImages([])
        }
    }, [dragImages])

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
    }, [])

    const handlePageDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        dragCounterRef.current = 0
        // 에디터 영역에 드랍되면 에디터 handleDrop에서 처리
    }, [])

    // 로딩 상태
    if (loading || isBlogLoading || !blog) {
        return <></>
    }

    return (
        <div
            className="min-h-screen bg-white dark:bg-black"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handlePageDrop}
        >
            {/* 상단 헤더 */}
            <WriteHeader
                onBack={() => router.back()}
                // onSave={handleSave} // Removed
                onPublish={handlePublishClick} // 이전 handlePublish 대신 handlePublishClick 사용
                saving={saving}
                isEdit={isEditMode} // 헤더에 수정 모드 전달 (버튼 텍스트 변경 등)
            />

            {/* 에디터 영역 */}
            <main className="mx-auto max-w-3xl px-6 py-10">
                {/* 제목 입력 */}
                <TitleInput value={title} onChange={setTitle} />

                {/* 카테고리 선택 */}
                <div className="mt-4">
                    <CategorySelector
                        categories={categories}
                        selectedIds={categoryIds}
                        onChange={setCategoryIds}
                        onAddCategory={handleAddCategory}
                        maxSelection={5}
                    />
                </div>

                {/* 구분선 */}
                <div className="my-6 h-px bg-black/10 dark:bg-white/10" />

                {/* 툴바 */}
                <EditorToolbar
                    editor={editor}
                    onImageUpload={(url) => uploadedImagesRef.current.add(url)}
                />

                {/* Tiptap 에디터 */}
                <EditorContent editor={editor} className="min-h-[500px]" />
            </main>

            {/* 발행 옵션 서랍 */}
            <PublishDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                onConfirm={handleConfirmPublish}
                initialValues={{
                    isPrivate: false,
                    allowComments: true,
                    thumbnailUrl: null,
                }}
                contentImages={editor ? extractAllImageUrls(editor.getHTML()) : []}
            />

            {/* 드래그 오버레이 */}
            {isDragging && (
                <div className="pointer-events-none fixed inset-0 z-50">
                    {/* 반투명 배경 */}
                    <div className="absolute inset-0 bg-blue-500/10" />

                    {/* 테두리 효과 */}
                    <div className="absolute inset-4 rounded-2xl border-4 border-dashed border-blue-500/50" />

                    {/* 중앙 안내 */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="rounded-2xl bg-white/95 px-8 py-6 shadow-2xl backdrop-blur dark:bg-neutral-900/95">
                            <div className="mb-3 flex justify-center">
                                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                                    <svg className="h-7 w-7 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                            </div>
                            <p className="text-center text-base font-semibold text-black dark:text-white">
                                이미지를 놓으세요
                            </p>
                            {dragImages.length > 0 && (
                                <p className="mt-1 text-center text-sm text-black/60 dark:text-white/60">
                                    {dragImages.length}개 · {dragImages.map(d => d.size).join(', ')}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 업로드 진행 상태 */}
            {uploadingImages.length > 0 && (
                <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
                    <div className="flex flex-col gap-2">
                        {uploadingImages.map((img) => (
                            <div
                                key={img.id}
                                className="flex items-center gap-3 rounded-full bg-black px-4 py-2.5 text-white shadow-lg dark:bg-white dark:text-black"
                            >
                                <svg className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" strokeWidth="2" />
                                    <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" strokeWidth="2" />
                                </svg>
                                <span className="max-w-[200px] truncate text-sm">{img.name}</span>
                                <span className="text-xs opacity-60">{img.size}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

export default function WritePage() {
    return (
        <Suspense fallback={<></>}>
            <WriteContent />
        </Suspense>
    )
}
