'use client'

import { useState } from 'react'
import { Comment } from '@/lib/api/comments'
import { useUserStore } from '@/lib/store/useUserStore'
import CommentForm from './CommentForm'
import { useModal } from '@/components/common/Modal'

interface BlogInfo {
    id: string
    name: string
    thumbnail_url: string | null
}

interface CommentItemProps {
    comment: Comment
    replies: Comment[]
    allComments: Comment[] // 모든 댓글 (대대댓글 처리를 위해 필요할 수 있음)
    blogMap: Map<string, BlogInfo>
    onReply: (parentId: string, text: string) => Promise<void>
    onDelete: (commentId: string) => Promise<void>
}

export default function CommentItem({
    comment,
    replies,
    allComments,
    blogMap,
    onReply,
    onDelete
}: CommentItemProps) {
    const { user } = useUserStore()
    const { showAlert, showConfirm } = useModal()
    const [isReplying, setIsReplying] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const isAuthor = user?.id === comment.user_id

    // 댓글 작성자의 블로그 정보 가져오기
    const authorBlog = blogMap.get(comment.user_id)
    const displayName = authorBlog?.name || comment.profiles?.nickname || '알 수 없음'
    const displayImage = authorBlog?.thumbnail_url || comment.profiles?.profile_image_url

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        const now = new Date()
        const diff = (now.getTime() - date.getTime()) / 1000 // seconds

        if (diff < 60) return '방금 전'
        if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
        if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`

        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }

    const handleDelete = async () => {
        const confirmed = await showConfirm('댓글을 삭제하시겠습니까?')
        if (!confirmed) return

        setIsDeleting(true)
        try {
            await onDelete(comment.id)
        } catch (error) {
            console.error(error)
            await showAlert('삭제에 실패했습니다.')
            setIsDeleting(false)
        }
    }

    const handleReplySubmit = async (text: string) => {
        setIsSubmitting(true)
        try {
            await onReply(comment.id, text)
            setIsReplying(false)
        } catch (error) {
            console.error(error)
            await showAlert('답글 작성에 실패했습니다.')
        } finally {
            setIsSubmitting(false)
        }
    }

    // 대댓글 렌더링 (재귀)
    // 현재 댓글에 대한 답글들만 필터링해서 렌더링
    // replies prop은 이미 필터링된 배열임

    return (
        <div className="group py-4">
            {/* 댓글 내용 */}
            <div className="flex gap-3">
                {/* 프로필 이미지 */}
                <div className="shrink-0">
                    {displayImage ? (
                        <img
                            src={displayImage}
                            alt={displayName}
                            className="h-9 w-9 rounded-full object-cover border border-[var(--blog-border)]"
                        />
                    ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--blog-fg)]/10 text-sm font-bold text-[var(--blog-muted)]">
                            {(displayName || 'U').charAt(0)}
                        </div>
                    )}
                </div>

                <div className="flex-1">
                    {/* 헤더 */}
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-[var(--blog-fg)]">
                            {displayName}
                        </span>
                        <span className="text-xs text-[var(--blog-muted)]">
                            {formatDate(comment.created_at)}
                        </span>
                    </div>

                    {/* 본문 */}
                    <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--blog-fg)]/90 leading-relaxed">
                        {comment.comment_text}
                    </p>

                    {/* 액션 버튼 */}
                    <div className="mt-2 flex items-center gap-2">
                        <button
                            onClick={() => setIsReplying(!isReplying)}
                            className="text-xs font-medium text-[var(--blog-muted)] hover:text-[var(--blog-fg)]"
                        >
                            답글 달기
                        </button>
                        {isAuthor && (
                            <>
                                <span className="text-[var(--blog-border)]">|</span>
                                <button
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    className="text-xs text-red-500 hover:text-red-600"
                                >
                                    {isDeleting ? '삭제 중...' : '삭제'}
                                </button>
                            </>
                        )}
                    </div>

                    {/* 답글 작성 폼 */}
                    {isReplying && (
                        <div className="mt-3">
                            <CommentForm
                                onSubmit={handleReplySubmit}
                                onCancel={() => setIsReplying(false)}
                                placeholder={`@${displayName} 님에게 답글 달기`}
                                buttonLabel="답글 등록"
                                loading={isSubmitting}
                                autoFocus
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* 대댓글 리스트 */}
            {replies.length > 0 && (
                <div className="mt-3 pl-12 border-l-2 border-[var(--blog-border)]/30 ml-4">
                    {replies.map(reply => (
                        <CommentItem
                            key={reply.id}
                            comment={reply}
                            replies={allComments.filter(c => c.parent_id === reply.id)}
                            allComments={allComments}
                            blogMap={blogMap}
                            onReply={onReply}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
