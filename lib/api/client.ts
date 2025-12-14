import { createClient } from '@/lib/supabase/client'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'

export async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers as any,
    }

    if (token) {
        headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    })

    // Handle 204 No Content
    if (response.status === 204) return null

    if (!response.ok) {
        // Try to parse error message
        try {
            const errorData = await response.json()
            throw new Error(errorData.error || 'API Request failed')
        } catch (e: any) {
            throw new Error(e.message || 'API Request failed')
        }
    }

    // Handle empty body if not 204 but still empty (e.g. success true)
    const text = await response.text()
    return text ? JSON.parse(text) : null
}
