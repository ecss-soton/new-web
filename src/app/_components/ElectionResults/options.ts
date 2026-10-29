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
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: {
      beginAtZero: true,
      ticks: {
        precision: 0,
        font: { size: isMobile ? 11 : 14 },
      },
      grid: {
        lineWidth: 2,
        color: getCssVariable('--theme-elevation-1000'),
      },
    },
    y: {
      ticks: {
        autoSkip: false,
        font: { size: isMobile ? 11 : 14 },
        padding: 6,
      },
      grid: {
        lineWidth: 2,
        tickWidth: 0,
        color: getCssVariable('--theme-elevation-1000'),
      },
    },
  },
  layout: {
    // Keep long, wrapped candidate labels away from the chart edges.
    padding: { top: 4, right: isMobile ? 4 : 8, bottom: 4, left: 0 },
  },
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      callbacks: {
        title(tooltipItems): string | string[] | void {
          return tooltipItems[0].label.split(',')
        },
        label(tooltipItem): string {
          return `${tooltipItem.raw} vote(s)`
        },
      },
    },
  },
})
