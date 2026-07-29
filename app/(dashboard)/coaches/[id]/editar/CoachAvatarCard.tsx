'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'
import AvatarUpload from '@/components/ui/AvatarUpload'
import { updateCoachAvatar } from '../../actions'

export default function CoachAvatarCard({
  coachId,
  currentUrl,
  name,
}: {
  coachId: string
  currentUrl: string | null
  name: string
}) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function handleUpload(url: string) {
    setSaving(true)
    setSaved(false)
    setError('')
    try {
      const result = await updateCoachAvatar(coachId, url || null)
      if (result?.error) setError(result.error)
      else setSaved(true)
    } catch {
      setError('Erro ao salvar foto.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <h3 className="text-sm font-semibold text-navy-500 mb-4">Foto de perfil</h3>
      <AvatarUpload
        folder="coaches"
        currentUrl={currentUrl}
        name={name}
        onUpload={handleUpload}
      />
      {saving && <p className="text-xs text-gray-400 mt-3">Salvando…</p>}
      {saved && <p className="text-xs text-emerald-600 mt-3">Foto atualizada.</p>}
      {error && <p className="text-xs text-red-500 mt-3">{error}</p>}
    </Card>
  )
}
