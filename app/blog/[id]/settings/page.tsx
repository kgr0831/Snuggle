'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import Toast from '@/components/common/Toast'

interface Blog {
  id: string
  user_id: string
  name: string
  description: string | null
  thumbnail_url: string | null
}

interface Category {
  id: string
  name: string
  blog_id: string
}

interface Post {
  id: string
  title: string
  published: boolean
  created_at: string
}

type TabType = 'profile' | 'categories' | 'posts'

const menuItems: { id: TabType; label: string; icon: React.ReactNode }[] = [
  {
    id: 'profile',
    label: '프로필',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    id: 'categories',
    label: '카테고리',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
  },
  {
    id: 'posts',
    label: '글 관리',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
]

export default function BlogSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const blogId = params.id as string
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [user, setUser] = useState<User | null>(null)
  const [blog, setBlog] = useState<Blog | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('profile')

  // 프로필 수정 상태
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageRemoved, setImageRemoved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; visible: boolean }>({
    message: '',
    type: 'success',
    visible: false,
  })

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type, visible: true })
  }, [])

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, visible: false }))
  }, [])

  // 카테고리 추가 상태
  const [newCategory, setNewCategory] = useState('')
  const [addingCategory, setAddingCategory] = useState(false)

  // 카카오 프로필 이미지
  const kakaoProfileImage = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null

  // 표시할 프로필 이미지 (우선순위: 새 이미지 > 블로그 썸네일 > 카카오 프로필)
  const displayImage = imageRemoved ? null : (imagePreview || kakaoProfileImage)

  // 변경 사항 확인
  const hasProfileChanges = blog && (
    name.trim() !== blog.name ||
    (description.trim() || null) !== blog.description ||
    imageFile !== null ||
    imageRemoved
  )

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }
      setUser(user)

      const { data: blogData, error: blogError } = await supabase
        .from('blogs')
        .select('*')
        .eq('id', blogId)
        .single()

      if (blogError || !blogData || blogData.user_id !== user.id) {
        router.push('/')
        return
      }

      setBlog(blogData)
      setName(blogData.name)
      setDescription(blogData.description || '')
      if (blogData.thumbnail_url) {
        setImagePreview(blogData.thumbnail_url)
      }

      // 카테고리 로드
      const { data: categoryData } = await supabase
        .from('categories')
        .select('*')
        .eq('blog_id', blogId)
        .order('name')

      if (categoryData) {
        setCategories(categoryData)
      }

      // 글 목록 로드
      const { data: postData } = await supabase
        .from('posts')
        .select('id, title, published, created_at')
        .eq('blog_id', blogId)
        .order('created_at', { ascending: false })

      if (postData) {
        setPosts(postData)
      }

      setLoading(false)
    }

    fetchData()
  }, [blogId, router])

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      showToast('JPG, PNG, WEBP 파일만 업로드할 수 있습니다', 'error')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('이미지 크기는 5MB 이하여야 합니다', 'error')
      return
    }

    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setImageRemoved(false)
  }

  const handleImageRemove = () => {
    setImageFile(null)
    setImagePreview(null)
    setImageRemoved(true)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const uploadImage = async (file: File): Promise<string | null> => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new Error('이미지 업로드에 실패했습니다')
    }

    const data = await response.json()
    return data.url
  }

  const handleSaveProfile = async () => {
    if (!blog) return

    setSaving(true)

    try {
      let thumbnailUrl: string | null = blog.thumbnail_url

      if (imageRemoved) {
        thumbnailUrl = null
      } else if (imageFile) {
        thumbnailUrl = await uploadImage(imageFile)
      }

      const supabase = createClient()

      const { error } = await supabase
        .from('blogs')
        .update({
          name: name.trim(),
          description: description.trim() || null,
          thumbnail_url: thumbnailUrl,
        })
        .eq('id', blog.id)

      if (error) throw error

      setBlog({ ...blog, name: name.trim(), description: description.trim() || null, thumbnail_url: thumbnailUrl })
      setImageFile(null)
      setImageRemoved(false)
      showToast('저장되었습니다', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : '저장에 실패했습니다', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return

    setAddingCategory(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('categories')
      .insert({
        blog_id: blogId,
        name: newCategory.trim(),
      })
      .select()
      .single()

    if (!error && data) {
      setCategories([...categories, data])
      setNewCategory('')
    }
    setAddingCategory(false)
  }

  const handleDeleteCategory = async (categoryId: string) => {
    const supabase = createClient()

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId)

    if (!error) {
      setCategories(categories.filter(c => c.id !== categoryId))
    }
  }

  const handleTogglePublish = async (postId: string, currentPublished: boolean) => {
    const supabase = createClient()

    const { error } = await supabase
      .from('posts')
      .update({ published: !currentPublished })
      .eq('id', postId)

    if (!error) {
      setPosts(posts.map(p =>
        p.id === postId ? { ...p, published: !currentPublished } : p
      ))
    }
  }

  const handleDeletePost = async (postId: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    const supabase = createClient()

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId)

    if (!error) {
      setPosts(posts.filter(p => p.id !== postId))
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-black/20 border-t-black dark:border-white/20 dark:border-t-white" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-white dark:bg-black">
      {/* 왼쪽 사이드바 */}
      <aside className="w-64 shrink-0 border-r border-black/10 dark:border-white/10">
        <div className="sticky top-0 flex h-screen flex-col">
          {/* 헤더 */}
          <div className="border-b border-black/10 p-4 dark:border-white/10">
            <a
              href={`/blog/${blogId}`}
              className="flex items-center gap-2 text-sm text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              블로그로 돌아가기
            </a>
          </div>

          {/* 메뉴 */}
          <nav className="flex-1 p-3">
            <div className="space-y-1">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                    activeTab === item.id
                      ? 'bg-black text-white dark:bg-white dark:text-black'
                      : 'text-black/70 hover:bg-black/5 dark:text-white/70 dark:hover:bg-white/5'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>
          </nav>

        </div>
      </aside>

      {/* 오른쪽 컨텐츠 */}
      <main className="flex-1 overflow-hidden p-10">
        {/* 프로필 */}
        {activeTab === 'profile' && (
          <div className="max-w-xl animate-[slideIn_0.2s_ease-out]">
            <h1 className="text-2xl font-bold text-black dark:text-white">프로필</h1>
            <p className="mt-1 text-black/50 dark:text-white/50">블로그 프로필을 수정합니다</p>

            <div className="mt-10 space-y-8">
              {/* 프로필 이미지 */}
              <div>
                <label className="block text-sm font-medium text-black dark:text-white">
                  프로필 이미지
                </label>
                <div className="mt-4">
                  <div className="flex items-start gap-6">
                    {/* 이미지 프리뷰 */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="group relative h-28 w-28 shrink-0 overflow-hidden rounded-full"
                    >
                      {displayImage ? (
                        <img
                          src={displayImage}
                          alt="Preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-black/5 text-3xl font-bold text-black/30 dark:bg-white/5 dark:text-white/30">
                          {name.charAt(0) || '?'}
                        </div>
                      )}
                      {/* 호버 오버레이 */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                        <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageSelect}
                      className="hidden"
                    />

                    {/* 버튼 및 안내 */}
                    <div className="flex flex-col gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium text-black hover:bg-black/5 dark:border-white/10 dark:text-white dark:hover:bg-white/5"
                      >
                        이미지 업로드
                      </button>
                      {imagePreview && !imageRemoved && (
                        <button
                          type="button"
                          onClick={handleImageRemove}
                          className="rounded-lg px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          이미지 삭제
                        </button>
                      )}
                      <p className="text-xs text-black/40 dark:text-white/40">
                        JPG, PNG, WEBP · 최대 5MB
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 블로그 이름 */}
              <div>
                <label className="block text-sm font-medium text-black dark:text-white">
                  블로그 이름
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-black/10 bg-transparent px-4 py-3 text-black outline-none focus:border-black dark:border-white/10 dark:text-white dark:focus:border-white"
                />
              </div>

              {/* 블로그 소개 */}
              <div>
                <label className="block text-sm font-medium text-black dark:text-white">
                  블로그 소개
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="mt-2 w-full resize-none rounded-lg border border-black/10 bg-transparent px-4 py-3 text-black outline-none focus:border-black dark:border-white/10 dark:text-white dark:focus:border-white"
                />
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={saving || !name.trim() || !hasProfileChanges}
                className="rounded-lg bg-black px-6 py-2.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        )}

        {/* 카테고리 */}
        {activeTab === 'categories' && (
          <div className="max-w-xl animate-[slideIn_0.2s_ease-out]">
            <h1 className="text-2xl font-bold text-black dark:text-white">카테고리</h1>
            <p className="mt-1 text-black/50 dark:text-white/50">글을 분류할 카테고리를 관리합니다</p>

            <div className="mt-10">
              {/* 카테고리 추가 */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="새 카테고리 이름"
                  className="flex-1 rounded-lg border border-black/10 bg-transparent px-4 py-2.5 text-black outline-none focus:border-black dark:border-white/10 dark:text-white dark:focus:border-white"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                />
                <button
                  onClick={handleAddCategory}
                  disabled={addingCategory || !newCategory.trim()}
                  className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
                >
                  추가
                </button>
              </div>

              {/* 카테고리 목록 */}
              <div className="mt-6">
                {categories.length === 0 ? (
                  <p className="py-12 text-center text-black/50 dark:text-white/50">
                    카테고리가 없습니다
                  </p>
                ) : (
                  <div className="rounded-lg border border-black/10 dark:border-white/10">
                    {categories.map((category, index) => (
                      <div
                        key={category.id}
                        className={`flex items-center justify-between px-4 py-3 ${
                          index !== categories.length - 1 ? 'border-b border-black/10 dark:border-white/10' : ''
                        }`}
                      >
                        <span className="text-black dark:text-white">{category.name}</span>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="text-sm text-red-500 hover:text-red-600"
                        >
                          삭제
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 글 관리 */}
        {activeTab === 'posts' && (
          <div className="animate-[slideIn_0.2s_ease-out]">
            <h1 className="text-2xl font-bold text-black dark:text-white">글 관리</h1>
            <p className="mt-1 text-black/50 dark:text-white/50">작성한 글을 관리합니다</p>

            <div className="mt-10">
              {posts.length === 0 ? (
                <p className="py-12 text-center text-black/50 dark:text-white/50">
                  작성된 글이 없습니다
                </p>
              ) : (
                <div className="rounded-lg border border-black/10 dark:border-white/10">
                  {posts.map((post, index) => (
                    <div
                      key={post.id}
                      className={`flex items-center justify-between px-4 py-4 ${
                        index !== posts.length - 1 ? 'border-b border-black/10 dark:border-white/10' : ''
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <a
                            href={`/post/${post.id}`}
                            className="truncate font-medium text-black hover:underline dark:text-white"
                          >
                            {post.title}
                          </a>
                          {!post.published && (
                            <span className="shrink-0 rounded bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500">
                              비공개
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-black/50 dark:text-white/50">
                          {formatDate(post.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleTogglePublish(post.id, post.published)}
                          className="rounded-lg px-3 py-1.5 text-sm text-black/70 hover:bg-black/5 dark:text-white/70 dark:hover:bg-white/5"
                        >
                          {post.published ? '비공개로' : '공개로'}
                        </button>
                        <a
                          href={`/write?edit=${post.id}`}
                          className="rounded-lg px-3 py-1.5 text-sm text-black/70 hover:bg-black/5 dark:text-white/70 dark:hover:bg-white/5"
                        >
                          수정
                        </a>
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="rounded-lg px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.visible}
        onClose={hideToast}
      />
    </div>
  )
}
