'use client'

import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import ProfileImage from '@/components/common/ProfileImage'
import { ForumComment } from '@/lib/api/forum'

interface CommentListProps {
    comments: ForumComment[]
}

export default function CommentList({ comments }: CommentListProps) {
    if (comments.length === 0) return null

    return (
        <div className="space-y-6">
            {comments.map((comment) => (
                <div key={comment.id} className="flex gap-4">
                    <div className="flex-shrink-0">
                        <ProfileImage
                            src={comment.blog?.thumbnail_url}
                            alt={comment.blog?.name || '작성자'}
                            fallback={comment.blog?.name || '작성자'}
                            size="sm"
                            rounded="full"
                        />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 text-sm">
                            <span className="font-bold text-black dark:text-white">
                                {comment.blog?.name || '알 수 없음'}
                            </span>
                            <span className="text-xs text-black/50 dark:text-white/50">
                                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ko })}
                            </span>
                        </div>
                        <p className="mt-1 text-sm text-black dark:text-white whitespace-pre-wrap">
                            {comment.content}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    )
}
