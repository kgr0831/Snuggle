'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getMyBlogs, getDeletedBlogs, createBlog, deleteBlog, restoreBlog } from '@/lib/api/blogs'
import type { MyBlog, DeletedBlog } from '@/lib/api/blogs'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

export default function AccountPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [blogs, setBlogs] = useState<MyBlog[]>([])
    const [deletedBlogs, setDeletedBlogs] = useState<DeletedBlog[]>([])
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [newBlogName, setNewBlogName] = useState('')
    const [newBlogDescription, setNewBlogDescription] = useState('')
    const [createLoading, setCreateLoading] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        const checkAuth = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                router.push('/')
                return
            }

            await loadBlogs()
        }

        checkAuth()
    }, [router])

    const loadBlogs = async () => {
        try {
            setLoading(true)
            const [myBlogs, deleted] = await Promise.all([
                getMyBlogs(),
                getDeletedBlogs()
            ])
            setBlogs(myBlogs)
            setDeletedBlogs(deleted)
        } catch (err) {
            console.error('Failed to load blogs:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleCreateBlog = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newBlogName.trim()) {
            setError('블로그 이름을 입력해주세요')
            return
        }

        try {
            setCreateLoading(true)
            setError('')
            await createBlog({
                name: newBlogName.trim(),
                description: newBlogDescription.trim() || undefined
            })
            setNewBlogName('')
            setNewBlogDescription('')
            setShowCreateModal(false)
            await loadBlogs()
        } catch (err) {
            setError(err instanceof Error ? err.message : '블로그 생성에 실패했습니다')
        } finally {
            setCreateLoading(false)
        }
    }

    const handleDeleteBlog = async (id: string, name: string) => {
        if (!confirm(`"${name}" 블로그를 삭제하시겠습니까?\n삭제된 블로그는 휴지통에서 복구할 수 있습니다.`)) {
            return
        }

        try {
            await deleteBlog(id)
            await loadBlogs()
        } catch (err) {
            alert(err instanceof Error ? err.message : '블로그 삭제에 실패했습니다')
        }
    }

    const handleRestoreBlog = async (id: string) => {
        try {
            await restoreBlog(id)
            await loadBlogs()
        } catch (err) {
            alert(err instanceof Error ? err.message : '블로그 복구에 실패했습니다')
        }
    }

    const formatDate = (dateString: string) => {
        return format(new Date(dateString), 'yyyy.MM.dd', { locale: ko })
    }

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-white dark:bg-black">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-black/20 border-t-black dark:border-white/20 dark:border-t-white" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-white dark:bg-black">
            <div className="mx-auto max-w-2xl px-6 py-12">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-black dark:text-white">계정 관리</h1>
                        <p className="mt-1 text-sm text-black/50 dark:text-white/50">
                            블로그를 관리하세요
                        </p>
                    </div>
                    <button
                        onClick={() => router.push('/')}
                        className="text-sm text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
                    >
                        ← 홈으로
                    </button>
                </div>

                {/* My Blogs Section */}
                <section className="mt-10">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-black dark:text-white">
                            내 블로그 ({blogs.length}개)
                        </h2>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-1 rounded-full bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/80"
                        >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            새 블로그
                        </button>
                    </div>

                    {blogs.length === 0 ? (
                        <div className="mt-6 rounded-xl border border-black/10 bg-black/5 p-8 text-center dark:border-white/10 dark:bg-white/5">
                            <p className="text-black/50 dark:text-white/50">아직 블로그가 없습니다</p>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="mt-4 text-sm font-medium text-black underline dark:text-white"
                            >
                                첫 블로그 만들기
                            </button>
                        </div>
                    ) : (
                        <div className="mt-4 space-y-3">
                            {blogs.map((blog) => (
                                <div
                                    key={blog.id}
                                    className="group rounded-xl border border-black/10 p-4 transition-colors hover:border-black/20 dark:border-white/10 dark:hover:border-white/20"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <h3 className="font-medium text-black dark:text-white">{blog.name}</h3>
                                            {blog.description && (
                                                <p className="mt-1 text-sm text-black/50 dark:text-white/50 line-clamp-2">
                                                    {blog.description}
                                                </p>
                                            )}
                                            <p className="mt-2 text-xs text-black/40 dark:text-white/40">
                                                생성: {formatDate(blog.created_at)}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                                            <button
                                                onClick={() => router.push(`/blog/${blog.id}/settings`)}
                                                className="rounded-lg p-2 text-black/40 hover:bg-black/5 hover:text-black dark:text-white/40 dark:hover:bg-white/5 dark:hover:text-white"
                                                title="설정"
                                            >
                                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => handleDeleteBlog(blog.id, blog.name)}
                                                className="rounded-lg p-2 text-black/40 hover:bg-red-50 hover:text-red-500 dark:text-white/40 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                                                title="삭제"
                                            >
                                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Deleted Blogs Section (Trash) */}
                {deletedBlogs.length > 0 && (
                    <section className="mt-12">
                        <h2 className="text-lg font-semibold text-black dark:text-white">
                            🗑️ 휴지통 ({deletedBlogs.length}개)
                        </h2>
                        <p className="mt-1 text-xs text-black/40 dark:text-white/40">
                            삭제된 블로그를 복구할 수 있습니다
                        </p>

                        <div className="mt-4 space-y-3">
                            {deletedBlogs.map((blog) => (
                                <div
                                    key={blog.id}
                                    className="rounded-xl border border-black/10 bg-black/5 p-4 dark:border-white/10 dark:bg-white/5"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="font-medium text-black/60 dark:text-white/60">{blog.name}</h3>
                                            <p className="mt-1 text-xs text-black/40 dark:text-white/40">
                                                삭제: {formatDate(blog.deleted_at)}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleRestoreBlog(blog.id)}
                                            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/80"
                                        >
                                            복구
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>

            {/* Create Blog Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-zinc-900">
                        <h3 className="text-xl font-bold text-black dark:text-white">새 블로그 만들기</h3>

                        <form onSubmit={handleCreateBlog} className="mt-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-black dark:text-white">
                                    블로그 이름 *
                                </label>
                                <input
                                    type="text"
                                    value={newBlogName}
                                    onChange={(e) => setNewBlogName(e.target.value)}
                                    placeholder="나의 블로그"
                                    maxLength={30}
                                    className="mt-2 w-full rounded-lg border border-black/20 bg-transparent px-4 py-3 text-black outline-none focus:border-black dark:border-white/20 dark:text-white dark:focus:border-white"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-black dark:text-white">
                                    블로그 소개
                                </label>
                                <textarea
                                    value={newBlogDescription}
                                    onChange={(e) => setNewBlogDescription(e.target.value)}
                                    placeholder="블로그를 소개해주세요 (선택)"
                                    rows={3}
                                    maxLength={200}
                                    className="mt-2 w-full resize-none rounded-lg border border-black/20 bg-transparent px-4 py-3 text-black outline-none focus:border-black dark:border-white/20 dark:text-white dark:focus:border-white"
                                />
                            </div>

                            {error && (
                                <p className="text-sm text-red-500">{error}</p>
                            )}

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowCreateModal(false)
                                        setNewBlogName('')
                                        setNewBlogDescription('')
                                        setError('')
                                    }}
                                    className="rounded-lg px-4 py-2 text-sm font-medium text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    disabled={createLoading}
                                    className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
                                >
                                    {createLoading ? '생성 중...' : '만들기'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
