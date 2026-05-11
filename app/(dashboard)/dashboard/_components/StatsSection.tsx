import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Card from '@/components/ui/Card'
import { Users, Users2, CalendarCheck, Dumbbell } from 'lucide-react'

export default async function StatsSection() {
  const supabase = await createClient()
  const mesAtras = new Date()
  mesAtras.setDate(mesAtras.getDate() - 30)
  const dataCorte = mesAtras.toISOString().slice(0, 10)

  const [
    { count: atletasAtivos },
    { count: totalTurmas },
    { count: totalAvaliacoes },
    { data: presencasCountRaw },
  ] = await Promise.all([
    supabase.from('alunos').select('id', { count: 'exact', head: true }).eq('status', 'ativo'),
    supabase.from('turmas').select('id', { count: 'exact', head: true }).eq('status', 'ativa'),
    supabase.from('avaliacoes_fisicas').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('presencas').select('turma_id, data').gte('data', dataCorte).is('deleted_at', null).limit(1000),
  ])

  const sessoesDoMes = new Set(
    (presencasCountRaw ?? []).map((r: { turma_id: string; data: string }) => `${r.turma_id}__${r.data}`)
  ).size

  const stats = [
    { label: 'Atletas ativos',       value: atletasAtivos  ?? 0, icon: Users,         color: 'text-sky-400',     href: '/alunos'    },
    { label: 'Turmas ativas',        value: totalTurmas    ?? 0, icon: Users2,        color: 'text-emerald-500', href: '/turmas'    },
    { label: 'Sessões (30 dias)',     value: sessoesDoMes,        icon: CalendarCheck, color: 'text-amber-500',   href: '/presencas' },
    { label: 'Avaliações físicas',   value: totalAvaliacoes ?? 0, icon: Dumbbell,      color: 'text-violet-500',  href: '/avaliacoes'},
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map(({ label, value, icon: Icon, color, href }) => (
        <Link key={label} href={href}>
          <Card className="hover:border-sky-400 hover:shadow-sm transition-all cursor-pointer h-full">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-400">{label}</p>
              <Icon size={18} className={color} />
            </div>
            <p className="text-3xl font-bold text-navy-500">{value}</p>
          </Card>
        </Link>
      ))}
    </div>
  )
}
