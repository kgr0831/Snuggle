import { NextRequest, NextResponse } from 'next/server'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from '@/lib/r2/client'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // 파일 타입 검증 (GIF 제외)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'JPG, PNG, WEBP 파일만 업로드 가능합니다' }, { status: 400 })
    }

    // 파일 크기 제한 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 })
    }

    // 파일 이름 생성
    const ext = file.name.split('.').pop()
    const fileName = `blog/${user.id}/${Date.now()}.${ext}`

    // 파일을 버퍼로 변환
    const buffer = Buffer.from(await file.arrayBuffer())

    // R2에 업로드
    await r2Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: fileName,
        Body: buffer,
        ContentType: file.type,
      })
    )

    const url = `${R2_PUBLIC_URL}/${fileName}`

    return NextResponse.json({ url })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
