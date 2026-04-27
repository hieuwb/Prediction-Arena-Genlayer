import { useEffect, useState } from 'react'

const MOBILE_BREAKPOINT = 768

export function isMobile(): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth < MOBILE_BREAKPOINT
}

export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(isMobile)
  useEffect(() => {
    const onResize = () => setMobile(isMobile())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return mobile
}

// Coarse pointer = touch device. Used to pick simpler interaction
// patterns (no hover) and to skip GPU-heavy effects on mobile GPUs.
export function isTouch(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(pointer: coarse)').matches ?? false
}
