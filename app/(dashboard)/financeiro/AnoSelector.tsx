'use client'

import { useRouter, usePathname } from 'next/navigation'
import Select from '@/components/ui/Select'

export default function AnoSelector({ ano, options }: { ano: number; options: { value: string; label: string }[] }) {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <Select
      label="Competência (ano)"
      value={String(ano)}
      options={options}
      onChange={(e) => router.push(`${pathname}?ano=${e.target.value}`)}
    />
  )
}
