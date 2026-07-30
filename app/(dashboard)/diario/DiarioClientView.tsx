'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { X, Plus, CheckCircle, Loader, AlertCircle, Printer, Image as ImageIcon, Trash2 } from 'lucide-react'
import Card from '@/components/ui/Card'
import { formatDate } from '@/lib/utils'
import { criarMultiplosRegistros, salvarResumoDiario } from './actions'
import { setFotoDoDia, removerFotoDoDia, type FotoDoDia } from './fotoActions'
import DocumentosAssinadosSection, { type DocumentoAssinadoItem } from '@/components/documentos/DocumentosAssinadosSection'

// ── Report constants ────────────────────────────────────────────────────────
const MESES_LABEL = [
  '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
const MESES_EXTENSO = [
  '', 'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]
const MODALIDADE_LABEL: Record<string, string> = {
  corrida: 'Corrida', ciclismo: 'Ciclismo', natacao: 'Natação',
  triathlon: 'Triathlon', duathlon: 'Duathlon', reuniao: 'Reunião',
}
const DIA_SEMANA: Record<string, string> = {
  '0': 'Domingo', '1': 'Segunda-feira', '2': 'Terça-feira', '3': 'Quarta-feira',
  '4': 'Quinta-feira', '5': 'Sexta-feira', '6': 'Sábado',
}
const MODALIDADES = [
  { value: 'corrida',   label: 'Corrida' },
  { value: 'ciclismo',  label: 'Ciclismo' },
  { value: 'natacao',   label: 'Natação' },
  { value: 'triathlon', label: 'Triathlon' },
  { value: 'duathlon',  label: 'Duathlon' },
  { value: 'reuniao',   label: 'Reunião' },
]

function ultimoDia(ano: number, mes: number) { return new Date(ano, mes, 0).getDate() }

function formatDataSimples(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function diaSemana(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return DIA_SEMANA[String(d.getDay())]
}

function turmaShortLabel(nome: string): string {
  const m = nome.match(/Turma\s+(\d+)/i)
  return m ? `T${m[1]}` : nome
}

// ── Types ───────────────────────────────────────────────────────────────────
type TurmaBasic = { id: string; nome: string }
type FotoBasic  = { id: string; url: string; titulo: string; turma_id: string; storage_path: string }

export type InitialDay = {
  date: string
  modalidade: string
  objetivo: string
  descricao: string
  observacoes: string
  turmaIds: string[]
  fotos: FotoBasic[]
}

type DayEntry = {
  key: string
  date: string
  modalidade: string
  objetivo: string
  descricao: string
  observacoes: string
  turmaIds: string[]
  fotos: FotoBasic[]
}

type DraftEntry = Omit<DayEntry, 'fotos'>

type Draft = {
  entries: DraftEntry[]
  cref?: string
  cidade?: string
  processo?: string
  resumo?: string
}

function loadDraft(key: string): Draft | null {
  if (typeof window === 'undefined') return null
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : null }
  catch { return null }
}

// ── Foto do dia (por turma) ──────────────────────────────────────────────────
function FotoDoDiaSlot({
  entryKey, date, turmaId, turmaLabel, foto, onChange,
}: {
  entryKey: string
  date: string
  turmaId: string
  turmaLabel: string | null
  foto: FotoBasic | undefined
  onChange: (foto: FotoDoDia | null) => void
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function applyFile(file: File | undefined | null) {
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Apenas imagens são aceitas.'); return }
    setError(null)
    const fd = new FormData()
    fd.set('turma_id', turmaId)
    fd.set('data', date)
    fd.set('file', file)
    startTransition(async () => {
      const result = await setFotoDoDia(fd)
      if (result.error) { setError(result.error); return }
      if (result.foto) onChange(result.foto)
    })
  }

  function handleRemove() {
    if (!foto) return
    if (!confirm('Remover esta foto?')) return
    startTransition(async () => {
      await removerFotoDoDia(turmaId, date, foto.storage_path)
      onChange(null)
    })
  }

  return (
    <div>
      {turmaLabel && <p className="text-xs text-gray-400 mb-1">{turmaLabel}</p>}
      {foto ? (
        <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50 aspect-video max-w-[220px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={foto.url} alt={foto.titulo || 'Foto do dia'} className="w-full h-full object-cover" />
          <button
            type="button"
            disabled={pending}
            onClick={handleRemove}
            className="absolute top-1.5 right-1.5 bg-black/50 text-white rounded-full p-1 hover:bg-red-500/90 transition-colors disabled:opacity-50"
            title="Remover foto"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ) : (
        <label
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); applyFile(e.dataTransfer.files?.[0]) }}
          className={`flex flex-col items-center justify-center gap-1 border-2 border-dashed rounded-lg py-4 px-3 cursor-pointer transition-colors max-w-[220px] ${
            isDragging ? 'border-sky-400 bg-sky-50' : 'border-gray-200 hover:border-sky-400'
          }`}
        >
          {pending ? (
            <Loader size={16} className="text-gray-300 animate-spin" />
          ) : (
            <>
              <ImageIcon size={16} className="text-gray-300" />
              <span className="text-[11px] text-gray-400 text-center">Arraste ou clique</span>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            disabled={pending}
            onChange={(e) => applyFile(e.target.files?.[0])}
          />
        </label>
      )}
      {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}
    </div>
  )
}

// ── Component ───────────────────────────────────────────────────────────────
export default function DiarioClientView({
  initialDays, allTurmas, targetCoachId, mes, ano,
  coachName,
  initialCref, initialCidade, initialProcesso, initialResumo,
  periodo, documentos,
}: {
  initialDays: InitialDay[]
  allTurmas: TurmaBasic[]
  targetCoachId?: string
  mes: number; ano: number
  coachName: string
  initialCref: string; initialCidade: string; initialProcesso: string; initialResumo: string
  periodo: string
  documentos: DocumentoAssinadoItem[]
}) {
  const storageKey    = `diario-draft-${targetCoachId ?? 'self'}-${ano}-${mes}`
  const hasUserEdited = useRef(false)
  const addCounter    = useRef(0)

  const [newDate,    setNewDate]    = useState('')
  const [addError,   setAddError]   = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  // ── Report metadata state ────────────────────────────────────────────────
  const [cref,     setCref]     = useState(() => { const d = loadDraft(storageKey); return d?.cref     ?? initialCref })
  const [cidade,   setCidade]   = useState(() => { const d = loadDraft(storageKey); return (d?.cidade   ?? initialCidade) || 'São José' })
  const [processo, setProcesso] = useState(() => { const d = loadDraft(storageKey); return d?.processo ?? initialProcesso })
  const [resumo,   setResumo]   = useState(() => { const d = loadDraft(storageKey); return d?.resumo   ?? initialResumo })

  // ── Diary entries state ──────────────────────────────────────────────────
  const [entries, setEntries] = useState<DayEntry[]>(() => {
    const draft = loadDraft(storageKey)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const draftMap: Record<string, any> = {}
    for (const e of draft?.entries ?? []) draftMap[e.date] = e

    const fromInitial: DayEntry[] = initialDays.map((day) => {
      const de = draftMap[day.date]
      // Handle old draft format where "descricao" held what is now "objetivo"
      const isOldFormat = de && ('descricao' in de) && !('objetivo' in de)
      return {
        key:         day.date,
        date:        day.date,
        modalidade:  de?.modalidade  ?? day.modalidade,
        objetivo:    de?.objetivo    ?? (isOldFormat ? de.descricao : undefined) ?? day.objetivo,
        descricao:   isOldFormat ? '' : (de?.descricao ?? day.descricao),
        observacoes: de?.observacoes ?? day.observacoes,
        turmaIds:    de?.turmaIds ?? day.turmaIds,
        fotos:       day.fotos,
      }
    })

    const manualDays: DayEntry[] = (draft?.entries ?? [])
      .filter((e) => !initialDays.some((d) => d.date === e.date))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((e: any) => ({
        key:         e.key ?? e.date,
        date:        e.date,
        modalidade:  e.modalidade  ?? '',
        objetivo:    e.objetivo    ?? e.descricao ?? '',
        descricao:   ('objetivo' in e) ? (e.descricao ?? '') : '',
        observacoes: e.observacoes ?? '',
        turmaIds:    e.turmaIds ?? [],
        fotos:       [],
      }))

    return [...fromInitial, ...manualDays].sort((a, b) => a.date.localeCompare(b.date))
  })

  // ── Autosave ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasUserEdited.current) return
    setSaveStatus('saving')
    let cancelled = false

    const timer = setTimeout(async () => {
      localStorage.setItem(storageKey, JSON.stringify({
        entries: entries.map(({ fotos: _f, ...rest }) => rest),
        cref, cidade, processo, resumo,
      }))

      try {
        await salvarResumoDiario(ano, mes, { cidade, processo, resumo }, targetCoachId)

        if (entries.length > 0) {
          await criarMultiplosRegistros(
            entries.map((en) => ({
              data:        en.date,
              modalidade:  en.modalidade,
              objetivo:    en.objetivo,
              descricao:   en.descricao,
              observacoes: en.observacoes,
              turmaIds:    en.turmaIds,
            })),
            targetCoachId
          )
        }
        if (!cancelled) setSaveStatus('saved')
      } catch {
        if (!cancelled) setSaveStatus('error')
      }
    }, 800)

    return () => { cancelled = true; clearTimeout(timer) }
  }, [entries, cref, cidade, processo, resumo]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (saveStatus !== 'saved') return
    const t = setTimeout(() => setSaveStatus('idle'), 3000)
    return () => clearTimeout(t)
  }, [saveStatus])

  // ── Handlers ─────────────────────────────────────────────────────────────
  function toggleEntryTurma(entryKey: string, turmaId: string) {
    hasUserEdited.current = true
    setEntries((prev) => prev.map((e) => {
      if (e.key !== entryKey) return e
      const has = e.turmaIds.includes(turmaId)
      return { ...e, turmaIds: has ? e.turmaIds.filter((id) => id !== turmaId) : [...e.turmaIds, turmaId] }
    }))
  }

  function update(key: string, patch: Partial<Pick<DayEntry, 'modalidade' | 'objetivo' | 'descricao' | 'observacoes'>>) {
    hasUserEdited.current = true
    setEntries((prev) => prev.map((e) => (e.key === key ? { ...e, ...patch } : e)))
  }

  function addDay() {
    if (!newDate) return
    setAddError('')
    if (entries.some((e) => e.date === newDate)) { setAddError('Esta data já está na lista'); return }
    hasUserEdited.current = true
    const key = `manual-${newDate}-${++addCounter.current}`
    // Facilita a entrada: já vem com as turmas do dia mais recente marcadas
    // (ou todas, se ainda não há nenhum dia), só desmarca quem faltou.
    const lastEntry = entries[entries.length - 1]
    const defaultTurmaIds = lastEntry ? lastEntry.turmaIds : allTurmas.map((t) => t.id)
    setEntries((prev) =>
      [...prev, { key, date: newDate, modalidade: '', objetivo: '', descricao: '', observacoes: '', turmaIds: defaultTurmaIds, fotos: [] }]
        .sort((a, b) => a.date.localeCompare(b.date))
    )
    setNewDate('')
  }

  function removeEntry(key: string) {
    hasUserEdited.current = true
    setEntries((prev) => prev.filter((e) => e.key !== key))
  }

  function handleFotoChange(entryKey: string, turmaId: string, foto: FotoDoDia | null) {
    setEntries((prev) => prev.map((e) => {
      if (e.key !== entryKey) return e
      const semEssaTurma = e.fotos.filter((f) => f.turma_id !== turmaId)
      return { ...e, fotos: foto ? [...semEssaTurma, foto] : semEssaTurma }
    }))
  }

  function setMeta<T>(setter: (v: T) => void) {
    return (v: T) => { hasUserEdited.current = true; setter(v) }
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const reportEntries = entries.filter((e) => e.modalidade || e.objetivo || e.descricao || e.observacoes)

  const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-navy-500 focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white'
  const labelCls = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2'

  return (
    <>
      {/* ══ REPORT (print only) ══════════════════════════════════════════════ */}
      <div className="hidden print:block" style={{ fontFamily: 'Arial, sans-serif', fontSize: 11 }}>

        {/* Logos */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0C143D', paddingBottom: 8, marginBottom: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-escolinha.png" alt="ADTRISC" style={{ height: 60, objectFit: 'contain' }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logos-estado.png" alt="Logos Estado" style={{ height: 44, objectFit: 'contain' }} />
        </div>

        {/* Title */}
        <p style={{ textAlign: 'center', fontWeight: 700, fontSize: 14, textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.5 }}>
          Relatório Diário de Atividades
        </p>
        <p style={{ textAlign: 'center', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', marginBottom: 24 }}>
          Escolinha de Triathlon ADTRISC – São José {ano}
        </p>

        {/* Header info */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ marginBottom: 6 }}>
            <strong>Professor(a):</strong> {coachName}
            {cref && <span style={{ marginLeft: 48 }}><strong>CREF</strong> {cref}</span>}
          </p>
          <p style={{ marginBottom: 0 }}><strong>Mês/Ano:</strong> {MESES_LABEL[mes]}/{ano}</p>
          {processo && <p style={{ marginTop: 4, fontSize: 10, color: '#555' }}>Processo SGPE FESPORTE {processo}</p>}
        </div>

        {/* Orientações */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontWeight: 700, fontSize: 12, marginBottom: 8 }}>ORIENTAÇÕES</p>
          <ul style={{ listStyleType: 'disc', paddingLeft: 20, lineHeight: 1.9, fontSize: 10, color: '#222' }}>
            <li>Preencher um registro para cada dia de atividade.</li>
            <li>A lista de chamada/frequência deverá ser enviada em anexo.</li>
            <li>Descrever de forma objetiva os conteúdos desenvolvidos.</li>
            <li>Informar adaptações realizadas conforme faixa etária e nível das turmas.</li>
            <li>Inserir registros fotográficos das turmas quando houver.</li>
            <li>Em caso de chuva e impossibilidade de uso do espaço coberto, registrar o cancelamento da atividade.</li>
          </ul>
        </div>

        {/* Resumo do mês */}
        {resumo && resumo.split(/\n+/).filter(Boolean).map((paragrafo, i) => (
          <p key={i} style={{ textAlign: 'justify', marginBottom: 24, lineHeight: 1.9, textIndent: '2em' }}>{paragrafo}</p>
        ))}

        {/* Aula entries */}
        {reportEntries.length === 0 ? (
          <p className="print:hidden" style={{ color: '#aaa', fontSize: 11, fontStyle: 'italic', margin: '16px 0' }}>
            Preencha os campos abaixo — o relatório aparecerá aqui conforme você registra.
          </p>
        ) : reportEntries.map((entry, idx) => (
          <div key={entry.key} className="no-break" style={{ marginBottom: 24 }}>
            {idx > 0 && <hr style={{ borderColor: '#555', marginBottom: 16 }} />}

            <p style={{ fontWeight: 700, fontSize: 12, marginBottom: 2 }}>AULA Nº {idx + 1}</p>
            <p style={{ marginBottom: 4 }}><strong>Data:</strong> {formatDataSimples(entry.date)} – {diaSemana(entry.date)}</p>

            {entry.modalidade && (
              <p style={{ marginBottom: 4 }}>
                <strong>Modalidade:</strong> {MODALIDADE_LABEL[entry.modalidade] ?? entry.modalidade}
              </p>
            )}

            {allTurmas.length > 0 && (
              <p style={{ marginBottom: 12 }}>
                <strong>Turmas atendidas:</strong>{' '}
                {allTurmas.map((t) => (
                  <span key={t.id} style={{ marginRight: 16 }}>
                    {t.nome} {entry.turmaIds.includes(t.id) ? '✔' : '✗'}
                  </span>
                ))}
              </p>
            )}

            {entry.objetivo && (
              <>
                <p style={{ fontWeight: 700, marginBottom: 4 }}>Objetivo da Aula</p>
                <p style={{ marginBottom: 10, textAlign: 'justify', lineHeight: 1.8 }}>{entry.objetivo}</p>
              </>
            )}

            {entry.descricao && (
              <>
                <p style={{ fontWeight: 700, marginBottom: 4 }}>Descrição das Atividades / Metodologia</p>
                {entry.turmaIds.length > 0 ? (
                  entry.turmaIds.map((tid) => {
                    const t = allTurmas.find((x) => x.id === tid)
                    return (
                      <p key={tid} style={{ marginBottom: 8, textAlign: 'justify', lineHeight: 1.8 }}>
                        <strong>{t ? turmaShortLabel(t.nome) : ''}:</strong> {entry.descricao}
                      </p>
                    )
                  })
                ) : (
                  <p style={{ marginBottom: 10, textAlign: 'justify', lineHeight: 1.8 }}>{entry.descricao}</p>
                )}
              </>
            )}

            {entry.observacoes && (
              <>
                <p style={{ fontWeight: 700, marginBottom: 4 }}>Observações / Intercorrências</p>
                <p style={{ marginBottom: 10, lineHeight: 1.8 }}>{entry.observacoes}</p>
              </>
            )}

            {entry.fotos.length > 0 && (
              <div style={{ marginTop: 10 }}>
                {entry.fotos.map((foto) => (
                  <div key={foto.id} className="no-break" style={{ marginBottom: 16, textAlign: 'center' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={foto.url} alt={foto.titulo || 'Foto do dia'}
                      style={{ maxWidth: '80%', maxHeight: 280, objectFit: 'cover', borderRadius: 4, display: 'block', margin: '0 auto' }} />
                    {foto.titulo && (
                      <p style={{ fontSize: 10, color: '#333', marginTop: 6 }}>
                        <strong>{foto.titulo}</strong>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Footer */}
        <div style={{ marginTop: 40, borderTop: '1px solid #555', paddingTop: 20 }}>
          <p style={{ margin: '0 0 3px 0' }}>Treinador Responsável</p>
          {coachName && (
            <p style={{ margin: '0 0 36px 0' }}>{coachName}{cref ? ` – CREF ${cref}` : ''}</p>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ borderBottom: '1px solid #555', width: 300 }} />
            <p style={{ margin: 0 }}>
              {cidade || 'São José'}, {ultimoDia(ano, mes)} de {MESES_EXTENSO[mes]} de {ano}.
            </p>
          </div>
        </div>
      </div>

      {/* ══ FORM (hidden when printing) ══════════════════════════════════════ */}
      <div className="print:hidden space-y-4">
        {targetCoachId && (
          <Card>
            <DocumentosAssinadosSection
              coachId={targetCoachId}
              tipo="diario_aula"
              periodo={periodo}
              documentos={documentos}
            />
          </Card>
        )}

        <Card>
          <div className="space-y-6">

            {/* Report metadata */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Dados do Relatório</p>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 bg-sky-400 hover:bg-sky-500 text-white font-bold text-sm px-4 py-2 rounded-xl transition-colors"
                >
                  <Printer size={14} />
                  Imprimir / PDF
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                <div>
                  <label className={labelCls}>CREF <span className="normal-case font-normal text-gray-400">(opcional)</span></label>
                  <input type="text" value={cref}
                    onChange={(e) => setMeta(setCref)(e.target.value)}
                    placeholder="Ex: 36090-G/SC" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Cidade</label>
                  <input type="text" value={cidade}
                    onChange={(e) => setMeta(setCidade)(e.target.value)}
                    placeholder="Ex: São José" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Processo SGPE <span className="normal-case font-normal text-gray-400">(opcional)</span></label>
                  <input type="text" value={processo}
                    onChange={(e) => setMeta(setProcesso)(e.target.value)}
                    placeholder="Ex: 5217/2025" className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Resumo do mês <span className="normal-case font-normal text-gray-400">(parágrafo introdutório — opcional)</span></label>
                <textarea rows={3} value={resumo}
                  onChange={(e) => setMeta(setResumo)(e.target.value)}
                  placeholder="Descreva brevemente as atividades gerais do mês..."
                  className={`${inputCls} resize-y`} />
              </div>
            </div>

            <hr className="border-gray-100" />

            {entries.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-2">
                Nenhum registro neste mês. Adicione uma data abaixo.
              </p>
            )}

            {entries.map((entry) => (
              <div key={entry.key} className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <span className="text-sm font-bold text-navy-500">{formatDate(entry.date)}</span>
                  <button type="button" onClick={() => removeEntry(entry.key)} className="text-gray-300 hover:text-red-400 transition-colors">
                    <X size={15} />
                  </button>
                </div>
                <div className="px-4 py-4 space-y-4">
                  <div>
                    <label className={labelCls}>Turmas atendidas</label>
                    <div className="flex flex-wrap gap-2">
                      {allTurmas.map((t) => (
                        <label key={t.id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer transition-colors text-xs font-semibold select-none ${
                          entry.turmaIds.includes(t.id) ? 'bg-sky-50 border-sky-300 text-sky-700' : 'bg-gray-50 border-gray-200 text-gray-400'
                        }`}>
                          <input type="checkbox" checked={entry.turmaIds.includes(t.id)} onChange={() => toggleEntryTurma(entry.key, t.id)} className="w-3 h-3 accent-sky-400" />
                          {t.nome}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Modalidade</label>
                    <select value={entry.modalidade} onChange={(e) => update(entry.key, { modalidade: e.target.value })} className={inputCls}>
                      <option value="" disabled>Selecione...</option>
                      {MODALIDADES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Objetivo da Aula</label>
                    <textarea rows={2} value={entry.objetivo}
                      onChange={(e) => update(entry.key, { objetivo: e.target.value })}
                      placeholder="Ex: Promover a interação do grupo, avaliar condicionamento..."
                      className={`${inputCls} resize-y`} />
                  </div>
                  <div>
                    <label className={labelCls}>Descrição das Atividades / Metodologia</label>
                    <textarea rows={4} value={entry.descricao}
                      onChange={(e) => update(entry.key, { descricao: e.target.value })}
                      placeholder="Descreva as atividades por turma: T1: ... T2: ..."
                      className={`${inputCls} resize-y`} />
                  </div>
                  <div>
                    <label className={labelCls}>Observações / Intercorrências</label>
                    <textarea rows={2} value={entry.observacoes}
                      onChange={(e) => update(entry.key, { observacoes: e.target.value })}
                      placeholder="Ex: ✔ Aula realizada normalmente"
                      className={`${inputCls} resize-y`} />
                  </div>
                  <div>
                    <label className={labelCls}>Fotos do dia</label>
                    {entry.turmaIds.length === 0 ? (
                      <p className="text-xs text-gray-400">Marque ao menos uma turma atendida para adicionar fotos.</p>
                    ) : (
                      <div className="flex flex-wrap gap-3">
                        {entry.turmaIds.map((turmaId) => (
                          <FotoDoDiaSlot
                            key={turmaId}
                            entryKey={entry.key}
                            date={entry.date}
                            turmaId={turmaId}
                            turmaLabel={entry.turmaIds.length > 1 ? (allTurmas.find((t) => t.id === turmaId)?.nome ?? null) : null}
                            foto={entry.fotos.find((f) => f.turma_id === turmaId)}
                            onChange={(foto) => handleFotoChange(entry.key, turmaId, foto)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Add manual day */}
            <div className="space-y-1.5">
              <div className="flex gap-2 items-center">
                <input type="date" value={newDate}
                  onChange={(e) => { setNewDate(e.target.value); setAddError('') }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDay() } }}
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-navy-500 focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white" />
                <button type="button" onClick={addDay} disabled={!newDate}
                  className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 hover:border-gray-300 text-gray-500 hover:text-navy-500 font-semibold text-sm rounded-xl transition-colors disabled:opacity-40">
                  <Plus size={15} /> Adicionar dia
                </button>
              </div>
              {addError && <p className="text-xs text-red-500 pl-1">{addError}</p>}
            </div>

            {/* Save status */}
            <div className="flex justify-end pt-1 min-h-5">
              {saveStatus === 'saving' && (
                <span className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Loader size={13} className="animate-spin" /> Salvando...
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="flex items-center gap-1.5 text-xs text-emerald-500">
                  <CheckCircle size={13} /> Salvo automaticamente
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="flex items-center gap-1.5 text-xs text-red-500">
                  <AlertCircle size={13} /> Erro ao salvar — tente novamente
                </span>
              )}
            </div>

          </div>
        </Card>
      </div>
    </>
  )
}
