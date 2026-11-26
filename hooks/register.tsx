import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'
import { FRONT, SCENE } from './scene.js'
import type { StarlitGauge } from '../types'

// Context-window fill, 0 to 100. null until the first model response.
const fill = atom({ plugin: 'starlit-holiday', key: 'fill' } as const, null)
const gauge = atom({ plugin: 'starlit-holiday', key: 'gauge' } as const, null)

const { theme, problems } = makeColors({
  label: 'Starlit Holiday',
  only: 'dark',
  roles: { accent: '#e8c46a', danger: '#e0605a', success: '#5fae7a', warning: '#e0a64a', pro: '#9b8ce0' },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#0b1324',
        'surface-1': '#111b30',
        'surface-2': '#16223a',
        'surface-3': '#1a2740',
        'text-primary': '#eef2fa',
        'text-secondary': '#c5cde0',
        'text-muted': '#9aa6c0',
      },
    },
  },
})

const LOOK: ThemeSetArgs = {
  colors: theme,
  backdrop: { scene: 'starlit-holiday', glass: { blur: 14, tint: '#0b1324', opacity: 0.62 } },
}

// The drift rises fast: handoff time (~15-20% of a 1M window) already looks deep.
// Tuned so at ~15% only the snowman's hat shows above the back drift.
// ponytail: tops out at 40% (back drift near mid-screen) so the chat stays readable
const drift = (percent: number) => {
  const t = 900 - (12 + Math.min(percent, 40) * 8)
  // Three drifts, back to front, each a different wave so the shadows show between them.
  const wave = (y: number, a: number, b: number, c: number) =>
    `M0 ${y + a} C250 ${y - b} 450 ${y + c} 700 ${y} S1150 ${y - c} 1350 ${y + b} S1550 ${y - a} 1600 ${y}`
  return `<defs><linearGradient id="dft" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".18" stop-color="#e2eaf7"/><stop offset=".6" stop-color="#b3c3df"/><stop offset="1" stop-color="#8fa4c9"/></linearGradient>`
    + `<linearGradient id="dfm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9d6ec"/><stop offset=".3" stop-color="#9db0d2"/><stop offset="1" stop-color="#6f86b2"/></linearGradient>`
    + `<linearGradient id="dfb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a3b5d6"/><stop offset=".3" stop-color="#6f86b2"/><stop offset="1" stop-color="#4b628f"/></linearGradient>`
    + `<filter id="dsh" x="-5%" y="-50%" width="110%" height="200%"><feGaussianBlur stdDeviation="6"/></filter></defs>`
    + `<path d="${wave(t - 60, 10, 22, 14)} V900 H0Z" fill="url(#dfb)"/>`
    + `<path d="${wave(t - 60, 10, 22, 14)}" stroke="#dbe5f4" stroke-width="2" fill="none" opacity=".55"/>`
    + `<path d="${wave(t - 42, 10, 22, 14)}" stroke="#2e4470" stroke-width="12" fill="none" opacity=".35" filter="url(#dsh)"/>`
    + `<path d="${wave(t - 30, -8, 14, 20)} V900 H0Z" fill="url(#dfm)"/>`
    + `<path d="${wave(t - 30, -8, 14, 20)}" stroke="#eef4fc" stroke-width="2" fill="none" opacity=".75"/>`
    + `<path d="${wave(t - 12, -8, 14, 20)}" stroke="#3f5682" stroke-width="12" fill="none" opacity=".35" filter="url(#dsh)"/>`
    + `<path d="${wave(t, 6, 10, 16)} V900 H0Z" fill="url(#dft)"/>`
    + `<path d="${wave(t + 10, 6, 10, 16)}" stroke="#8da2c9" stroke-width="12" fill="none" opacity=".35" filter="url(#dsh)"/>`
    + `<path d="${wave(t, 6, 10, 16)}" stroke="#ffffff" stroke-width="2.5" fill="none"/>`
    + [120, 310, 480, 690, 860, 1040, 1210, 1380, 1530].map((x, i) =>
      `<circle class="sp" style="animation-delay:-${(i * 0.7) % 4}s" cx="${x}" cy="${t + 14 + (i % 3) * 9}" r="1.6" fill="#fff"/>`).join('')
}

const k = (n: number) => (n >= 1_000_000 ? `${+(n / 1_000_000).toFixed(1)}M` : `${Math.round(n / 1000)}K`)
const tone = (p: number) => (p >= 80 ? '#ff7a70' : p >= 60 ? '#f0c86a' : '#9fdcff')

// One thin watch-face ring: a faint track and an arc that fills clockwise from the top.
const ring = (cx: number, p: number, icon: string, label: string, sub: string) => {
  const r = 30
  const c = 2 * Math.PI * r
  const on = (Math.min(p, 100) / 100) * c
  return `<circle cx="${cx}" cy="128" r="${r}" fill="none" stroke="#ffffff" stroke-opacity=".12" stroke-width="5"/>`
    + `<circle cx="${cx}" cy="128" r="${r}" fill="none" stroke="${tone(p)}" stroke-width="5" stroke-linecap="round" stroke-dasharray="${on} ${c}" transform="rotate(-90 ${cx} 128)" filter="url(#gl)"/>`
    + `<text x="${cx}" y="134" text-anchor="middle" font-size="17" font-weight="600" fill="#f4f8ff">${Math.round(p)}%</text>`
    + `<text x="${cx}" y="182" text-anchor="middle" font-size="12" fill="#cfe2f7">${icon} ${label}</text>`
    + `<text x="${cx}" y="199" text-anchor="middle" font-size="10.5" fill="#93a8c6">${sub}</text>`
}

// Frosted ice-glass card, top left, with a few flakes drifting across it.
const card = (g: StarlitGauge) => {
  const five = g.fiveHour === null
    ? ring(490, 0, '⏳', '5 hrs', 'API plan: no limit')
    : ring(490, g.fiveHour, '⏳', '5-hour window', g.resetsIn ? `resets in ${g.resetsIn}` : '')
  // ponytail: shifted down so wide windows (which crop the scene top) still show it
  return `<g font-family="Segoe UI, system-ui, sans-serif" transform="translate(0 130)">`
    + `<defs><linearGradient id="ice" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#dff0ff" stop-opacity=".16"/><stop offset="1" stop-color="#9fc4ea" stop-opacity=".06"/></linearGradient>`
    + `<filter id="gl"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`
    + `<rect x="325" y="62" width="230" height="160" rx="18" fill="url(#ice)" stroke="#e6f2ff" stroke-opacity=".38" stroke-width="1"/>`
    + `<rect x="326" y="63" width="228" height="1.2" rx=".6" fill="#ffffff" opacity=".5"/>`
    + `<text x="440" y="88" text-anchor="middle" font-size="11" letter-spacing="2.5" fill="#bcd3ee">WINTER GAUGE</text>`
    + ring(390, g.percent, '❄', 'Chat', `${k(g.tokens)} / ${k(g.window)} tokens`)
    + five
    + [[345, 0], [445, 2.5], [535, 5]].map(([x, d]) =>
      `<circle cx="${x}" cy="70" r="1.6" fill="#fff" opacity=".8"><animate attributeName="cy" values="66;218" dur="9s" begin="${d}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;.85;0" dur="9s" begin="${d}s" repeatCount="indefinite"/></circle>`).join('')
    + `</g>`
}

// ponytail: countdown is worked out at each turn end, so it can lag between turns
const until = (iso: string | undefined, now: number) => {
  if (!iso) return null
  // Accept an ISO date or plain epoch seconds/ms; anything else shows no countdown.
  const n = Number(iso)
  const at = Number.isNaN(n) ? Date.parse(iso) : n < 1e12 ? n * 1000 : n
  if (Number.isNaN(at)) return null
  const mins = Math.max(0, Math.round((at - now) / 60000))
  return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`
}

const refresh = async ($: EngineInterface) => {
  const { context, rateLimits } = await $.session.usage()
  if (context.percent === undefined || context.tokens === undefined) return
  const percent = context.percent
  const five = rateLimits.find(r => r.kind === 'five_hour')
  const g: StarlitGauge = {
    tokens: context.tokens,
    window: context.window,
    percent,
    fiveHour: five ? five.percentUsed : null,
    resetsIn: five ? until(five.resetsAt, await $.clock.now()) : null,
  }
  await update($, fill, () => percent)
  await update($, gauge, () => g)
  $.ui.status(`❄ Snowfall ${percent}%`)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))
    if (unpainted !== undefined) $.ui.toast(unpainted)

    const set = await $.theme.set(LOOK)
    if (!set.isDrawn) $.ui.status(set.reason)

    await refresh($)
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    await refresh($)
    return next(e)
  })

  on('ui.render', { component: 'Backdrop' }, async ($, e, next) => {
    if (e.surface !== 'desktop' && e.surface !== 'mobile') return next(e)

    const { Svg } = $.ui.resolve(e)
    const percent = (await read($, fill)) ?? 0
    const g = await read($, gauge)

    return <Svg source={SCENE + drift(percent) + FRONT + (g ? card(g) : '') + '</svg>'} alt="Starry winter night with snowy pine trees and a frosted gauge card" isInteractive />
  })

}
