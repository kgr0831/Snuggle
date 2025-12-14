'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getForum, getComments, ForumPost, ForumComment } from '@/lib/api/forum'
import ProfileImage from '@/components/common/ProfileImage'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import CommentInput from '@/components/forum/CommentInput'
import CommentList from '@/components/forum/CommentList'

export default function ForumDetailPage() {
    const params = useParams()
    const forumId = params.id as string

    const [forum, setForum] = useState<ForumPost | null>(null)
    const [comments, setComments] = useState<ForumComment[]>([])
    const [loading, setLoading] = useState(true)
    const [user, setUser] = useState<any>(null)
    const [blogId, setBlogId] = useState<string | null>(null)

    const fetchData = useCallback(async () => {
        try {
            const [forumData, commentsData] = await Promise.all([
                getForum(forumId),
                getComments(forumId)
            ])
            setForum(forumData)
            setComments(commentsData)
        } catch (error) {
            console.error('Failed to load forum details:', error)
        } finally {
            setLoading(false)
        }
    }, [forumId])

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

            await fetchData()
        }
        init()
    }, [fetchData])

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-white dark:bg-black">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-black/20 border-t-black dark:border-white/20 dark:border-t-white" />
            </div>
        )
    }

    if (!forum) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-white dark:bg-black">
                <div className="text-black dark:text-white">게시글을 찾을 수 없습니다.</div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-white dark:bg-black">
            {/* Header */}
            <header className="border-b border-black/10 bg-white dark:border-white/10 dark:bg-black">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
                    <a href="/" className="text-xl font-bold text-black dark:text-white">
                        Snuggle
                    </a>
                </div>
            </header>

            <main className="mx-auto max-w-4xl px-6 py-10">
                {/* 게시글 헤더 */}
                <div className="mb-8 border-b border-black/10 pb-6 dark:border-white/10">
                    <div className="mb-4">
                        <span className="text-sm font-medium text-blue-500">자유</span>
                        <h1 className="mt-1 text-2xl font-bold text-black dark:text-white">{forum.title}</h1>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <ProfileImage
                                src={forum.blog?.thumbnail_url}
                                alt={forum.blog?.name || '작성자'}
                                fallback={forum.blog?.name || '작성자'}
                                size="sm"
                                rounded="full"
                            />
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-black dark:text-white">{forum.blog?.name}</span>
                                <span className="text-xs text-black/50 dark:text-white/50">
                                    {formatDistanceToNow(new Date(forum.created_at), { addSuffix: true, locale: ko })} · 조회 {forum.view_count || 0}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-black/50 dark:text-white/50">
                            <button>댓글 {comments.length}</button>
                        </div>
                    </div>
                </div>

                {/* 게시글 본문 */}
                <div className="min-h-[200px] whitespace-pre-wrap text-black dark:text-white mb-20">
                    {forum.description}
                </div>

                {/* 댓글 섹션 */}
                <div className="mb-10">
                    <h3 className="mb-4 font-bold text-black dark:text-white">
                        댓글 <span className="text-blue-500">{comments.length}</span>
                    </h3>
                    <CommentList comments={comments} />
                </div>

                {/* 댓글 입력창 (맨 밑에 고정 느낌) */}
                <div className="border-t border-black/10 pt-8 dark:border-white/10">
                    <CommentInput
                        forumId={forum.id}
                        user={user}
                        blogId={blogId}
                        onCommentCreated={fetchData}
                    />
                </div>
            </main >
        </div >
    )
}
