import {
  buildPlanSnapshot,
  renderPlanToDOM
} from './engine.js';
import {
  renderAllCharts,
  captureChartImages,
  destroyCharts
} from './charts.js';
import { generateInteractivePDF } from './pdf-export.js';
import { openMooveWhatsApp } from './moove-cta.js';

const state = {
  currentStep: 1,
  totalSteps: 5,
  data: {
    productName: '',
    productDesc: '',
    nicho: '',
    modelo: '',
    ticket: '',
    budget: '',
    budgetLabel: ''
  }
};

let currentPlan = null;
let shareUrl = '';

document.getElementById('year').textContent = new Date().getFullYear();

window.startAnalysis = startAnalysis;
window.nextStep = nextStep;
window.prevStep = prevStep;
window.resetApp = resetApp;
window.copyShareUrl = copyShareUrl;
window.openSharePage = openSharePage;
window.downloadPlanPdf = downloadPlanPdf;
window.contactMoove = contactMoove;

function startAnalysis() {
  document.getElementById('hero').style.display = 'none';
  document.getElementById('analyzer').classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateProgress() {
  document.querySelectorAll('.progress-step').forEach((step, i) => {
    const num = i + 1;
    step.classList.remove('active', 'completed');
    if (num < state.currentStep) step.classList.add('completed');
    else if (num === state.currentStep) step.classList.add('active');
  });

  document.querySelectorAll('.form-step').forEach((s) => s.classList.remove('active'));
  document.querySelector(`.form-step[data-step="${state.currentStep}"]`)?.classList.add('active');

  document.getElementById('prevBtn').style.visibility = state.currentStep === 1 ? 'hidden' : 'visible';
  document.getElementById('nextBtn').querySelector('span').textContent =
    state.currentStep === state.totalSteps ? 'Gerar análise →' : 'Próximo →';
}

function validateStep() {
  if (state.currentStep === 1) {
    const name = document.getElementById('productName').value.trim();
    const desc = document.getElementById('productDesc').value.trim();
    if (!name || !desc) {
      alert('Preencha o nome e a descrição do produto.');
      return false;
    }
    state.data.productName = name;
    state.data.productDesc = desc;
    return true;
  }
  if (state.currentStep === 2 && !state.data.nicho) {
    alert('Selecione um nicho.');
    return false;
  }
  if (state.currentStep === 3 && !state.data.modelo) {
    alert('Selecione um modelo de comercialização.');
    return false;
  }
  if (state.currentStep === 4 && !state.data.ticket) {
    alert('Selecione uma faixa de preço.');
    return false;
  }
  if (state.currentStep === 5 && !state.data.budget) {
    alert('Selecione um orçamento.');
    return false;
  }
  return true;
}

function nextStep() {
  if (!validateStep()) return;
  if (state.currentStep === state.totalSteps) {
    runAnalysis();
    return;
  }
  state.currentStep++;
  updateProgress();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function prevStep() {
  if (state.currentStep > 1) {
    state.currentStep--;
    updateProgress();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function bindOptionGrids() {
  [
    { gridId: 'nichoGrid', field: 'nicho' },
    { gridId: 'modeloGrid', field: 'modelo' },
    { gridId: 'ticketGrid', field: 'ticket' },
    { gridId: 'budgetGrid', field: 'budget' }
  ].forEach(({ gridId, field }) => {
    document.getElementById(gridId)?.addEventListener('click', (e) => {
      const card = e.target.closest('.option-card');
      if (!card) return;
      document.querySelectorAll(`#${gridId} .option-card`).forEach((c) => c.classList.remove('selected'));
      card.classList.add('selected');
      state.data[field] = card.dataset.value;
      if (field === 'budget') {
        state.data.budgetLabel = card.querySelector('.option-title')?.textContent?.trim() || '';
      }
    });
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runAnalysis() {
  document.getElementById('analyzer').classList.remove('active');
  const loader = document.getElementById('loadingScreen');
  loader.classList.add('active');

  const statusEl = document.getElementById('loadingStatus');
  const statuses = [
    'Mapeando público-alvo e dores...',
    'Construindo persona detalhada...',
    'Desenhando funil de jornada...',
    'Calculando distribuição de tráfego...',
    'Publicando plano compartilhável...'
  ];

  for (let i = 0; i < 5; i++) {
    statusEl.textContent = statuses[i];
    await sleep(i === 4 ? 300 : 700);
    const step = document.querySelector(`.loading-step-item[data-step="${i + 1}"]`);
    step?.classList.add('done');
    const check = step?.querySelector('.check');
    if (check) check.textContent = '✓';
  }

  await generateResults();
  loader.classList.remove('active');
}

async function generateResults() {
  const plan = buildPlanSnapshot(state.data);
  renderPlanToDOM(plan);
  renderAllCharts(plan);

  await sleep(100);
  plan.chartImages = captureChartImages();
  currentPlan = plan;

  document.getElementById('results').classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  await publishPlan(plan);
}

async function publishPlan(plan) {
  const panel = document.getElementById('sharePanel');
  const status = document.getElementById('shareStatus');
  panel.style.display = 'block';
  status.textContent = 'Publicando plano...';
  status.className = 'share-status loading';

  try {
    const res = await fetch('/api/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plan)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Erro ${res.status}`);
    }

    const data = await res.json();
    shareUrl = data.url;
    currentPlan.id = data.id;
    currentPlan.createdAt = new Date().toISOString();

    document.getElementById('shareUrl').value = shareUrl;
    status.textContent = 'Plano publicado! Compartilhe o link com seu cliente.';
    status.className = 'share-status success';
  } catch (err) {
    status.textContent = `Não foi possível publicar: ${err.message}. Você ainda pode baixar o PDF localmente.`;
    status.className = 'share-status error';
    shareUrl = '';
  }
}

function copyShareUrl() {
  const input = document.getElementById('shareUrl');
  if (!input.value) return;
  input.select();
  navigator.clipboard.writeText(input.value).then(() => {
    const status = document.getElementById('shareStatus');
    status.textContent = 'Link copiado!';
    status.className = 'share-status success';
  });
}

function openSharePage() {
  if (shareUrl) window.open(shareUrl, '_blank');
}

async function downloadPlanPdf() {
  if (!currentPlan) return;
  try {
    await generateInteractivePDF(currentPlan, shareUrl);
  } catch (err) {
    alert(`Erro ao gerar PDF: ${err.message}`);
  }
}

function contactMoove() {
  const link = shareUrl || document.getElementById('shareUrl')?.value?.trim() || window.location.href;
  openMooveWhatsApp(link);
}

function resetApp() {
  state.currentStep = 1;
  state.data = { productName: '', productDesc: '', nicho: '', modelo: '', ticket: '', budget: '', budgetLabel: '' };
  currentPlan = null;
  shareUrl = '';

  document.getElementById('productName').value = '';
  document.getElementById('productDesc').value = '';
  document.querySelectorAll('.option-card').forEach((c) => c.classList.remove('selected'));
  document.querySelectorAll('.loading-step-item').forEach((s) => {
    s.classList.remove('done');
    const check = s.querySelector('.check');
    if (check) check.textContent = '○';
  });

  document.getElementById('sharePanel').style.display = 'none';
  document.getElementById('shareUrl').value = '';
  document.getElementById('shareStatus').textContent = '';

  destroyCharts();
  updateProgress();
  document.getElementById('hero').style.display = 'flex';
  document.getElementById('analyzer').classList.remove('active');
  document.getElementById('results').classList.remove('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

bindOptionGrids();
updateProgress();
