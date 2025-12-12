'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Post {
  id: string
  title: string
  content: string
  published: boolean
  created_at: string
  updated_at: string
}

interface BlogPostListProps {
  blogId: string
  isOwner: boolean
}

export default function BlogPostList({ blogId, isOwner }: BlogPostListProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPosts = async () => {
      const supabase = createClient()

      let query = supabase
        .from('posts')
        .select('*')
        .eq('blog_id', blogId)
        .order('created_at', { ascending: false })

      // 소유자가 아니면 published 된 것만
      if (!isOwner) {
        query = query.eq('published', true)
      }

      const { data, error } = await query

      if (!error && data) {
        setPosts(data)
      }
      setLoading(false)
    }

    fetchPosts()
  }, [blogId, isOwner])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const getExcerpt = (content: string, maxLength: number = 150) => {
    const plainText = content.replace(/<[^>]*>/g, '').replace(/\n/g, ' ')
    if (plainText.length <= maxLength) return plainText
    return plainText.slice(0, maxLength) + '...'
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-2xl border border-black/10 p-6 dark:border-white/10"
          >
            <div className="h-6 w-3/4 rounded bg-black/10 dark:bg-white/10" />
            <div className="mt-3 h-4 w-full rounded bg-black/10 dark:bg-white/10" />
            <div className="mt-2 h-4 w-2/3 rounded bg-black/10 dark:bg-white/10" />
          </div>
        ))}
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-4xl">📝</div>
        <p className="mt-4 text-black/50 dark:text-white/50">
          아직 작성된 글이 없습니다
        </p>
        {isOwner && (
          <a
            href="/write"
            className="mt-4 rounded-full bg-black px-6 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-black"
          >
            첫 글 작성하기
          </a>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between pb-4">
        <h2 className="text-lg font-semibold text-black dark:text-white">
          게시글
        </h2>
        <span className="text-sm text-black/50 dark:text-white/50">
          {posts.length}개
        </span>
      </div>

      <div className="grid grid-cols-2 border-t border-l border-black/10 dark:border-white/10">
        {posts.map((post) => (
          <a
            key={post.id}
            href={`/post/${post.id}`}
            className="group flex flex-col border-r border-b border-black/10 p-5 transition-colors hover:bg-black/[0.02] dark:border-white/10 dark:hover:bg-white/[0.02]"
          >
            {!post.published && (
              <span className="mb-2 w-fit rounded bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500">
                비공개
              </span>
            )}
            <h3 className="line-clamp-2 font-semibold text-black group-hover:text-black/80 dark:text-white dark:group-hover:text-white/80">
              {post.title}
            </h3>
            <p className="mt-2 line-clamp-3 flex-1 text-sm text-black/50 dark:text-white/50">
              {getExcerpt(post.content, 100)}
            </p>
            <p className="mt-3 text-xs text-black/40 dark:text-white/40">
              {formatDate(post.created_at)}
            </p>
          </a>
        ))}
      </div>
    </div>
  )
}
