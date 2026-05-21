const moovePalette = ['#C084FC', '#A855F7', '#8B5CF6', '#7C3AED', '#6D28D9', '#4C1D95'];

const baseChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  plugins: {
    legend: {
      labels: {
        color: '#A89FB8',
        font: { family: 'Inter', size: 12, weight: '500' },
        padding: 16,
        usePointStyle: true,
        pointStyle: 'circle'
      },
      position: 'bottom'
    },
    tooltip: {
      backgroundColor: 'rgba(15, 8, 30, 0.95)',
      titleColor: '#C084FC',
      bodyColor: '#FFFFFF',
      borderColor: 'rgba(168, 85, 247, 0.5)',
      borderWidth: 1,
      padding: 12,
      titleFont: { family: 'Inter', weight: '700' },
      bodyFont: { family: 'Inter' },
      cornerRadius: 8
    }
  }
};

let chartInstances = {};

export function renderBudgetChart(campaigns) {
  if (chartInstances.budget) chartInstances.budget.destroy();
  const canvas = document.getElementById('budgetChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  chartInstances.budget = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: campaigns.map((c) => c.name),
      datasets: [{
        data: campaigns.map((c) => c.budget),
        backgroundColor: moovePalette,
        borderColor: 'rgba(7, 5, 15, 0.9)',
        borderWidth: 3,
        hoverOffset: 12
      }]
    },
    options: {
      ...baseChartOptions,
      cutout: '60%',
      plugins: {
        ...baseChartOptions.plugins,
        legend: {
          ...baseChartOptions.plugins.legend,
          labels: { ...baseChartOptions.plugins.legend.labels, font: { size: 11 } }
        },
        tooltip: {
          ...baseChartOptions.plugins.tooltip,
          callbacks: {
            label: (ctx) => `R$ ${ctx.parsed.toLocaleString('pt-BR')}`
          }
        }
      }
    }
  });
}

export function renderGrowthChart(projection) {
  if (chartInstances.growth) chartInstances.growth.destroy();
  const canvas = document.getElementById('growthChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 320);
  gradient.addColorStop(0, 'rgba(168, 85, 247, 0.5)');
  gradient.addColorStop(1, 'rgba(168, 85, 247, 0)');

  chartInstances.growth = new Chart(ctx, {
    type: 'line',
    data: {
      labels: projection.months,
      datasets: [{
        label: 'Vendas',
        data: projection.sales,
        borderColor: '#C084FC',
        backgroundColor: gradient,
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#C084FC',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8
      }]
    },
    options: {
      ...baseChartOptions,
      scales: {
        x: {
          grid: { color: 'rgba(139, 92, 246, 0.08)' },
          ticks: { color: '#A89FB8' }
        },
        y: {
          grid: { color: 'rgba(139, 92, 246, 0.08)' },
          ticks: { color: '#A89FB8', beginAtZero: true }
        }
      },
      plugins: {
        ...baseChartOptions.plugins,
        legend: { display: false },
        tooltip: {
          ...baseChartOptions.plugins.tooltip,
          callbacks: {
            label: (ctx) => `${ctx.parsed.y} vendas · R$ ${projection.revenue[ctx.dataIndex].toLocaleString('pt-BR')}`
          }
        }
      }
    }
  });
}

export function renderContentChart(pilares) {
  if (chartInstances.content) chartInstances.content.destroy();
  const canvas = document.getElementById('contentChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  chartInstances.content = new Chart(ctx, {
    type: 'polarArea',
    data: {
      labels: Object.keys(pilares),
      datasets: [{
        data: Object.values(pilares),
        backgroundColor: [
          'rgba(192, 132, 252, 0.7)',
          'rgba(168, 85, 247, 0.7)',
          'rgba(139, 92, 246, 0.7)'
        ],
        borderColor: '#C084FC',
        borderWidth: 2
      }]
    },
    options: {
      ...baseChartOptions,
      scales: {
        r: {
          grid: { color: 'rgba(139, 92, 246, 0.15)' },
          angleLines: { color: 'rgba(139, 92, 246, 0.15)' },
          ticks: { color: '#A89FB8', backdropColor: 'transparent' },
          pointLabels: { color: '#E8E0FF' }
        }
      },
      plugins: {
        ...baseChartOptions.plugins,
        tooltip: {
          ...baseChartOptions.plugins.tooltip,
          callbacks: { label: (ctx) => `${ctx.parsed.r}% do conteúdo` }
        }
      }
    }
  });
}

export function renderAllCharts(plan) {
  renderBudgetChart(plan.campaigns);
  renderGrowthChart(plan.projection);
  renderContentChart(plan.content.pilares);
}

export function captureChartImages() {
  const ids = ['budgetChart', 'growthChart', 'contentChart'];
  const images = {};
  ids.forEach((id) => {
    const canvas = document.getElementById(id);
    if (canvas && canvas.tagName === 'CANVAS') {
      images[id.replace('Chart', '')] = canvas.toDataURL('image/png');
    }
  });
  return images;
}

export function destroyCharts() {
  Object.values(chartInstances).forEach((c) => c?.destroy?.());
  chartInstances = {};
}
