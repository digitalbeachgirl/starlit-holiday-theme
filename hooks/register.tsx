import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'
import { SCENE } from './scene.js'
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

// The drift rises from the ground line: 0% = a thin dusting, 100% = deep snow.
const drift = (percent: number) => {
  const top = 900 - (12 + percent * 2.6)
  const mid = top - 14
  return `<path d="M0 ${top} C300 ${mid} 520 ${top + 10} 800 ${top - 4} S1300 ${mid} 1600 ${top} V900 H0Z" fill="#eaf1fc" opacity=".95"/>`
    + `<path d="M0 ${top + 6} C400 ${top - 4} 900 ${top + 14} 1600 ${top + 4}" stroke="#ffffff" stroke-width="2" fill="none" opacity=".7"/>`
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
    ? ring(493, 0, '⏳', '5 hrs', 'API plan: no limit shown')
    : ring(493, g.fiveHour, '⏳', '5-hour window', g.resetsIn ? `resets in ${g.resetsIn}` : '')
  // ponytail: shifted down so wide windows (which crop the scene top) still show it
  return `<g font-family="Segoe UI, system-ui, sans-serif" transform="translate(0 130)">`
    + `<defs><linearGradient id="ice" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#dff0ff" stop-opacity=".16"/><stop offset="1" stop-color="#9fc4ea" stop-opacity=".06"/></linearGradient>`
    + `<filter id="gl"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`
    + `<rect x="300" y="62" width="280" height="186" rx="18" fill="url(#ice)" stroke="#e6f2ff" stroke-opacity=".38" stroke-width="1"/>`
    + `<rect x="301" y="63" width="278" height="1.2" rx=".6" fill="#ffffff" opacity=".5"/>`
    + `<text x="320" y="88" font-size="11" letter-spacing="2.5" fill="#bcd3ee">WINTER GAUGE</text>`
    + ring(387, g.percent, '❄', 'Chat', `${k(g.tokens)} / ${k(g.window)} tokens`)
    + five
    + `<text x="440" y="232" text-anchor="middle" font-size="11" fill="#cfe2f7">In context: ${k(g.tokens)} tokens (${g.percent}% of ${k(g.window)})</text>`
    + [[330, 0], [455, 2.5], [560, 5]].map(([x, d]) =>
      `<circle cx="${x}" cy="70" r="1.6" fill="#fff" opacity=".8"><animate attributeName="cy" values="66;244" dur="9s" begin="${d}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;.85;0" dur="9s" begin="${d}s" repeatCount="indefinite"/></circle>`).join('')
    + `</g>`
}

const meter = (percent: number) => {
  const flakes = Math.round(percent / 10)
  return '❄'.repeat(flakes) + '·'.repeat(10 - flakes)
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

    return <Svg source={SCENE + drift(percent) + (g ? card(g) : '') + '</svg>'} alt="Starry winter night with snowy pine trees and a frosted gauge card" isInteractive />
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const percent = await read($, fill)
    if (e.props.hasSurvey || percent === null) return next(e)

    const { Box, Text } = $.ui.resolve(e)
    const color = percent >= 80 ? 'red' : percent >= 60 ? 'yellow' : 'cyan'

    return (
      <Box>
        <Text color={color}>
          Snowfall {meter(percent)} {percent}% of the chat is full
        </Text>
      </Box>
    )
  })
}
