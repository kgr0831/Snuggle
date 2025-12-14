'use client'

import { useState, useCallback, useEffect } from 'react'
import { ForumPost, ForumComment, getComments } from '@/lib/api/forum'
import CommentList from './CommentList'
import CommentInput from './CommentInput'
import { createClient } from '@/lib/supabase/client'

interface ForumExpandedViewProps {
    forum: ForumPost
}

export default function ForumExpandedView({ forum }: ForumExpandedViewProps) {
    const [comments, setComments] = useState<ForumComment[]>([])
    const [loading, setLoading] = useState(true)
    const [user, setUser] = useState<any>(null)
    const [blogId, setBlogId] = useState<string | null>(null)

    const fetchComments = useCallback(async () => {
        try {
            const data = await getComments(forum.id)
            setComments(data)
        } catch (error) {
            console.error('Failed to load comments:', error)
        } finally {
            setLoading(false)
        }
    }, [forum.id])

    useEffect(() => {
        const init = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)

            if (user) {
                const { data: blog } = await supabase
                    .from('blogs')
                    .select('id')
                    .eq('user_id', user.id)
                    .single()
                if (blog) setBlogId(blog.id)
            }

            await fetchComments()
        }
        init()
    }, [fetchComments])

    return (
        <div className="mt-6 border-t border-black/5 pt-6 dark:border-white/5">
            {/* 본문 */}
            <div className="min-h-[100px] whitespace-pre-wrap text-black dark:text-white mb-10">
                {forum.description}
            </div>

            {/* 댓글 섹션 */}
            <div className="mb-6">
                <h3 className="mb-4 font-bold text-black dark:text-white text-sm">
                    댓글 <span className="text-blue-500">{comments.length}</span>
                </h3>
                {loading ? (
                    <div className="py-4 text-center">
                        <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black dark:border-white/20 dark:border-t-white" />
                    </div>
                ) : (
                    <CommentList comments={comments} />
                )}
            </div>

            {/* 댓글 입력창 */}
            <div>
                <CommentInput
                    forumId={forum.id}
                    user={user}
                    blogId={blogId}
                    onCommentCreated={fetchComments}
                />
            </div>
        </div>
    )
}
