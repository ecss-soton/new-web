import type { ChartOptions } from 'chart.js'

export const options: ChartOptions<'bar'> = {
  indexAxis: 'y',
  scales: {
    x: {
      ticks: { precision: 0 },
      grid: {
        lineWidth: 2,
        color: 'rgba(2,0,0,0.62)',
      },
    },
    y: {
      grid: {
        lineWidth: 2,
        tickWidth: 0,
        color: 'rgba(2,0,0,0.62)',
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
