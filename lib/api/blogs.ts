import { createClient } from '@/lib/supabase/client'

export interface BlogItem {
  id: string
  name: string
  description: string | null
  thumbnail_url: string | null
  profile_image_url: string | null
  created_at: string
}

// 신규 블로거 목록 (최근 생성된 블로그)
export async function getNewBlogs(limit = 3): Promise<BlogItem[]> {
  const supabase = createClient()

  // 블로그 목록 가져오기
  const { data: blogs, error } = await supabase
    .from('blogs')
    .select('id, name, description, thumbnail_url, user_id, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Failed to fetch new blogs:', error)
    return []
  }

  if (!blogs || blogs.length === 0) {
    return []
  }

  // 프로필 정보 가져오기
  const userIds = blogs.map((b) => b.user_id)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, profile_image_url')
    .in('id', userIds)

  const profileMap = new Map(
    (profiles || []).map((p) => [p.id, p.profile_image_url])
  )

  return blogs.map((blog) => ({
    id: blog.id,
    name: blog.name,
    description: blog.description,
    thumbnail_url: blog.thumbnail_url,
    profile_image_url: profileMap.get(blog.user_id) || null,
    created_at: blog.created_at,
  }))
}
