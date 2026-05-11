import Image from 'next/image'

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?'
  return ((parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')).toUpperCase()
}

function colorFromName(name: string) {
  const colors = [
    'bg-sky-400 text-white',
    'bg-emerald-500 text-white',
    'bg-violet-500 text-white',
    'bg-amber-400 text-white',
    'bg-pink-500 text-white',
    'bg-indigo-500 text-white',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

export default function Avatar({
  name,
  url,
  size = 40,
}: {
  name: string
  url?: string | null
  size?: number
}) {
  const style = { width: size, height: size, borderRadius: '50%', flexShrink: 0 }
  const fontSize = Math.max(10, Math.round(size * 0.38))

  if (url) {
    return (
      <Image
        src={url}
        alt={name}
        width={size}
        height={size}
        className="object-cover rounded-full flex-shrink-0"
        style={style}
        unoptimized
      />
    )
  }

  return (
    <div
      className={`flex items-center justify-center font-semibold flex-shrink-0 ${colorFromName(name)}`}
      style={{ ...style, fontSize }}
      aria-label={name}
    >
      {initials(name)}
    </div>
  )
}
