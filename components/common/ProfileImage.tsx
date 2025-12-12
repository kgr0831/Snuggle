'use client'

import { useState } from 'react'

interface ProfileImageProps {
  src: string | null | undefined
  alt: string
  fallback: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  rounded?: 'full' | 'xl' | '2xl'
  className?: string
}

const sizeClasses = {
  sm: 'h-9 w-9 text-sm',
  md: 'h-12 w-12 text-lg',
  lg: 'h-24 w-24 text-3xl',
  xl: 'h-28 w-28 text-3xl',
}

const roundedClasses = {
  full: 'rounded-full',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
}

export default function ProfileImage({
  src,
  alt,
  fallback,
  size = 'md',
  rounded = 'full',
  className = '',
}: ProfileImageProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const sizeClass = sizeClasses[size]
  const roundedClass = roundedClasses[rounded]

  if (!src || error) {
    return (
      <div
        className={`flex items-center justify-center bg-black font-bold text-white dark:bg-white dark:text-black ${sizeClass} ${roundedClass} ${className}`}
      >
        {fallback.charAt(0)}
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden ${sizeClass} ${roundedClass} ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/5 dark:bg-white/5">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-black/20 border-t-black dark:border-white/20 dark:border-t-white" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`h-full w-full object-cover transition-opacity ${loading ? 'opacity-0' : 'opacity-100'}`}
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false)
          setError(true)
        }}
      />
    </div>
  )
}
