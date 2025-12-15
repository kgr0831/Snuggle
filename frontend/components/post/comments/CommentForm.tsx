'use client'

import { useState, useEffect } from 'react'
import { useUserStore } from '@/lib/store/useUserStore'
import { createClient } from '@/lib/supabase/client'
import { useModal } from '@/components/common/Modal'

interface CommentFormProps {
    onSubmit: (text: string) => Promise<void>
    placeholder?: string
    buttonLabel?: string
    loading?: boolean
    autoFocus?: boolean
    onCancel?: () => void
}

interface MyBlog {
    name: string
    thumbnail_url: string | null
}

export default function CommentForm({
    onSubmit,
    placeholder = '내용을 입력하세요.',
    buttonLabel = '등록',
    loading = false,
    autoFocus = false,
    onCancel
}: CommentFormProps) {
    const { user } = useUserStore()
    const { showAlert } = useModal()
    const [text, setText] = useState('')
    const [myBlog, setMyBlog] = useState<MyBlog | null>(null)
    const [isBlogLoading, setIsBlogLoading] = useState(true)

    // 내 블로그 정보 직접 가져오기
    useEffect(() => {
        const fetchMyBlog = async () => {
            if (!user) {
                setIsBlogLoading(false)
                return
            }

            const supabase = createClient()

            // localStorage에서 선택된 블로그 ID 확인
            const savedBlogId = localStorage.getItem('snuggle_selected_blog_id')

            let query = supabase
                .from('blogs')
                .select('name, thumbnail_url')
                .eq('user_id', user.id)
                .is('deleted_at', null)

            if (savedBlogId) {
                // 선택된 블로그가 있으면 해당 블로그 가져오기
                query = query.eq('id', savedBlogId)
            }

            const { data } = await query.limit(1)

            if (data && data.length > 0) {
                setMyBlog(data[0])
            }
            setIsBlogLoading(false)
        }

        fetchMyBlog()
    }, [user])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!text.trim() || loading) return

        if (!user) {
            await showAlert('로그인이 필요합니다.')
            return
        }

        await onSubmit(text)
        setText('')
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Shift + Enter for new line, Enter to submit
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmit(e)
        }
    }

    // 내 블로그 이름 사용, 없으면 user_metadata에서 가져오기
    const displayName = myBlog?.name || user?.user_metadata?.nickname || user?.user_metadata?.name || 'User'
    const profileImage = myBlog?.thumbnail_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture

    return (
        <form onSubmit={handleSubmit} className="relative">
            {!user ? (
                <div className="flex h-24 w-full items-center justify-center rounded-lg border border-[var(--blog-border)] bg-[var(--blog-card-bg)] text-[var(--blog-muted)]">
                    로그인 후 댓글을 작성할 수 있습니다.
                </div>
            ) : (
                <div className="rounded-lg border border-[var(--blog-border)] bg-[var(--blog-card-bg)] p-4 focus-within:ring-1 focus-within:ring-[var(--blog-fg)]">
                    <div className="mb-2 flex items-center gap-2">
                        {isBlogLoading ? (
                            <>
                                <div className="h-6 w-6 rounded-full bg-[var(--blog-fg)]/10 animate-pulse" />
                                <div className="h-4 w-16 rounded bg-[var(--blog-fg)]/10 animate-pulse" />
                            </>
                        ) : (
                            <>
                                {profileImage ? (
                                    <img src={profileImage} alt={displayName} className="h-6 w-6 rounded-full object-cover" />
                                ) : (
                                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--blog-fg)]/10 text-xs font-bold text-[var(--blog-muted)]">
                                        {(displayName || 'U').charAt(0)}
                                    </div>
                                )}
                                <span className="text-sm font-bold text-[var(--blog-fg)]">{displayName}</span>
                            </>
                        )}
                    </div>
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        className="w-full resize-none bg-transparent text-sm text-[var(--blog-fg)] placeholder-[var(--blog-muted)] outline-none"
                        rows={3}
                        autoFocus={autoFocus}
                    />
                    <div className="mt-2 flex items-center justify-end gap-2">
                        {onCancel && (
                            <button
                                type="button"
                                onClick={onCancel}
                                className="rounded px-3 py-1.5 text-xs text-[var(--blog-muted)] hover:text-[var(--blog-fg)]"
                            >
                                취소
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={!text.trim() || loading}
                            className={`rounded px-4 py-1.5 text-xs font-bold transition-colors ${text.trim() && !loading
                                ? 'bg-[var(--blog-fg)] text-[var(--blog-bg)] hover:opacity-90'
                                : 'cursor-not-allowed bg-[var(--blog-border)] text-[var(--blog-muted)]'
                                }`}
                        >
                            {loading ? '등록 중...' : buttonLabel}
                        </button>
                    </div>
                </div>
            )}
        </form>
    )
}
