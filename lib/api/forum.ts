import { fetchWithAuth } from './client'

export interface ForumPost {
    id: string
    title: string
    description: string
    created_at: string
    user_id: string
    blog_id: string
    blog: {
        name: string
        thumbnail_url: string | null
    } | null
    view_count?: number
    comment_count?: number
}

export interface ForumComment {
    id: string
    content: string
    created_at: string
    user_id: string
    blog_id: string
    parent_id: string | null
    blog: {
        name: string
        thumbnail_url: string | null
    } | null
    replies?: ForumComment[]
}

// 포럼 목록 조회
export async function getForums(limit = 20, offset = 0): Promise<ForumPost[]> {
    return await fetchWithAuth(`/forum?limit=${limit}&offset=${offset}`)
}

// 포럼 상세 조회
export async function getForum(id: string): Promise<ForumPost | null> {
    try {
        return await fetchWithAuth(`/forum/${id}`)
    } catch (e) {
        return null
    }
}

// 포럼 글 작성
export async function createForum(data: {
    title: string
    description: string
    user_id: string
    blog_id: string
}): Promise<ForumPost> {
    return await fetchWithAuth(`/forum`, {
        method: 'POST',
        body: JSON.stringify(data)
    })
}

// 댓글 목록 조회
export async function getComments(forumId: string): Promise<ForumComment[]> {
    return await fetchWithAuth(`/forum/${forumId}/comments`)
}

// 댓글 작성
export async function createComment(data: {
    forum_id: string
    user_id: string
    blog_id: string
    content: string
    parent_id?: string | null
}) {
    return await fetchWithAuth(`/forum/comments`, {
        method: 'POST',
        body: JSON.stringify(data)
    })
}
