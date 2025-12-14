'use client'

import React from 'react'
import ProfileImage from '@/components/common/ProfileImage'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { ForumPost } from '@/lib/api/forum'

interface ForumItemProps {
    post: ForumPost
    isOpen: boolean
    onToggle: () => void
}

import ForumExpandedView from './ForumExpandedView'

export default function ForumItem({ post, isOpen, onToggle }: ForumItemProps) {
    return (
        <div className="border-b border-black/10 py-5 last:border-0 dark:border-white/10">
            <div className="flex cursor-pointer items-start gap-4 transition-colors hover:bg-black/5 dark:hover:bg-white/5 p-2 rounded-lg -mx-2" onClick={onToggle}>
                {/* 블로거 프로필 (작성자) */}
                <div className="flex-shrink-0 pt-1">
                    <ProfileImage
                        src={post.blog?.thumbnail_url}
                        alt={post.blog?.name || '작성자'}
                        fallback={post.blog?.name || '작성자'}
                        size="sm"
                        rounded="full"
                    />
                </div>

                <div className="flex-1">
                    <div className="group block">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-blue-500 dark:text-blue-400">
                                {/* 카테고리나 태그가 있다면 표시, 없으면 '자유' 등 */}
                                자유
                            </span>
                            <h3 className="font-semibold text-black dark:text-white">
                                {post.title}
                            </h3>
                            {post.comment_count !== undefined && post.comment_count > 0 && (
                                <span className="text-xs font-bold text-red-500">
                                    [{post.comment_count}]
                                </span>
                            )}
                            {/* Hot 태그 예시 (댓글 5개 이상) */}
                            {post.comment_count !== undefined && post.comment_count >= 5 && (
                                <span className="text-[10px] font-bold text-red-500 bg-red-100 dark:bg-red-900/30 px-1 rounded">hot</span>
                            )}
                        </div>

                        <div className="mt-1 flex items-center gap-2 text-xs text-black/50 dark:text-white/50">
                            <span className="font-medium text-black/70 dark:text-white/70">
                                {post.blog?.name}
                            </span>
                            <span>·</span>
                            <span>
                                {formatDistanceToNow(new Date(post.created_at), {
                                    addSuffix: true,
                                    locale: ko,
                                })}
                            </span>
                            <span>·</span>
                            <span>조회 {post.view_count || 0}</span>
                        </div>
                    </div>
                </div>
            </div>

            {isOpen && (
                <ForumExpandedView forum={post} />
            )}
        </div>
    )
}


