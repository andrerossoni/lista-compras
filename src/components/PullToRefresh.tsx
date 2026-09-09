import { useEffect, useRef, useState } from 'react'
import { ArrowClockwise } from '@phosphor-icons/react'

const THRESHOLD = 64
const MAX_PULL = 100

type Props = {
  onRefresh: () => Promise<void>
  children: React.ReactNode
}

export default function PullToRefresh({ onRefresh, children }: Props) {
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const startYRef = useRef<number | null>(null)
  const pullRef = useRef(0)
  const pullingRef = useRef(false)
  const refreshingRef = useRef(false)
  const onRefreshRef = useRef(onRefresh)
  onRefreshRef.current = onRefresh

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    function onTouchStart(e: TouchEvent) {
      if (window.scrollY > 0 || refreshingRef.current) {
        startYRef.current = null
        return
      }
      startYRef.current = e.touches[0].clientY
      pullingRef.current = false
    }

    function onTouchMove(e: TouchEvent) {
      if (startYRef.current === null) return
      const dy = e.touches[0].clientY - startYRef.current
      if (window.scrollY > 0 || dy <= 0) {
        startYRef.current = null
        pullingRef.current = false
        pullRef.current = 0
        setPull(0)
        return
      }
      pullingRef.current = true
      e.preventDefault()
      const next = Math.min(dy * 0.5, MAX_PULL)
      pullRef.current = next
      setPull(next)
    }

    async function onTouchEnd() {
      if (pullingRef.current && pullRef.current >= THRESHOLD) {
        setRefreshing(true)
        refreshingRef.current = true
        pullRef.current = THRESHOLD
        setPull(THRESHOLD)
        try {
          await onRefreshRef.current()
        } finally {
          setRefreshing(false)
          refreshingRef.current = false
          pullRef.current = 0
          setPull(0)
        }
      } else {
        pullRef.current = 0
        setPull(0)
      }
      startYRef.current = null
      pullingRef.current = false
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    el.addEventListener('touchcancel', onTouchEnd, { passive: true })

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [])

  const progress = Math.min(pull / THRESHOLD, 1)

  return (
    <div ref={containerRef}>
      <div
        aria-hidden
        style={{
          height: pull,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          transition: pull === 0 || refreshing ? 'height 200ms ease-out' : 'none',
        }}
      >
        <ArrowClockwise
          size={20}
          weight="bold"
          style={{
            color: 'var(--text-tertiary)',
            opacity: progress,
            transform: refreshing ? undefined : `rotate(${progress * 360}deg)`,
            animation: refreshing ? 'ptr-spin 0.7s linear infinite' : undefined,
          }}
        />
      </div>
      {children}
    </div>
  )
}
