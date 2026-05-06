import Image from 'next/image'

interface AvatarProps {
  name: string
  url?: string | null
  size?: number
  className?: string
  bgColor?: string
}

export default function Avatar({ name, url, size = 36, bgColor = '#2AABE1', className = '' }: AvatarProps) {
  const initial = name?.charAt(0)?.toUpperCase() ?? '?'
  const fontSize = size <= 32 ? 'text-sm' : size <= 48 ? 'text-base' : 'text-2xl'

  if (url) {
    return (
      <div
        className={`rounded-full overflow-hidden flex-shrink-0 ${className}`}
        style={{ width: size, height: size }}
      >
        <Image
          src={url}
          alt={name}
          width={size}
          height={size}
          className="w-full h-full object-cover"
          unoptimized
        />
      </div>
    )
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 ${fontSize} ${className}`}
      style={{ width: size, height: size, background: bgColor }}
    >
      {initial}
    </div>
  )
}
