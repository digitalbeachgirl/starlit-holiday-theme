import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'
import { SCENE } from './scene.js'

// Context-window fill, 0 to 100. null until the first model response.
const fill = atom({ plugin: 'starlit-holiday', key: 'fill' } as const, null)

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

const meter = (percent: number) => {
  const flakes = Math.round(percent / 10)
  return '❄'.repeat(flakes) + '·'.repeat(10 - flakes)
}

const refresh = async ($: EngineInterface) => {
  const { context } = await $.session.usage()
  if (context.percent === undefined) return
  const percent = context.percent
  await update($, fill, () => percent)
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

    return <Svg source={SCENE + drift(percent) + '</svg>'} alt="Starry winter night with snowy pine trees" isInteractive />
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
