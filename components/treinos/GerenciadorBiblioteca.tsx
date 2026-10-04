'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Folder, FolderPlus, Pencil, Plus, Search, Trash2, Check, X, Upload } from 'lucide-react'
import MontadorTreino, { type ModeloView } from './MontadorTreino'
import { MODALIDADES, TIPOS_SESSAO } from '@/lib/treinos/tipos'
import { criarPasta, renomearPasta, apagarPasta, moverModelo } from '@/app/(dashboard)/treinos/biblioteca-actions'

type Modelo = ModeloView & { duracao_min: number | null; distancia_km: number | null }

export default function GerenciadorBiblioteca({ pastas, modelos, limites }: {
  pastas: { id: string; nome: string }[]
  modelos: Modelo[]
  limites: number[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [erro, setErro] = useState<string | null>(null)
  const [pasta, setPasta] = useState<string | 'todas' | 'sem'>('todas')
  const [busca, setBusca] = useState('')
  const [aberto, setAberto] = useState<Modelo | 'novo' | null>(null)
  const [novaPasta, setNovaPasta] = useState<string | null>(null)
  const [renomeando, setRenomeando] = useState<{ id: string; nome: string } | null>(null)
  const [importando, setImportando] = useState(false)
  const [ok, setOk] = useState<string | null>(null)
  const arquivo = useRef<HTMLInputElement>(null)

  async function importarFit(f: File) {
    setErro(null); setOk(null); setImportando(true)
    const fd = new FormData(); fd.set('arquivo', f)
    if (pasta !== 'todas' && pasta !== 'sem') fd.set('pasta', pasta)
    const r = await fetch('/api/treinos/importar-fit', { method: 'POST', body: fd })
    const j = await r.json().catch(() => ({}))
    setImportando(false)
    if (!r.ok) { setErro(j.error ?? 'Não foi possível importar.'); return }
    setOk(`Modelo “${j.titulo}” importado.`)
    router.refresh()
  }

  const executar = (fn: () => Promise<{ error?: string }>, depois?: () => void) => startTransition(async () => {
    setErro(null)
    const r = await fn()
    if (r.error) { setErro(r.error); return }
    depois?.()
    router.refresh()
  })

  const visiveis = useMemo(() => {
    const b = busca.trim().toLowerCase()
    return modelos.filter((m) =>
      (pasta === 'todas' || (pasta === 'sem' ? !m.pasta_id : m.pasta_id === pasta)) && (!b || m.titulo.toLowerCase().includes(b)))
  }, [modelos, pasta, busca])

  const itemPasta = (id: typeof pasta, nome: string, n: number) => (
    <button key={id} onClick={() => setPasta(id)}
      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm text-left ${pasta === id ? 'bg-navy-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
      <Folder size={14} /> <span className="truncate flex-1">{nome}</span> <span className="text-xs opacity-70">{n}</span>
    </button>
  )

  return (
    <div className="space-y-3">
      <Link href="/treinos" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-navy-500"><ArrowLeft size={14} /> Calendário</Link>
      {erro && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{erro}</p>}
      {ok && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">{ok}</p>}
      <div className="grid gap-4 md:grid-cols-[220px_1fr]">
        {/* Pastas */}
        <aside className="bg-white rounded-xl border border-gray-200 p-2 h-fit space-y-0.5">
          {itemPasta('todas', 'Todos os modelos', modelos.length)}
          {pastas.map((p) => renomeando?.id === p.id ? (
            <form key={p.id} className="flex items-center gap-1 px-1" onSubmit={(e) => { e.preventDefault(); executar(() => renomearPasta(p.id, renomeando.nome), () => setRenomeando(null)) }}>
              <input autoFocus value={renomeando.nome} onChange={(e) => setRenomeando({ ...renomeando, nome: e.target.value })} className="border border-gray-200 rounded px-2 py-1 text-sm w-full" />
              <button className="p-1 text-sky-500"><Check size={14} /></button>
              <button type="button" onClick={() => setRenomeando(null)} className="p-1 text-gray-400"><X size={14} /></button>
            </form>
          ) : (
            <div key={p.id} className="group flex items-center">
              <div className="flex-1 min-w-0">{itemPasta(p.id, p.nome, modelos.filter((m) => m.pasta_id === p.id).length)}</div>
              <button onClick={() => setRenomeando({ id: p.id, nome: p.nome })} title="Renomear" className="p-1 text-gray-300 hover:text-navy-500 opacity-0 group-hover:opacity-100"><Pencil size={12} /></button>
              <button disabled={pending} title="Apagar pasta (os modelos ficam sem pasta)" className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100"
                onClick={() => executar(() => apagarPasta(p.id), () => pasta === p.id && setPasta('todas'))}><Trash2 size={12} /></button>
            </div>
          ))}
          {itemPasta('sem', 'Sem pasta', modelos.filter((m) => !m.pasta_id).length)}
          {novaPasta === null ? (
            <button onClick={() => setNovaPasta('')} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm text-sky-500 hover:bg-sky-50">
              <FolderPlus size={14} /> Nova pasta
            </button>
          ) : (
            <form className="flex items-center gap-1 px-1 pt-1" onSubmit={(e) => { e.preventDefault(); executar(() => criarPasta(novaPasta), () => setNovaPasta(null)) }}>
              <input autoFocus value={novaPasta} onChange={(e) => setNovaPasta(e.target.value)} placeholder="Nome da pasta" className="border border-gray-200 rounded px-2 py-1 text-sm w-full" />
              <button disabled={pending} className="p-1 text-sky-500"><Check size={14} /></button>
              <button type="button" onClick={() => setNovaPasta(null)} className="p-1 text-gray-400"><X size={14} /></button>
            </form>
          )}
        </aside>

        {/* Modelos */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-1.5 flex-1 min-w-[180px]">
              <Search size={14} className="text-gray-400" />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar modelo" className="text-sm w-full focus:outline-none" />
            </label>
            <input ref={arquivo} type="file" accept=".fit" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importarFit(f); e.target.value = '' }} />
            <button disabled={importando} onClick={() => arquivo.current?.click()} title="Importar um treino em .fit (Garmin Connect, TrainingPeaks…)"
              className="inline-flex items-center gap-1.5 text-sm border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 rounded-xl px-3 py-1.5 disabled:opacity-50">
              <Upload size={14} /> {importando ? 'Importando…' : 'Importar FIT'}
            </button>
            <button onClick={() => setAberto('novo')} className="inline-flex items-center gap-1.5 text-sm font-semibold bg-sky-400 hover:bg-sky-500 text-white rounded-xl px-3 py-1.5">
              <Plus size={14} /> Novo modelo
            </button>
          </div>
          {visiveis.length === 0 ? (
            <p className="text-sm text-gray-400 bg-white rounded-xl border border-gray-200 p-6 text-center">
              Nenhum modelo aqui. Crie um ou, no calendário, abra um treino e use “Salvar na biblioteca”.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {visiveis.map((m) => (
                <div key={m.id} className="bg-white rounded-xl border border-gray-200 p-3 flex flex-col gap-2">
                  <button onClick={() => setAberto(m)} className="text-left">
                    <p className="font-semibold text-navy-500 text-sm">{m.titulo}</p>
                    <p className="text-xs text-gray-500">{MODALIDADES[m.modalidade]} · {TIPOS_SESSAO[m.tipo]}
                      {m.duracao_min ? ` · ${m.duracao_min} min` : ''}{m.distancia_km ? ` · ${Number(m.distancia_km).toLocaleString('pt-BR')} km` : ''}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{m.passos.length} passo{m.passos.length !== 1 ? 's' : ''}</p>
                  </button>
                  <select value={m.pasta_id ?? ''} disabled={pending} onChange={(e) => executar(() => moverModelo(m.id, e.target.value || null))}
                    className="mt-auto border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-500" title="Mover para a pasta">
                    <option value="">Sem pasta</option>
                    {pastas.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {aberto && (
        <MontadorTreino
          key={aberto === 'novo' ? 'novo' : aberto.id}
          modo="modelo"
          modelo={aberto === 'novo' ? (pasta !== 'todas' && pasta !== 'sem' ? { id: '', pasta_id: pasta, titulo: '', tipo: 'base', modalidade: 'running', local: null, notas: null, passos: [] } : null) : aberto}
          pastas={pastas}
          sessao={null}
          novo={null}
          atletas={[]}
          ajustes={{}}
          limites={limites}
          onFechar={() => setAberto(null)}
          onAbrirSessao={() => {}}
        />
      )}
    </div>
  )
}
