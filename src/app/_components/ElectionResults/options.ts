import type { ChartOptions } from 'chart.js'

import '../../_css/theme.scss'

const getCssVariable = (variable: string): string => {
  if (typeof window !== 'undefined') {
    return getComputedStyle(document.documentElement).getPropertyValue(variable).trim()
  }
  return ''
}

export const buildOptions = (isMobile: boolean): ChartOptions<'bar'> => ({
  indexAxis: 'y',
  scales: {
    x: {
      ticks: {
        precision: 0,
        font: { size: isMobile ? 10 : 14 },
      },
      grid: {
        lineWidth: 2,
        color: getCssVariable('--theme-elevation-1000'),
      },
    },
    y: {
      ticks: {
        font: { size: isMobile ? 10 : 14 },
        // Give labels more room — Chart.js auto-calculates this from maxTicksLimit
        // but we set an explicit pixel cap so labels aren't squeezed on narrow cards
      },
      grid: {
        lineWidth: 2,
        tickWidth: 0,
        color: getCssVariable('--theme-elevation-1000'),
      },
    },
  },
  responsive: true,
  maintainAspectRatio: false,
  layout: {
    // Extra left padding so long candidate names aren't clipped
    padding: { left: isMobile ? 0 : 0 },
  },
  plugins: {
    tooltip: {
      callbacks: {
        title(tooltipItems): string | string[] | void {
          return tooltipItems[0].label.split(',')
        },
      },
    },
  },
})
