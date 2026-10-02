import type { HTMLAttributes, CSSProperties } from 'react'

type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  className?: string
  variant?: 'circular' | 'rectangular' | 'text'
  width?: string | number
  height?: string | number
}

export function Skeleton({
  className = '',
  variant = 'text',
  width,
  height,
  style,
  ...props
}: SkeletonProps) {
  const baseStyle: CSSProperties = {
    width: width ?? (variant === 'text' ? '100%' : undefined),
    height: height ?? (variant === 'text' ? '1rem' : undefined),
    borderRadius: variant === 'circular' ? '50%' : variant === 'text' ? '4px' : '12px',
    ...style,
  }

  return (
    <div
      className={`skeleton-base skeleton-pulse ${className}`}
      style={baseStyle}
      {...props}
    />
  )
}
