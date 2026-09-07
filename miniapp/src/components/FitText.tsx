import { useLayoutEffect, useRef, useState } from 'react'

interface FitTextProps {
  text: string
  className?: string
  min?: number
  max?: number
}

/** Scales its font-size so `text` spans the full width of the parent element. */
export function FitText({ text, className, min = 20, max = 64 }: FitTextProps) {
  const ref = useRef<HTMLElement>(null)
  const [fontSize, setFontSize] = useState(max)

  useLayoutEffect(() => {
    const el = ref.current
    const parent = el?.parentElement
    if (!el || !parent) return

    const fit = () => {
      const style = getComputedStyle(parent)
      const paddingX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
      const containerWidth = parent.clientWidth - paddingX - 1
      if (!containerWidth) return

      let lo = min
      let hi = max
      for (let i = 0; i < 12; i++) {
        const mid = (lo + hi) / 2
        el.style.fontSize = `${mid}px`
        if (el.scrollWidth <= containerWidth) {
          lo = mid
        } else {
          hi = mid
        }
      }
      el.style.fontSize = `${lo}px`
      setFontSize(lo)
    }

    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(parent)
    return () => ro.disconnect()
  }, [text, min, max])

  return (
    <strong
      ref={ref}
      className={className}
      style={{ display: 'inline-block', whiteSpace: 'nowrap', fontSize }}
    >
      {text}
    </strong>
  )
}
