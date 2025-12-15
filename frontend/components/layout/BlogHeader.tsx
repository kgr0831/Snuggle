'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { useUserStore } from '@/lib/store/useUserStore'
import LoginModal from '@/components/auth/LoginModal'
import UserMenu from '@/components/auth/UserMenu'
import ThemeToggle from '@/components/common/ThemeToggle'

interface BlogHeaderProps {
    blogName?: string
    blogId?: string
}

export default function BlogHeader({ blogName, blogId }: BlogHeaderProps) {
    const pathname = usePathname()
    const { user } = useUserStore()
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)

    return (
        <>
            <header
                className="relative z-40 border-b"
                style={{
                    backgroundColor: 'var(--blog-bg)',
                    borderColor: 'var(--blog-border)',
                }}
            >
                <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
                    {/* Logo */}
                    <div className="relative z-10 flex items-center gap-6">
                        <a
                            href="/"
                            className="text-xl font-bold transition-opacity hover:opacity-70"
                            style={{ color: 'var(--blog-fg)' }}
                        >
                            Snuggle
                        </a>

                        {/* Blog Name Divider */}
                        {blogName && (
                            <>
                                <span
                                    className="text-lg"
                                    style={{ color: 'var(--blog-muted)' }}
                                >
                                    /
                                </span>
                                <a
                                    href={blogId ? `/blog/${blogId}` : '#'}
                                    className="text-lg font-medium transition-opacity hover:opacity-70"
                                    style={{ color: 'var(--blog-fg)' }}
                                >
                                    {blogName}
                                </a>
                            </>
                        )}
                    </div>

                    {/* Navigation - Absolutely centered */}
                    <nav className="absolute left-1/2 flex -translate-x-1/2 items-center gap-8">
                        <a
                            href="/"
                            className="text-sm font-medium transition-opacity hover:opacity-70"
                            style={{
                                color: pathname === '/' ? 'var(--blog-fg)' : 'var(--blog-muted)',
                                fontWeight: pathname === '/' ? 700 : 500,
                            }}
                        >
                            홈
                        </a>
                        <a
                            href="/feed"
                            className="text-sm font-medium transition-opacity hover:opacity-70"
                            style={{
                                color: pathname === '/feed' ? 'var(--blog-fg)' : 'var(--blog-muted)',
                                fontWeight: pathname === '/feed' ? 700 : 500,
                            }}
                        >
                            피드
                        </a>
                        <a
                            href="/skins"
                            className="text-sm font-medium transition-opacity hover:opacity-70"
                            style={{
                                color: pathname.startsWith('/skins') ? 'var(--blog-fg)' : 'var(--blog-muted)',
                                fontWeight: pathname.startsWith('/skins') ? 700 : 500,
                            }}
                        >
                            스킨
                        </a>
                        <a
                            href="/forum"
                            className="text-sm font-medium transition-opacity hover:opacity-70"
                            style={{
                                color: pathname.startsWith('/forum') ? 'var(--blog-fg)' : 'var(--blog-muted)',
                                fontWeight: pathname.startsWith('/forum') ? 700 : 500,
                            }}
                        >
                            포럼
                        </a>
                    </nav>

                    {/* Actions */}
                    <div className="relative z-10 flex items-center gap-3">
                        {/* Theme Toggle */}
                        <ThemeToggle variant="blog" />

                        {/* User Menu / Login */}
                        {user ? (
                            <UserMenu variant="blog" />
                        ) : (
                            <button
                                type="button"
                                onClick={() => setIsLoginModalOpen(true)}
                                className="rounded-full px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
                                style={{
                                    backgroundColor: 'var(--blog-accent)',
                                    color: 'var(--blog-bg)',
                                }}
                            >
                                시작하기
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <LoginModal
                isOpen={isLoginModalOpen}
                onClose={() => setIsLoginModalOpen(false)}
            />
        </>
    )
}
