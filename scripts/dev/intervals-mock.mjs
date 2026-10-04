#!/usr/bin/env node
// Intervals.icu FALSO, só para desenvolvimento: imita o OAuth, os eventos do
// calendário e a lista de atividades, para testar a integração sem o app real.
//   node scripts/dev/intervals-mock.mjs          (porta 4010)
// No .env.development.local: INTERVALS_BASE_URL=http://localhost:4010 (+ CLIENT_ID/SECRET quaisquer).
// Extras do mock:
//   GET  /_mock/estado                  → eventos e atividades guardados
//   POST /_mock/atividade {tipo, data, distancia_m, duracao_s, fc}  → cria uma atividade "feita"
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
      const atv = {
        id: `a${seq++}`, name: a.nome ?? 'Corrida da manhã', type: a.tipo ?? 'Run', start_date_local: `${a.data}T07:00:00`,
        distance: a.distancia_m ?? null, moving_time: a.duracao_s ?? null, average_speed: v, average_heartrate: a.fc ?? 150, max_heartrate: (a.fc ?? 150) + 20,
        icu_hr_zone_times: [300, 900, 600, 300, 60, 0, 0], icu_training_load: 45,
      }
      atividades.push(atv); return json(res, 200, atv)
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
  if ((m = p.match(/^\/api\/v1\/athlete\/([^/]+)\/activities$/))) {
    const de = url.searchParams.get('oldest') ?? '0000', ate = url.searchParams.get('newest') ?? '9999'
    return json(res, 200, atividades.filter((a) => a.start_date_local.slice(0, 10) >= de && a.start_date_local.slice(0, 10) <= ate))
  }
  json(res, 404, { error: 'rota desconhecida no mock' })
}).listen(PORTA, () => console.log(`Intervals mock em http://localhost:${PORTA}`))
