'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { X, Plus, CheckCircle, Loader, AlertCircle, Printer, Image as ImageIcon, Trash2, ChevronLeft, ChevronRight, Footprints, Bike, Waves, Activity, Users, Camera, ClipboardCheck } from 'lucide-react'
import Card from '@/components/ui/Card'
import { criarRegistroAula, atualizarRegistroAula, excluirRegistroAula, salvarResumoDiario } from './actions'
import { friendlyError } from '@/lib/errors'
import { setFotoDoDia, removerFotoDoDia, type FotoDoDia } from './fotoActions'
import AssinaturaImpressa from '@/components/documentos/AssinaturaImpressa'
import AssinarGovBrButton from '@/components/documentos/AssinarGovBrButton'
import QuadroGovBr from '@/components/documentos/QuadroGovBr'
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
export type FotoBasic = { id: string; url: string; titulo: string; turma_id: string; storage_path: string }

/** Uma aula do diário (um dia pode ter várias, uma por modalidade). */
export type Aula = {
  id: string
  data: string
  modalidade: string
  objetivo: string
  descricao: string
  observacoes: string
  turmaIds: string[]
}

const ICONE_MOD: Record<string, typeof Footprints> = { corrida: Footprints, ciclismo: Bike, natacao: Waves, triathlon: Activity, duathlon: Activity, reuniao: Users }
const COR_MOD: Record<string, string> = {
  corrida: 'bg-green-500', ciclismo: 'bg-purple-500', natacao: 'bg-sky-500',
  triathlon: 'bg-orange-500', duathlon: 'bg-amber-400', reuniao: 'bg-gray-400',
}
const TXT_MOD: Record<string, string> = {
  corrida: 'text-green-600', ciclismo: 'text-purple-600', natacao: 'text-sky-600',
  triathlon: 'text-orange-600', duathlon: 'text-amber-600', reuniao: 'text-gray-500',
}
const NOMES_DIA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Semanas (seg–dom) que cobrem o mês. */
function semanasDoMes(ano: number, mes: number): string[][] {
  const primeiro = new Date(ano, mes - 1, 1)
  const inicio = new Date(ano, mes - 1, 1 - ((primeiro.getDay() + 6) % 7))
  const semanas: string[][] = []
  for (let d = new Date(inicio); d.getMonth() <= mes - 1 || d.getFullYear() < ano || semanas.length === 0;) {
    if (d.getFullYear() > ano || (d.getFullYear() === ano && d.getMonth() > mes - 1)) break
    const sem: string[] = []
    for (let i = 0; i < 7; i++) { sem.push(iso(d)); d.setDate(d.getDate() + 1) }
    semanas.push(sem)
  }
  return semanas
}

// ── Foto do dia (por turma) ──────────────────────────────────────────────────
function FotoDoDiaSlot({
  date, turmaId, turmaLabel, foto, onChange,
}: {
  date: string
  turmaId: string
  turmaLabel: string | null
  foto: FotoBasic | undefined
  onChange: (foto: FotoDoDia | null) => void
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [confirmingRemove, setConfirmingRemove] = useState(false)
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
    startTransition(async () => {
      await removerFotoDoDia(turmaId, date, foto.storage_path)
      onChange(null)
      setConfirmingRemove(false)
    })
  }

  return (
    <div>
      {turmaLabel && <p className="text-xs text-gray-400 mb-1">{turmaLabel}</p>}
      {foto ? (
        <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50 aspect-video max-w-[220px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={foto.url} alt={foto.titulo || 'Foto do dia'} className="w-full h-full object-cover" />
          {confirmingRemove ? (
            <div className="absolute top-1.5 right-1.5 flex items-center gap-1.5 bg-black/70 rounded-full px-2.5 py-1">
              <button
                type="button"
                disabled={pending}
                onClick={handleRemove}
                className="text-white text-[11px] font-semibold hover:text-red-300 disabled:opacity-50"
              >
                {pending ? '…' : 'Remover'}
              </button>
              <span className="text-white/40 text-[11px]">·</span>
              <button
                type="button"
                onClick={() => setConfirmingRemove(false)}
                className="text-white/70 text-[11px] hover:text-white"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirmingRemove(true)}
              className="absolute top-1.5 right-1.5 bg-black/50 text-white rounded-full p-1 hover:bg-red-500/90 transition-colors disabled:opacity-50"
              title="Remover foto"
            >
              <Trash2 size={12} />
            </button>
          )}
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

// ── Modal da aula ───────────────────────────────────────────────────────────
type FormAula = Omit<Aula, 'id'>

function AulaModal({
  aula, inicial, allTurmas, fotos, targetCoachId, onFoto, onFechar,
}: {
  aula: Aula | null                       // null = aula nova
  inicial: FormAula
  allTurmas: TurmaBasic[]
  fotos: (FotoBasic & { data: string })[]
  targetCoachId?: string
  onFoto: (data: string, turmaId: string, foto: FotoDoDia | null) => void
  onFechar: () => void
}) {
  const router = useRouter()
  const [f, setF] = useState<FormAula>(inicial)
  const [pending, startTransition] = useTransition()
  const [erro, setErro] = useState<string | null>(null)
  const [confirmaExcluir, setConfirmaExcluir] = useState(false)
  const set = (patch: Partial<FormAula>) => setF((x) => ({ ...x, ...patch }))
  const toggleTurma = (id: string) => set({ turmaIds: f.turmaIds.includes(id) ? f.turmaIds.filter((x) => x !== id) : [...f.turmaIds, id] })

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onFechar])

  function salvar() {
    if (!f.modalidade) { setErro('Escolha a modalidade.'); return }
    setErro(null)
    startTransition(async () => {
      const r = aula ? await atualizarRegistroAula(aula.id, f) : await criarRegistroAula(f, targetCoachId)
      if (r.error) { setErro(r.error); return }
      router.refresh()
      onFechar()
    })
  }
  function excluir() {
    if (!aula) return
    startTransition(async () => {
      const r = await excluirRegistroAula(aula.id)
      if (r.error) { setErro(r.error); return }
      router.refresh()
      onFechar()
    })
  }

  const inputCls = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-navy-500 focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white'
  const labelCls = 'block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5'
  return (
    <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center bg-black/40 sm:p-4" onClick={onFechar}>
      <div className="bg-white sm:rounded-2xl shadow-xl w-full max-w-2xl flex flex-col h-[100svh] sm:h-auto sm:max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 px-5 pt-4 pb-3 border-b border-gray-100">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-gray-400">{aula ? 'Editar aula' : 'Nova aula'}</p>
            <p className="text-lg font-semibold text-navy-500">{f.data ? `${formatDataSimples(f.data)} – ${diaSemana(f.data)}` : 'Aula'}</p>
          </div>
          <button onClick={onFechar} className="text-gray-400 hover:text-gray-600 p-1"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Data</label>
              <input type="date" value={f.data} onChange={(e) => set({ data: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Modalidade</label>
              <div className="flex flex-wrap gap-1.5">
                {MODALIDADES.map((m) => {
                  const Icone = ICONE_MOD[m.value] ?? Activity
                  const ativo = f.modalidade === m.value
                  return (
                    <button key={m.value} type="button" onClick={() => set({ modalidade: m.value })}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold ${ativo ? 'bg-navy-500 border-navy-500 text-white' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                      <Icone size={13} className={ativo ? '' : TXT_MOD[m.value]} /> {m.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
          <div>
            <label className={labelCls}>Turmas atendidas</label>
            <div className="flex flex-wrap gap-2">
              {allTurmas.map((t) => (
                <label key={t.id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer transition-colors text-xs font-semibold select-none ${
                  f.turmaIds.includes(t.id) ? 'bg-sky-50 border-sky-300 text-sky-700' : 'bg-gray-50 border-gray-200 text-gray-400'
                }`}>
                  <input type="checkbox" checked={f.turmaIds.includes(t.id)} onChange={() => toggleTurma(t.id)} className="w-3 h-3 accent-sky-400" />
                  {t.nome}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls}>Objetivo da Aula</label>
            <textarea rows={2} value={f.objetivo} onChange={(e) => set({ objetivo: e.target.value })}
              placeholder="Ex: Promover a interação do grupo, avaliar condicionamento..." className={`${inputCls} resize-y`} />
          </div>
          <div>
            <label className={labelCls}>Descrição das Atividades / Metodologia</label>
            <textarea rows={4} value={f.descricao} onChange={(e) => set({ descricao: e.target.value })}
              placeholder="Descreva as atividades por turma: T1: ... T2: ..." className={`${inputCls} resize-y`} />
          </div>
          <div>
            <label className={labelCls}>Observações / Intercorrências</label>
            <textarea rows={2} value={f.observacoes} onChange={(e) => set({ observacoes: e.target.value })}
              placeholder="Ex: ✔ Aula realizada normalmente" className={`${inputCls} resize-y`} />
          </div>
          <div>
            <label className={labelCls}>Fotos do dia <span className="normal-case font-normal text-gray-400">(uma por turma por dia — já salva ao enviar)</span></label>
            {f.turmaIds.length === 0 || !f.data ? (
              <p className="text-xs text-gray-400">Marque ao menos uma turma atendida para adicionar fotos.</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {f.turmaIds.map((turmaId) => (
                  <FotoDoDiaSlot key={`${f.data}-${turmaId}`} date={f.data} turmaId={turmaId}
                    turmaLabel={allTurmas.find((t) => t.id === turmaId)?.nome ?? null}
                    foto={fotos.find((x) => x.data === f.data && x.turma_id === turmaId)}
                    onChange={(foto) => onFoto(f.data, turmaId, foto)} />
                ))}
              </div>
            )}
          </div>
        </div>

        {erro && <p className="mx-5 mb-2 text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{erro}</p>}
        <div className="border-t border-gray-100 px-5 py-3 flex items-center gap-2">
          {aula && (confirmaExcluir ? (
            <span className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Excluir esta aula?</span>
              <button disabled={pending} onClick={excluir} className="font-semibold text-red-500 disabled:opacity-50">Sim, excluir</button>
              <button onClick={() => setConfirmaExcluir(false)} className="text-gray-400">Não</button>
            </span>
          ) : (
            <button onClick={() => setConfirmaExcluir(true)} className="inline-flex items-center gap-1 text-sm text-red-500"><Trash2 size={14} /> Excluir</button>
          ))}
          <button onClick={onFechar} className="ml-auto text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl px-4 py-2">Cancelar</button>
          <button disabled={pending} onClick={salvar}
            className="inline-flex items-center gap-1.5 text-sm font-semibold bg-sky-400 hover:bg-sky-500 text-white rounded-xl px-4 py-2 disabled:opacity-50">
            {pending && <Loader size={14} className="animate-spin" />} Salvar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Component ───────────────────────────────────────────────────────────────
export default function DiarioClientView({
  aulas, chamadas, fotos: fotosProp, allTurmas, targetCoachId, mes, ano,
  coachName,
  initialCref, initialCidade, initialProcesso, initialResumo,
  periodo, documentos,
  assinatura, linkCadastroAssinatura,
}: {
  aulas: Aula[]
  chamadas: Record<string, string[]>       // dia → turmas com chamada salva
  fotos: (FotoBasic & { data: string })[]
  allTurmas: TurmaBasic[]
  targetCoachId?: string
  mes: number; ano: number
  coachName: string
  initialCref: string; initialCidade: string; initialProcesso: string; initialResumo: string
  periodo: string
  documentos: DocumentoAssinadoItem[]
  assinatura: string | null              // assinatura cadastrada do treinador
  linkCadastroAssinatura: string | null
}) {
  const router = useRouter()
  const sp = useSearchParams()
  const [incluirAssinatura, setIncluirAssinatura] = useState(true)
  const hasUserEdited = useRef(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null)
  const [aberta, setAberta] = useState<{ aula: Aula | null; inicial: FormAula } | null>(null)
  // Fotos enviadas/removidas no modal valem na hora (antes de o servidor recarregar).
  const [fotosAlteradas, setFotosAlteradas] = useState<Record<string, (FotoBasic & { data: string }) | null>>({})
  const fotos = [
    ...fotosProp.filter((f) => !(`${f.data}|${f.turma_id}` in fotosAlteradas)),
    ...Object.values(fotosAlteradas).filter((f): f is FotoBasic & { data: string } => Boolean(f)),
  ]

  // ── Dados do relatório (salvos sozinhos) ─────────────────────────────────
  // CREF só sai no relatório: fica lembrado neste navegador (o do perfil é o padrão).
  const chaveCref = `diario-cref-${targetCoachId ?? 'self'}`
  const [cref, setCrefState] = useState(() => {
    try { return (typeof window !== 'undefined' && localStorage.getItem(chaveCref)) || initialCref } catch { return initialCref }
  })
  const setCref = (v: string) => { setCrefState(v); try { localStorage.setItem(chaveCref, v) } catch { /* sem storage */ } }
  const [cidade,   setCidade]   = useState(initialCidade || 'São José')
  const [processo, setProcesso] = useState(initialProcesso)
  const [resumo,   setResumo]   = useState(initialResumo)

  useEffect(() => {
    if (!hasUserEdited.current) return
    setSaveStatus('saving')
    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        await salvarResumoDiario(ano, mes, { cidade, processo, resumo }, targetCoachId)
        if (!cancelled) setSaveStatus('saved')
      } catch (err) {
        if (!cancelled) {
          setSaveErrorMsg(friendlyError(err instanceof Error ? err : String(err), 'Erro ao salvar — tente novamente.'))
          setSaveStatus('error')
        }
      }
    }, 800)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [cref, cidade, processo, resumo]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (saveStatus !== 'saved') return
    const t = setTimeout(() => setSaveStatus('idle'), 3000)
    return () => clearTimeout(t)
  }, [saveStatus])

  function setMeta<T>(setter: (v: T) => void) {
    return (v: T) => { hasUserEdited.current = true; setter(v) }
  }

  function handleFoto(data: string, turmaId: string, foto: FotoDoDia | null) {
    setFotosAlteradas((prev) => ({ ...prev, [`${data}|${turmaId}`]: foto ? { ...foto, data } : null }))
  }

  // ── Calendário ───────────────────────────────────────────────────────────
  const hoje = iso(new Date())
  const semanas = semanasDoMes(ano, mes)
  const aulasDoDia = (d: string) => aulas.filter((a) => a.data === d)
  /** Turmas com chamada no dia que ainda não estão em nenhuma aula registrada. */
  const semRegistro = (d: string) => (chamadas[d] ?? []).filter((t) => !aulasDoDia(d).some((a) => a.turmaIds.includes(t)))
  const curto = (id: string) => { const t = allTurmas.find((x) => x.id === id); return t ? turmaShortLabel(t.nome) : '' }

  function irMes(delta: number) {
    const d = new Date(ano, mes - 1 + delta, 1)
    const q = new URLSearchParams(sp.toString())
    q.set('mes', String(d.getMonth() + 1)); q.set('ano', String(d.getFullYear()))
    router.push(`/diario?${q}`, { scroll: false })
  }

  function novaAula(data: string) {
    const pendentes = semRegistro(data)
    // Facilita: as turmas da chamada do dia; senão as da última aula; senão todas.
    const anterior = [...aulas].filter((a) => a.data <= data).pop()
    const turmaIds = pendentes.length ? pendentes : anterior ? anterior.turmaIds : allTurmas.map((t) => t.id)
    setAberta({ aula: null, inicial: { data, modalidade: '', objetivo: '', descricao: '', observacoes: '', turmaIds } })
  }

  // ── Relatório (impressão) ────────────────────────────────────────────────
  // A foto é do dia × turma: sai na primeira aula do dia que atendeu a turma.
  const reportEntries = aulas.map((a) => {
    const antes = aulas.filter((x) => x.data === a.data && aulas.indexOf(x) < aulas.indexOf(a))
    const turmasComFoto = a.turmaIds.filter((t) => !antes.some((x) => x.turmaIds.includes(t)))
    return { ...a, fotos: fotos.filter((f) => f.data === a.data && turmasComFoto.includes(f.turma_id)) }
  })

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
          {processo && <p style={{ marginTop: 4, fontSize: 10, color: '#555' }}>Processo SGPE {processo}</p>}
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
          <div key={entry.id} className="no-break" style={{ marginBottom: 24 }}>
            {idx > 0 && <hr style={{ borderColor: '#555', marginBottom: 16 }} />}

            <p style={{ fontWeight: 700, fontSize: 12, marginBottom: 2 }}>AULA Nº {idx + 1}</p>
            <p style={{ marginBottom: 4 }}><strong>Data:</strong> {formatDataSimples(entry.data)} – {diaSemana(entry.data)}</p>

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
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
              <AssinaturaImpressa assinatura={incluirAssinatura ? assinatura : null} largura={300} espacoSemAssinatura={0} />
              <QuadroGovBr />
            </div>
            <p style={{ margin: 0 }}>
              {cidade || 'São José'}, {ultimoDia(ano, mes)} de {MESES_EXTENSO[mes]} de {ano}.
            </p>
          </div>
        </div>
      </div>

      {/* ══ TELA (escondida na impressão) ═════════════════════════════════════ */}
      <div className="print:hidden space-y-4">
        <Card>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <button onClick={() => irMes(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500" title="Mês anterior"><ChevronLeft size={18} /></button>
            <p className="text-base font-semibold text-navy-500 min-w-36 text-center">{MESES_LABEL[mes]} {ano}</p>
            <button onClick={() => irMes(1)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500" title="Próximo mês"><ChevronRight size={18} /></button>
            <span className="text-xs text-gray-400 ml-1">{aulas.length} aula{aulas.length !== 1 ? 's' : ''} registrada{aulas.length !== 1 ? 's' : ''}</span>
            <button onClick={() => novaAula(hoje.slice(0, 7) === `${ano}-${String(mes).padStart(2, '0')}` ? hoje : `${ano}-${String(mes).padStart(2, '0')}-01`)}
              className="ml-auto inline-flex items-center gap-1.5 text-sm font-semibold bg-sky-400 hover:bg-sky-500 text-white rounded-xl px-3 py-1.5">
              <Plus size={15} /> Nova aula
            </button>
          </div>

          <div className="hidden sm:grid grid-cols-7 gap-1 text-[11px] font-semibold text-gray-400 mb-1">
            {NOMES_DIA.map((n) => <div key={n} className="px-1">{n}</div>)}
          </div>
          <div className="space-y-1">
            {semanas.map((sem) => (
              <div key={sem[0]} className="sm:grid sm:grid-cols-7 sm:gap-1 space-y-1 sm:space-y-0">
                {sem.map((d, i) => {
                  const foraMes = Number(d.slice(5, 7)) !== mes
                  const doDia = aulasDoDia(d)
                  const pend = foraMes ? [] : semRegistro(d)
                  const vazio = !doDia.length && !pend.length
                  return (
                    <div key={d} className={`group rounded-xl border p-1.5 sm:min-h-[120px] ${foraMes ? 'hidden sm:block opacity-40 bg-gray-50 border-gray-100' : d === hoje ? 'border-sky-400 bg-sky-50/40' : 'border-gray-200 bg-white'} ${vazio && !foraMes ? 'hidden sm:block' : ''}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[11px] font-semibold ${d === hoje ? 'text-sky-600' : 'text-gray-400'}`}><span className="sm:hidden">{NOMES_DIA[i]} </span>{d.slice(8)}</span>
                        {!foraMes && (
                          <button onClick={() => novaAula(d)} title="Registrar aula neste dia"
                            className="p-0.5 rounded text-gray-300 hover:text-sky-500 hover:bg-sky-50"><Plus size={14} /></button>
                        )}
                      </div>
                      <div className="space-y-1">
                        {doDia.map((a) => {
                          const Icone = ICONE_MOD[a.modalidade] ?? Activity
                          const temFoto = fotos.some((f) => f.data === d && a.turmaIds.includes(f.turma_id))
                          return (
                            <button key={a.id} onClick={() => setAberta({ aula: a, inicial: { data: a.data, modalidade: a.modalidade, objetivo: a.objetivo, descricao: a.descricao, observacoes: a.observacoes, turmaIds: a.turmaIds } })}
                              className="w-full text-left rounded-lg border border-gray-200 bg-white overflow-hidden hover:shadow-md transition-shadow">
                              <div className={`h-1 ${COR_MOD[a.modalidade] ?? 'bg-gray-300'}`} />
                              <div className="px-2 py-1.5">
                                <div className="flex items-center gap-1">
                                  <Icone size={14} className={TXT_MOD[a.modalidade] ?? 'text-gray-500'} />
                                  <span className="text-[11px] font-semibold text-navy-500 truncate">{MODALIDADE_LABEL[a.modalidade] ?? a.modalidade}</span>
                                  {temFoto && <Camera size={11} className="ml-auto shrink-0 text-gray-400" />}
                                </div>
                                {a.turmaIds.length > 0 && <p className="text-[10px] text-gray-500 truncate mt-0.5">{a.turmaIds.map(curto).join(' · ')}</p>}
                                {a.objetivo
                                  ? <p className="text-[10px] text-gray-600 line-clamp-2 mt-0.5 leading-snug">{a.objetivo}</p>
                                  : !a.descricao && <p className="text-[10px] text-amber-600 mt-0.5">falta preencher</p>}
                              </div>
                            </button>
                          )
                        })}
                        {pend.length > 0 && (
                          <button onClick={() => novaAula(d)} title="A chamada foi feita, mas a aula ainda não foi registrada"
                            className="w-full text-left rounded-lg border border-dashed border-amber-300 bg-amber-50/60 px-2 py-1.5 hover:bg-amber-50">
                            <p className="text-[10px] font-semibold text-amber-700 flex items-center gap-1"><ClipboardCheck size={11} /> Chamada sem aula</p>
                            <p className="text-[10px] text-amber-700/80 truncate">{pend.map(curto).join(' · ')} · registrar</p>
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
          {aulas.length === 0 && !Object.keys(chamadas).length && (
            <p className="sm:hidden text-sm text-gray-400 text-center py-4">Nenhuma aula neste mês. Toque em “Nova aula”.</p>
          )}
          <p className="text-[11px] text-gray-400 mt-2">Clique no <Plus size={11} className="inline" /> do dia para registrar uma aula. O mesmo dia pode ter mais de uma aula (ex.: natação e corrida) — cada uma vira um card e sai como uma aula no relatório.</p>
        </Card>

        <Card>
          <div className="space-y-6">
            {/* Report metadata */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Dados do Relatório</p>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <AssinarGovBrButton compacto />
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 bg-sky-400 hover:bg-sky-500 text-white font-bold text-sm px-4 py-2 rounded-xl transition-colors"
                  >
                    <Printer size={14} />
                    Imprimir / PDF
                  </button>
                </div>
              </div>
              <div className="mb-3 text-sm text-gray-600">
                {assinatura ? (
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={incluirAssinatura} onChange={(e) => setIncluirAssinatura(e.target.checked)} />
                    Incluir a assinatura de {coachName || 'treinador(a)'} no rodapé
                  </label>
                ) : (
                  <p className="text-xs text-gray-400">
                    {coachName || 'Treinador(a)'} não tem assinatura cadastrada
                    {linkCadastroAssinatura && <> · <a href={linkCadastroAssinatura} className="text-sky-500 hover:underline">cadastrar</a></>}
                  </p>
                )}
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
                    placeholder="Ex: FESPORTE 5217/2025" className={inputCls} />
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
                  <AlertCircle size={13} /> {saveErrorMsg ?? 'Erro ao salvar — tente novamente'}
                </span>
              )}
            </div>
          </div>
        </Card>

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
      </div>

      {aberta && (
        <AulaModal key={aberta.aula?.id ?? `novo-${aberta.inicial.data}`} aula={aberta.aula} inicial={aberta.inicial}
          allTurmas={allTurmas} fotos={fotos} targetCoachId={targetCoachId} onFoto={handleFoto} onFechar={() => setAberta(null)} />
      )}
    </>
  )
}
