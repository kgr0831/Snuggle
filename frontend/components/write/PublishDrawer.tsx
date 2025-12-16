'use client'

import { useState, useRef, useEffect } from 'react'
import { uploadTempImage } from '@/lib/api/upload'

interface PublishDrawerProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: (data: {
        isPrivate: boolean
        allowComments: boolean
        thumbnailUrl: string | null
    }) => void
    initialValues?: {
        isPrivate: boolean
        allowComments: boolean
        thumbnailUrl: string | null
    }
    contentImages?: string[] // 글 내 이미지 URL 목록
}

export default function PublishDrawer({
    isOpen,
    onClose,
    onConfirm,
    initialValues,
    contentImages = []
}: PublishDrawerProps) {
    const [isPrivate, setIsPrivate] = useState(initialValues?.isPrivate ?? false)
    const [allowComments, setAllowComments] = useState(initialValues?.allowComments ?? true)
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(initialValues?.thumbnailUrl ?? null)
    const [uploading, setUploading] = useState(false)
    const [showImagePicker, setShowImagePicker] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // 글 내 첫 번째 이미지를 기본 대표 이미지로 설정
    useEffect(() => {
        if (isOpen && !thumbnailUrl && contentImages.length > 0) {
            setThumbnailUrl(contentImages[0])
        }
    }, [isOpen, contentImages])

    if (!isOpen) return null

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        try {
            const url = await uploadTempImage(file)
            setThumbnailUrl(url)
            setShowImagePicker(false)
        } catch (error) {
            console.error('Thumbnail upload failed:', error)
        } finally {
            setUploading(false)
        }
    }

    const handleConfirm = () => {
        onConfirm({
            isPrivate,
            allowComments,
            thumbnailUrl,
        })
    }

    const handleSelectImage = (url: string) => {
        setThumbnailUrl(url)
        setShowImagePicker(false)
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="w-full max-w-xl animate-[slideUp_0.3s_ease-out] rounded-t-2xl bg-white p-6 shadow-2xl dark:bg-neutral-900 sm:p-8"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 헤더 */}
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-black dark:text-white">발행 설정</h2>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 text-black/40 hover:bg-black/5 hover:text-black dark:text-white/40 dark:hover:bg-white/5 dark:hover:text-white"
                    >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="space-y-6">
                    {/* 대표 이미지 */}
                    <div>
                        <label className="mb-3 block text-sm font-medium text-black dark:text-white">
                            대표 이미지
                        </label>
                        <div className="flex gap-3">
                            {/* 현재 선택된 이미지 */}
                            <div
                                className="relative h-24 w-24 shrink-0 cursor-pointer overflow-hidden rounded-xl bg-black/5 dark:bg-white/5"
                                onClick={() => setShowImagePicker(!showImagePicker)}
                            >
                                {thumbnailUrl ? (
                                    <>
                                        <img
                                            src={thumbnailUrl}
                                            alt="대표 이미지"
                                            className="h-full w-full object-cover"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all hover:bg-black/30 hover:opacity-100">
                                            <span className="text-xs font-medium text-white">변경</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex h-full w-full flex-col items-center justify-center text-black/30 dark:text-white/30">
                                        {uploading ? (
                                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                        ) : (
                                            <>
                                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                <span className="mt-1 text-xs">없음</span>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* 이미지 선택 옵션 */}
                            {showImagePicker && (
                                <div className="flex flex-1 flex-wrap gap-2">
                                    {/* 글 내 이미지들 */}
                                    {contentImages.map((url, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleSelectImage(url)}
                                            className={`relative h-16 w-16 overflow-hidden rounded-lg border-2 transition-all ${
                                                thumbnailUrl === url
                                                    ? 'border-blue-500 ring-2 ring-blue-500/30'
                                                    : 'border-transparent hover:border-black/20 dark:hover:border-white/20'
                                            }`}
                                        >
                                            <img src={url} alt="" className="h-full w-full object-cover" />
                                            {thumbnailUrl === url && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-blue-500/20">
                                                    <svg className="h-4 w-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                                                    </svg>
                                                </div>
                                            )}
                                        </button>
                                    ))}

                                    {/* 새 이미지 업로드 버튼 */}
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed border-black/20 text-black/40 transition-colors hover:border-black/40 hover:text-black/60 dark:border-white/20 dark:text-white/40 dark:hover:border-white/40 dark:hover:text-white/60"
                                    >
                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                    </button>

                                    {/* 이미지 제거 버튼 */}
                                    {thumbnailUrl && (
                                        <button
                                            onClick={() => {
                                                setThumbnailUrl(null)
                                                setShowImagePicker(false)
                                            }}
                                            className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed border-red-300 text-red-400 transition-colors hover:border-red-400 hover:text-red-500"
                                        >
                                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            )}

                            {!showImagePicker && (
                                <div className="flex flex-1 items-center">
                                    <p className="text-sm text-black/50 dark:text-white/50">
                                        {thumbnailUrl ? '클릭하여 변경' : '클릭하여 선택'}
                                        {contentImages.length > 0 && !thumbnailUrl && ` (글 내 이미지 ${contentImages.length}개)`}
                                    </p>
                                </div>
                            )}
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                    </div>

                    {/* 구분선 */}
                    <div className="h-px bg-black/10 dark:bg-white/10" />

                    {/* 공개 설정 */}
                    <div>
                        <label className="mb-3 block text-sm font-medium text-black dark:text-white">
                            공개 설정
                        </label>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsPrivate(false)}
                                className={`flex-1 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all ${
                                    !isPrivate
                                        ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
                                        : 'border-black/10 text-black/60 hover:border-black/30 dark:border-white/10 dark:text-white/60 dark:hover:border-white/30'
                                }`}
                            >
                                공개
                            </button>
                            <button
                                onClick={() => setIsPrivate(true)}
                                className={`flex-1 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all ${
                                    isPrivate
                                        ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
                                        : 'border-black/10 text-black/60 hover:border-black/30 dark:border-white/10 dark:text-white/60 dark:hover:border-white/30'
                                }`}
                            >
                                비공개
                            </button>
                        </div>
                    </div>

                    {/* 댓글 허용 */}
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-black dark:text-white">
                            댓글 허용
                        </label>
                        <button
                            onClick={() => setAllowComments(!allowComments)}
                            className={`relative h-6 w-11 rounded-full transition-colors ${
                                allowComments ? 'bg-black dark:bg-white' : 'bg-black/20 dark:bg-white/20'
                            }`}
                        >
                            <span
                                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform dark:bg-black ${
                                    allowComments ? 'left-[22px]' : 'left-0.5'
                                }`}
                            />
                        </button>
                    </div>
                </div>

                {/* 하단 버튼 */}
                <div className="mt-8 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 rounded-xl border border-black/10 py-3 text-sm font-medium text-black transition-colors hover:bg-black/5 dark:border-white/10 dark:text-white dark:hover:bg-white/5"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="flex-1 rounded-xl bg-black py-3 text-sm font-bold text-white transition-transform hover:scale-[1.02] active:scale-[0.98] dark:bg-white dark:text-black"
                    >
                        {isPrivate ? '비공개로 발행' : '발행하기'}
                    </button>
                </div>
            </div>
        </div>
    )
}
