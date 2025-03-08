import type { ChartOptions } from 'chart.js'

import '../../_css/theme.scss'

const getCssVariable = (variable: string): string => {
  if (typeof window !== 'undefined') {
    return getComputedStyle(document.documentElement).getPropertyValue(variable).trim()
  }
  return '' // Return a default value or handle the case when running on the server
}

export const options: ChartOptions<'bar'> = {
  indexAxis: 'y',
  scales: {
    x: {
      ticks: { precision: 0 },
      grid: {
        lineWidth: 2,
        color: getCssVariable('--theme-elevation-1000'),
      },
    },
    y: {
      grid: {
        lineWidth: 2,
        tickWidth: 0,
        color: getCssVariable('--theme-elevation-1000'),
      },
    },
  },
  responsive: false,
  maintainAspectRatio: false,
  plugins: {
    tooltip: {
      callbacks: {
        title(tooltipItems): string | string[] | void {
          return tooltipItems[0].label.split(',')
        },
      },
    },
  },
}
