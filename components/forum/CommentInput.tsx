'use client'

import React, { useState } from 'react'
import ProfileImage from '@/components/common/ProfileImage'
import { createClient } from '@/lib/supabase/client'
import { createComment } from '@/lib/api/forum'

interface CommentInputProps {
    forumId: string
    user: any
    blogId: string | null
    onCommentCreated: () => void
}

export default function CommentInput({ forumId, user, blogId, onCommentCreated }: CommentInputProps) {
    const [content, setContent] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!content.trim()) return
        if (!blogId) {
            alert('블로그가 있어야 댓글을 작성할 수 있습니다.')
            return
        }

        setLoading(true)
        try {
            await createComment({
                forum_id: forumId,
                user_id: user.id,
                blog_id: blogId,
                content,
            })
            setContent('')
            onCommentCreated()
        } catch (error) {
            console.error('Failed to create comment:', error)
            alert('댓글 작성에 실패했습니다.')
        } finally {
            setLoading(false)
        }
    }

    if (!user) {
        return (
            <div className="rounded-lg border border-black/10 bg-black/5 p-4 text-center text-sm text-black/50 dark:border-white/10 dark:bg-white/5 dark:text-white/50">
                로그인 후 댓글을 작성할 수 있습니다.
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="relative">
            <div className="mb-2 flex items-center gap-2">
                <span className="font-bold text-black dark:text-white">댓글 쓰기</span>
            </div>
            <div className="overflow-hidden rounded-lg border border-black/10 focus-within:border-black/30 dark:border-white/10 dark:focus-within:border-white/30">
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="저작권 등 다른 사람의 권리를 침해하거나 명예를 훼손하는 게시물은 이용약관 및 관련 법률에 의해 제재를 받을 수 있습니다."
                    className="h-24 w-full resize-none bg-white p-4 text-sm outline-none dark:bg-black dark:text-white"
                />
                <div className="flex items-center justify-between border-t border-black/10 bg-gray-50 px-4 py-2 dark:border-white/10 dark:bg-white/5">
                    <div className="flex gap-2">
                        {/* 아이콘 버튼들 (생략) */}
                    </div>
                    <button
                        type="submit"
                        disabled={loading || !content.trim()}
                        className="rounded bg-black px-4 py-1.5 text-xs font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
                    >
                        등록
                    </button>
                </div>
            </div>
        </form>
    )
}
