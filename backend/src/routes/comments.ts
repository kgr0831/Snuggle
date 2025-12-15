import { Router, Response } from 'express'
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth.js'
import { createAuthenticatedClient, supabase } from '../services/supabase.service.js'

const router = Router()

// 댓글 조회 (특정 게시글의 댓글 전체)
router.get('/:postId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { postId } = req.params
        const token = req.headers.authorization?.split(' ')[1]

        // 토큰이 있으면 인증된 클라이언트, 없으면 익명 클라이언트 사용
        const client = token ? createAuthenticatedClient(token) : supabase

        // 모든 댓글 가져오기 (작성자 정보 + 블로그 정보 포함)
        const { data: comments, error } = await client
            .from('post_comment')
            .select(`
                *,
                profiles:user_id (
                    id,
                    nickname,
                    profile_image_url
                ),
                blog:blog_id (
                    id,
                    name,
                    thumbnail_url
                )
            `)
            .eq('post_id', postId)
            .order('created_at', { ascending: true })

        if (error) {
            console.error('Fetch comments error:', error)
            res.status(500).json({ error: 'Failed to fetch comments' })
            return
        }

        res.json(comments)
    } catch (error) {
        console.error('Fetch comments error:', error)
        res.status(500).json({ error: 'Failed to fetch comments' })
    }
})

// 댓글 작성
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id
        const { post_id, comment_text, parent_id, blog_id } = req.body

        if (!post_id || !comment_text) {
            res.status(400).json({ error: 'post_id and comment_text are required' })
            return
        }

        const token = req.headers.authorization!.split(' ')[1]
        const authClient = createAuthenticatedClient(token)

        const { data, error } = await authClient
            .from('post_comment')
            .insert({
                post_id,
                user_id: userId,
                comment_text,
                parent_id: parent_id || null,
                blog_id: blog_id || null
            })
            .select(`
                *,
                profiles:user_id (
                    id,
                    nickname,
                    profile_image_url
                ),
                blog:blog_id (
                    id,
                    name,
                    thumbnail_url
                )
            `)
            .single()

        if (error) {
            console.error('Create comment error:', error)
            res.status(500).json({ error: 'Failed to create comment' })
            return
        }

        res.json(data)
    } catch (error) {
        console.error('Create comment error:', error)
        res.status(500).json({ error: 'Failed to create comment' })
    }
})

// 댓글 삭제
router.delete('/:commentId', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id
        const { commentId } = req.params

        const token = req.headers.authorization!.split(' ')[1]
        const authClient = createAuthenticatedClient(token)

        // 권한 확인은 RLS에 맡길 수도 있지만, 명시적으로 확인하는 것이 안전함.
        // 하지만 Supabase RLS가 user_id 일치를 검사하도록 설정되어 있다고 가정하면 delete만 호출해도 됨.
        // 여기서는 안전하게 delete 수행하고 결과 확인.

        const { error } = await authClient
            .from('post_comment')
            .delete()
            .eq('id', commentId)
            .eq('user_id', userId) // 본인 댓글만 삭제 가능

        if (error) {
            console.error('Delete comment error:', error)
            res.status(500).json({ error: 'Failed to delete comment' })
            return
        }

        res.json({ success: true })
    } catch (error) {
        console.error('Delete comment error:', error)
        res.status(500).json({ error: 'Failed to delete comment' })
    }
})

export default router
