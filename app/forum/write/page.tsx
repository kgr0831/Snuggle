'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createForum } from '@/lib/api/forum'

export default function ForumWritePage() {
    const router = useRouter()
    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')
    const [loading, setLoading] = useState(false)
    const [user, setUser] = useState<any>(null)
    const [blogId, setBlogId] = useState<string | null>(null)

    useEffect(() => {
        const init = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                alert('로그인이 필요합니다.')
                router.push('/forum')
                return
            }
            setUser(user)

            // Fetch user's blog id
            const { data: blog } = await supabase
                .from('blogs')
                .select('id')
                .eq('user_id', user.id)
                .single()

            if (blog) {
                setBlogId(blog.id)
            } else {
                alert('블로그가 있어야 포럼에 글을 쓸 수 있습니다.')
                router.push('/create-blog')
            }
        }
        init()
    }, [router])

    const handleSubmit = async () => {
        if (!title.trim() || !content.trim()) {
            alert('제목과 내용을 입력해주세요.')
            return
        }
        if (!user || !blogId) return

        setLoading(true)
        try {
            await createForum({
                title,
                description: content, // Schema used 'description' for content
                user_id: user.id,
                blog_id: blogId
            })
            router.push('/forum')
        } catch (error) {
            console.error('Failed to create forum:', error)
            alert('글 작성에 실패했습니다.')
        } finally {
            setLoading(false)
        }
    }

    if (!user) return null

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
                <h1 className="mb-8 text-2xl font-bold text-black dark:text-white">포럼 글쓰기</h1>

                <div className="rounded-lg border border-black/10 bg-white dark:border-white/10 dark:bg-black">
                    {/* 제목 입력 */}
                    <div className="flex items-center border-b border-black/10 px-6 py-4 dark:border-white/10">
                        <label className="w-16 font-medium text-black dark:text-white">제목</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="제목을 입력하세요"
                            className="flex-1 bg-transparent text-sm outline-none placeholder:text-black/30 dark:text-white dark:placeholder:text-white/30"
                            maxLength={30}
                        />
                        <span className="text-xs text-black/30 dark:text-white/30">
                            {title.length}/30
                        </span>
                    </div>

                    {/* 내용 입력 */}
                    <div className="flex items-start border-b border-black/10 px-6 py-4 dark:border-white/10">
                        <label className="mt-1 w-16 font-medium text-black dark:text-white">내용</label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="내용을 입력하세요 하루에 3개까지 작성 가능합니다"
                            className="h-64 flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-black/30 dark:text-white dark:placeholder:text-white/30"
                            maxLength={1000}
                        />
                        <span className="self-start text-xs text-black/30 dark:text-white/30">
                            {content.length}/1000
                        </span>
                    </div>
                </div>

                <div className="mt-8 flex justify-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="rounded-full border border-black/10 px-8 py-3 text-sm font-medium text-black hover:bg-black/5 dark:border-white/10 dark:text-white dark:hover:bg-white/5"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="rounded-full bg-black/30 px-8 py-3 text-sm font-medium text-white hover:bg-black/40 disabled:opacity-50 dark:bg-white/30 dark:hover:bg-white/40"
                    >
                        {loading ? '등록 중...' : '등록'}
                    </button>
                </div>
            </main>
        </div>
    )
}
