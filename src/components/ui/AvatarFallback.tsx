import type { CSSProperties } from 'react'

type AvatarFallbackProps = {
  className?: string
  name: string
  src?: string | null
  style?: CSSProperties
}

export function getLastNameInitial(name: string) {
  const compactName = name.trim().replace(/\s+/g, ' ')

  if (!compactName) {
    return '?'
  }

  const lastWord = compactName.split(' ').at(-1) || compactName

  return lastWord.slice(0, 1).toLocaleUpperCase('vi-VN')
}

export function AvatarFallback({ className = '', name, src, style }: AvatarFallbackProps) {
  if (src) {
    return <img alt="" className={['avatar-fallback', className].filter(Boolean).join(' ')} src={src} style={style} />
  }

  return (
    <span aria-hidden="true" className={['avatar-fallback', className].filter(Boolean).join(' ')} style={style}>
      {getLastNameInitial(name)}
    </span>
  )
}
