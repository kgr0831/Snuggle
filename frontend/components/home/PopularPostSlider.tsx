'use client'

import { useEffect, useState, useCallback } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'
import { getPopularPosts, PostListItem } from '@/lib/api/posts'
import Link from 'next/link'

export default function PopularPostSlider() {
    const [posts, setPosts] = useState<PostListItem[]>([])
    const [loading, setLoading] = useState(true)
    const [currentIndex, setCurrentIndex] = useState(0)
    const [emblaRef, emblaApi] = useEmblaCarousel(
        { loop: true, duration: 30 },
        [Autoplay({ delay: 15000, stopOnInteraction: false })]
    )

    const scrollPrev = useCallback(() => {
        if (emblaApi) emblaApi.scrollPrev()
    }, [emblaApi])

    const scrollNext = useCallback(() => {
        if (emblaApi) emblaApi.scrollNext()
    }, [emblaApi])

    const scrollTo = useCallback((index: number) => {
        if (emblaApi) emblaApi.scrollTo(index)
    }, [emblaApi])

    useEffect(() => {
        if (!emblaApi) return

        const onSelect = () => {
            setCurrentIndex(emblaApi.selectedScrollSnap())
        }

        emblaApi.on('select', onSelect)
        onSelect()

        return () => {
            emblaApi.off('select', onSelect)
        }
    }, [emblaApi])

    useEffect(() => {
        const fetchPosts = async () => {
            try {
                const data = await getPopularPosts()
                setPosts(data)
            } catch (err) {
                console.error('Failed to fetch popular posts:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchPosts()
    }, [])

    if (loading) {
        return (
            <div className="mb-12">
                <div className="h-5 w-32 bg-black/5 dark:bg-white/5 rounded mb-5 animate-pulse" />
                <div className="relative h-[420px] rounded-2xl bg-black/5 dark:bg-white/5 animate-pulse" />
            </div>
        )
    }

    if (posts.length === 0) return null

    return (
        <div className="mb-12 group/container">
            {/* Header */}
            <div className="flex items-center justify-center gap-4 mb-5">
                <button
                    onClick={scrollPrev}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5 dark:bg-white/10 text-black/60 dark:text-white/60 hover:bg-black/10 hover:text-black dark:hover:bg-white/20 dark:hover:text-white transition-all duration-200"
                    aria-label="Previous"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>

                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold tracking-tight text-black dark:text-white">
                        오늘의 인기글
                    </h2>
                    <span className="text-xs font-medium tracking-widest text-black/30 dark:text-white/30 uppercase">
                        Featured
                    </span>
                </div>

                <button
                    onClick={scrollNext}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5 dark:bg-white/10 text-black/60 dark:text-white/60 hover:bg-black/10 hover:text-black dark:hover:bg-white/20 dark:hover:text-white transition-all duration-200"
                    aria-label="Next"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>

            {/* Slider */}
            <div className="relative">
                <div className="overflow-hidden rounded-2xl" ref={emblaRef}>
                    <div className="flex">
                        {posts.map((post, index) => (
                            <div key={post.id} className="flex-[0_0_100%] min-w-0">
                                <Link
                                    href={`/post/${post.id}`}
                                    className="block group/item relative h-[420px] w-full overflow-hidden"
                                >
                                    {/* Background */}
                                    {post.thumbnail_url ? (
                                        <div className="absolute inset-0">
                                            <img
                                                src={post.thumbnail_url}
                                                alt=""
                                                className="h-full w-full object-cover"
                                            />
                                            {/* Refined gradient overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/10" />
                                            <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-transparent" />
                                        </div>
                                    ) : (
                                        <div className="absolute inset-0">
                                            {/* Elegant fallback with noise texture */}
                                            <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900" />
                                            <div
                                                className="absolute inset-0 opacity-[0.15]"
                                                style={{
                                                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                                                }}
                                            />
                                            {/* Subtle accent line */}
                                            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                                        </div>
                                    )}

                                    {/* Content */}
                                    <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-10">
                                        {/* Blog info */}
                                        <div className="flex items-center gap-3 mb-4">
                                            {post.blog?.profile_image_url ? (
                                                <img
                                                    src={post.blog.profile_image_url}
                                                    alt=""
                                                    className="w-8 h-8 rounded-full object-cover ring-2 ring-white/10"
                                                />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                                                    <span className="text-xs font-medium text-white/70">
                                                        {post.blog?.name?.charAt(0) || 'B'}
                                                    </span>
                                                </div>
                                            )}
                                            <span className="text-sm font-medium text-white/80 tracking-wide">
                                                {post.blog?.name}
                                            </span>
                                        </div>

                                        {/* Title */}
                                        <h3 className="text-2xl md:text-3xl font-bold text-white leading-snug mb-3 line-clamp-2 tracking-tight">
                                            <span className="bg-gradient-to-r from-white to-white bg-[length:0%_2px] bg-left-bottom bg-no-repeat transition-all duration-500 group-hover/item:bg-[length:100%_2px]">
                                                {post.title}
                                            </span>
                                        </h3>

                                        {/* Excerpt */}
                                        <p className="text-sm text-white/60 line-clamp-2 max-w-2xl leading-relaxed">
                                            {(post.content || '').replace(/<[^>]*>/g, '').slice(0, 150)}
                                        </p>

                                        {/* Read more indicator */}
                                        <div className="mt-5 flex items-center gap-2 text-white/50 text-sm font-medium opacity-0 translate-y-2 group-hover/item:opacity-100 group-hover/item:translate-y-0 transition-all duration-300">
                                            <span>읽어보기</span>
                                            <svg className="w-4 h-4 transition-transform duration-300 group-hover/item:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                            </svg>
                                        </div>
                                    </div>

                                    {/* Index badge */}
                                    <div className="absolute top-6 right-6 flex items-center gap-2">
                                        <span className="text-xs font-mono text-white/40 tracking-wider">
                                            {String(index + 1).padStart(2, '0')}
                                        </span>
                                    </div>
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Progress indicators */}
                <div className="flex items-center justify-center gap-2 mt-5">
                    {posts.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => scrollTo(index)}
                            className="group/dot relative h-6 flex items-center justify-center"
                            aria-label={`Go to slide ${index + 1}`}
                        >
                            <span
                                className={`block h-1 rounded-full transition-all duration-500 ease-out ${
                                    currentIndex === index
                                        ? 'w-8 bg-black dark:bg-white'
                                        : 'w-2 bg-black/20 dark:bg-white/20 group-hover/dot:bg-black/40 dark:group-hover/dot:bg-white/40'
                                }`}
                            />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}
