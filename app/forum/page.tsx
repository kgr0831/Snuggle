'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getForums, ForumPost } from '@/lib/api/forum'
import ForumItem from '@/components/forum/ForumItem'
import { createClient } from '@/lib/supabase/client'

export default function ForumListPage() {
    const router = useRouter()
    const [forums, setForums] = useState<ForumPost[]>([])
    const [loading, setLoading] = useState(true)
    const [isLoggedIn, setIsLoggedIn] = useState(false)

    const [expandedId, setExpandedId] = useState<string | null>(null)

    useEffect(() => {
        const init = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            setIsLoggedIn(!!user)

            try {
                const data = await getForums()
                setForums(data)
            } catch (error) {
                console.error('Failed to load forums:', error)
            } finally {
                setLoading(false)
            }
        }
        init()
    }, [])

    const handleWriteClick = () => {
        if (!isLoggedIn) {
            alert('로그인이 필요합니다.')
            return
        }
        router.push('/forum/write')
    }

    const handleToggle = (id: string) => {
        setExpandedId(prev => prev === id ? null : id)
    }

    return (
        <div className="min-h-screen bg-white dark:bg-black">
            {/* Header (Reused style from Feed/Home) */}
            <header className="relative z-40 border-b border-black/10 bg-white dark:border-white/10 dark:bg-black">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
                    <div className="relative flex items-center">
                        <a href="/" className="text-xl font-bold text-black dark:text-white">
                            Snuggle
                        </a>
                    </div>
                    {/* Navigation - Duplicated from Home slightly, or ideally componentized, 
              but for now simple links to keep context. In a real app we'd use a shared Layout/Header component.
           */}
                    <nav className="flex items-center gap-8">
                        <a href="/" className="text-sm font-medium text-black/60 dark:text-white/60">홈</a>
                        <a href="/feed" className="text-sm font-medium text-black/60 dark:text-white/60">피드</a>
                        <a href="/forum" className="text-sm font-medium text-black dark:text-white">포럼</a>
                        <a href="/skins" className="text-sm font-medium text-black/60 dark:text-white/60">스킨</a>
                    </nav>
                </div>
            </header>

            <main className="mx-auto max-w-4xl px-6 py-10">
                <div className="mb-6 flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-black dark:text-white">포럼</h1>
                    <button
                        onClick={handleWriteClick}
                        className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/80"
                    >
                        글쓰기
                    </button>
                </div>

                {/* Tab / Filter (Optional based on design image "전체 | 블로그 소개 | ...") */}
                {/* Tab / Filter */}
                <div className="mb-6 flex gap-6 border-b border-black/10 text-sm font-medium dark:border-white/10">
                    <button className="border-b-2 border-black pb-3 text-black dark:border-white dark:text-white">
                        전체
                    </button>
                </div>

                {/* List */}
                {loading ? (
                    <div className="py-20 text-center">
                        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-black/20 border-t-black dark:border-white/20 dark:border-t-white" />
                    </div>
                ) : forums.length > 0 ? (
                    <div className="space-y-1">
                        {forums.map((forum) => (
                            <ForumItem
                                key={forum.id}
                                post={forum}
                                isOpen={expandedId === forum.id}
                                onToggle={() => handleToggle(forum.id)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="py-20 text-center text-black/50 dark:text-white/50">
                        등록된 글이 없습니다.
                    </div>
                )}
            </main>
        </div>
    )
}
