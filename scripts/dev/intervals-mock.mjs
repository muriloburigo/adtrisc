#!/usr/bin/env node
// Intervals.icu FALSO, só para desenvolvimento: imita o OAuth, os eventos do
// calendário e a lista de atividades, para testar a integração sem o app real.
//   node scripts/dev/intervals-mock.mjs          (porta 4010)
// No .env.development.local: INTERVALS_BASE_URL=http://localhost:4010 (+ CLIENT_ID/SECRET quaisquer).
// Extras do mock:
//   GET  /_mock/estado                  → eventos e atividades guardados
//   POST /_mock/atividade {tipo, data, distancia_m, duracao_s, fc, evento?, cumprimento?, voltas?}  → cria uma atividade "feita"
//        (evento = paired_event_id: simula o Intervals pareando com o treino enviado; voltas = icu_intervals)
//   POST /_mock/webhook {tipo}          → dispara o webhook do app local (ACTIVITY_UPLOADED etc.)
import { createServer } from 'node:http'

const PORTA = Number(process.env.PORTA ?? 4010)
const ATLETA = 'i999999'
const eventos = new Map()   // id → evento
const atividades = []
let seq = 1000

const json = (res, status, corpo) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(corpo === undefined ? '' : JSON.stringify(corpo)) }
const ler = (req) => new Promise((ok) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => ok(b)) })

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORTA}`)
  const p = url.pathname
  const corpo = await ler(req)
  console.log(req.method, p, req.headers.authorization ? '(auth)' : '')

  if (p === '/oauth/authorize') {
    const volta = new URL(url.searchParams.get('redirect_uri'))
    volta.searchParams.set('code', 'codigo-mock')
    volta.searchParams.set('state', url.searchParams.get('state') ?? '')
    res.writeHead(302, { Location: volta.toString() }); return res.end()
  }
  if (p === '/api/oauth/token' && req.method === 'POST') {
    const f = new URLSearchParams(corpo)
    if (f.get('code') !== 'codigo-mock') return json(res, 400, { error: 'invalid_grant' })
    return json(res, 200, { access_token: `token-mock-${seq++}`, scope: 'CALENDAR:WRITE,ACTIVITY:READ', athlete: { id: ATLETA, name: 'Atleta Mock' } })
  }
  if (p.startsWith('/_mock/')) {
    if (p === '/_mock/estado') return json(res, 200, { eventos: [...eventos.values()], atividades })
    if (p === '/_mock/atividade') {
      const a = JSON.parse(corpo || '{}')
      const v = a.distancia_m && a.duracao_s ? a.distancia_m / a.duracao_s : null
      // Campos com os nomes da API oficial (intervals.icu/api/v1/docs → Activity).
      const atv = {
        id: `a${seq++}`, name: a.nome ?? 'Corrida da manhã', type: a.tipo ?? 'Run', start_date_local: `${a.data}T07:00:00`,
        distance: a.distancia_m ?? null, moving_time: a.duracao_s ?? null, elapsed_time: a.duracao_s ? a.duracao_s + 95 : null,
        average_speed: v, max_speed: v ? v * 1.35 : null, gap: v ? v * 1.02 : null,
        average_heartrate: a.fc ?? 150, max_heartrate: (a.fc ?? 150) + 20, average_cadence: 84, total_elevation_gain: 42, total_elevation_loss: 40,
        calories: 410, icu_training_load: 45, icu_intensity: 82.5, trimp: 61, decoupling: 3.4, icu_efficiency_factor: 1.42,
        icu_rpe: 6, feel: 2, compliance: a.cumprimento ?? null, average_temp: 23.5, average_stride: 1.08, device_name: 'Garmin Forerunner 265',
        icu_hrr: { hrr: 31 }, interval_summary: a.resumo ?? ['4x 2m30s 3:45/km', '3x 2m 5:40/km'],
        icu_hr_zone_times: [300, 900, 600, 300, 60, 0, 0], pace_zone_times: [200, 800, 700, 350, 50],
        paired_event_id: a.evento ? Number(a.evento) : null, analyzed: new Date().toISOString(),
        _voltas: a.voltas ?? null,
      }
      atividades.push(atv)
      const { _voltas, ...publico } = atv
      return json(res, 200, publico)
    }
    if (p === '/_mock/webhook') {
      const { tipo = 'ACTIVITY_UPLOADED', activity_id } = JSON.parse(corpo || '{}')
      const r = await fetch(`${process.env.APP_URL ?? 'http://localhost:3000'}/api/webhooks/intervals`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: process.env.INTERVALS_WEBHOOK_SECRET ?? 'dev-webhook' },
        body: JSON.stringify({ events: [{ athlete_id: ATLETA, type: tipo, timestamp: new Date().toISOString(), ...(activity_id ? { activity: { id: activity_id } } : {}) }] }),
      })
      if (tipo === 'ACTIVITY_DELETED' && activity_id) atividades.splice(atividades.findIndex((a) => a.id === activity_id), 1)
      return json(res, r.status, { status: r.status })
    }
  }
  if (!req.headers.authorization) return json(res, 401, { error: 'sem token' })
  if (p === '/api/v1/disconnect-app') return json(res, 200, {})
  let m
  if ((m = p.match(/^\/api\/v1\/athlete\/([^/]+)\/events$/)) && req.method === 'POST') {
    const id = seq++
    eventos.set(String(id), { id, ...JSON.parse(corpo) }); return json(res, 200, { id })
  }
  if ((m = p.match(/^\/api\/v1\/athlete\/([^/]+)\/events\/([^/]+)$/))) {
    const id = m[2]
    if (!eventos.has(id)) return json(res, 404, { error: 'not found' })
    if (req.method === 'PUT') { eventos.set(id, { id: Number(id), ...JSON.parse(corpo) }); return json(res, 200, { id: Number(id) }) }
    if (req.method === 'DELETE') { eventos.delete(id); return json(res, 200, {}) }
  }
  if ((m = p.match(/^\/api\/v1\/activity\/([^/]+)\/intervals$/))) {
    const atv = atividades.find((x) => x.id === decodeURIComponent(m[1]))
    if (!atv) return json(res, 404, { error: 'not found' })
    return json(res, 200, { id: atv.id, analyzed: atv.analyzed, icu_intervals: atv._voltas ?? [], icu_groups: [] })
  }
  if ((m = p.match(/^\/api\/v1\/athlete\/([^/]+)\/activities$/))) {
    const de = url.searchParams.get('oldest') ?? '0000', ate = url.searchParams.get('newest') ?? '9999'
    return json(res, 200, atividades.filter((a) => a.start_date_local.slice(0, 10) >= de && a.start_date_local.slice(0, 10) <= ate).map(({ _voltas, ...x }) => x))
  }
  json(res, 404, { error: 'rota desconhecida no mock' })
}).listen(PORTA, () => console.log(`Intervals mock em http://localhost:${PORTA}`))
