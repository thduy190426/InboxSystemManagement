type AvatarFallbackProps = {
  className?: string
  name: string
  src?: string | null
}

export function getLastNameInitial(name: string) {
  const compactName = name.trim().replace(/\s+/g, ' ')

  if (!compactName) {
    return '?'
  }

  const lastWord = compactName.split(' ').at(-1) || compactName

  return lastWord.slice(0, 1).toLocaleUpperCase('vi-VN')
}

export function AvatarFallback({ className = '', name, src }: AvatarFallbackProps) {
  if (src) {
    return <img alt="" className={className || undefined} src={src} />
  }

  return (
    <span aria-hidden="true" className={['avatar-fallback', className].filter(Boolean).join(' ')}>
      {getLastNameInitial(name)}
    </span>
  )
}
