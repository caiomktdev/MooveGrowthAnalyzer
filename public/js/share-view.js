import { renderPlanToDOM } from './engine.js';
import { renderAllCharts } from './charts.js';
import { generateInteractivePDF } from './pdf-export.js';
import { openMooveWhatsApp } from './moove-cta.js';

let currentPlan = null;
let shareUrl = '';

function getPlanId() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('id')) return params.get('id');
  const parts = window.location.pathname.split('/').filter(Boolean);
  const pIndex = parts.indexOf('p');
  if (pIndex >= 0 && parts[pIndex + 1]) return parts[pIndex + 1];
  return null;
}

function setMeta(plan) {
  const title = `${plan.inputs.productName} — Plano de Growth | Moove`;
  const desc = plan.inputs.productDesc.slice(0, 160);
  document.title = title;

  const setOg = (prop, content) => {
    let el = document.querySelector(`meta[property="${prop}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('property', prop);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  setOg('og:title', title);
  setOg('og:description', desc);
  setOg('og:type', 'website');
  setOg('og:url', window.location.href);
}

function showError(message) {
  document.getElementById('shareLoading').style.display = 'none';
  document.getElementById('shareContent').style.display = 'none';
  document.getElementById('shareError').style.display = 'block';
  document.getElementById('shareErrorMsg').textContent = message;
}

window.copyShareUrl = () => {
  navigator.clipboard.writeText(shareUrl || window.location.href);
  document.getElementById('shareToast').textContent = 'Link copiado!';
};

window.downloadPlanPdf = async () => {
  if (!currentPlan) return;
  try {
    await generateInteractivePDF(currentPlan, shareUrl || window.location.href);
  } catch (err) {
    alert(`Erro ao gerar PDF: ${err.message}`);
  }
};

window.contactMoove = () => {
  openMooveWhatsApp(shareUrl || window.location.href);
};

async function init() {
  document.getElementById('year').textContent = new Date().getFullYear();

  const id = getPlanId();
  if (!id) {
    showError('Link inválido — ID do plano não encontrado.');
    return;
  }

  try {
    const res = await fetch(`/api/plans/${id}`);
    if (!res.ok) {
      showError(res.status === 404 ? 'Plano não encontrado ou expirado.' : 'Erro ao carregar o plano.');
      return;
    }

    currentPlan = await res.json();
    shareUrl = window.location.href.split('?')[0];
    if (!shareUrl.endsWith(id)) {
      shareUrl = `${window.location.origin}/p/${id}`;
    }

    setMeta(currentPlan);

    document.getElementById('shareDate').textContent =
      new Date(currentPlan.createdAt).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });

    if (currentPlan.chartImages) {
      renderPlanToDOM(currentPlan, { useChartImages: true });
    } else {
      renderPlanToDOM(currentPlan);
      renderAllCharts(currentPlan);
    }

    document.getElementById('shareLoading').style.display = 'none';
    document.getElementById('shareContent').style.display = 'block';
  } catch (err) {
    console.error('share-view init failed:', err);
    showError('Erro ao carregar o plano. Tente novamente em instantes.');
  }
}

init();
