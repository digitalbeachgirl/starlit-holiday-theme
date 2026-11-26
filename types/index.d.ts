declare module 'claude-code' {
  interface PluginState {
    'starlit-holiday': { fill: number | null; gauge: StarlitGauge | null }
  }
}

export type StarlitFill = number | null

// What the frosted card in the top left shows.
export type StarlitGauge = {
  tokens: number
  window: number
  percent: number
  fiveHour: number | null
  resetsIn: string | null
}
