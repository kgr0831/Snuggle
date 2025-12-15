'use client'

import { useEffect, useState } from 'react'
import { getPosts, PostListItem } from '@/lib/api/posts'
import PostCard from './PostCard'

interface Post {
  id: string
  title: string
  content: string | null
  thumbnail_url: string | null
  created_at: string
  blog: {
    name: string
    thumbnail_url: string | null
  } | null
}

export default function PostList() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const POSTS_PER_PAGE = 5

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const data = await getPosts(15, 0) // Fetch 15 posts
        setPosts(data)
      } catch (err) {
        console.error('Error fetching posts:', err)
      }
      setLoading(false)
    }

    fetchPosts()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse border-b border-black/10 py-6 dark:border-white/10">
            <div className="flex gap-4">
              <div className="h-24 w-24 rounded-lg bg-black/10 dark:bg-white/10" />
              <div className="flex-1 space-y-3">
                <div className="h-5 w-3/4 rounded bg-black/10 dark:bg-white/10" />
                <div className="h-4 w-full rounded bg-black/10 dark:bg-white/10" />
                <div className="h-4 w-1/2 rounded bg-black/10 dark:bg-white/10" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-black/50 dark:text-white/50">
          아직 게시된 글이 없습니다
        </p>
      </div>
    )
  }

  // Calculate posts for current page
  const startIndex = (currentPage - 1) * POSTS_PER_PAGE
  const currentPosts = posts.slice(startIndex, startIndex + POSTS_PER_PAGE)
  const totalPages = Math.ceil(posts.length / POSTS_PER_PAGE)

  return (
    <div>
      <div className="h-[800px]">
        {currentPosts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`h-8 w-8 rounded-full text-sm font-medium transition-colors ${currentPage === page
                ? 'bg-black text-white dark:bg-white dark:text-black'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                }`}
            >
              {page}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
