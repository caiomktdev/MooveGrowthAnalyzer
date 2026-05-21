const WHATSAPP_NUMBER = '5532987168571';

export function buildWhatsAppUrl(planLink) {
  const link = planLink || window.location.href;
  const message = `Olá, vim pelo Analyzer e gostaria de prosseguir com esse planejamento\n\n${link}`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function openMooveWhatsApp(planLink) {
  window.open(buildWhatsAppUrl(planLink), '_blank', 'noopener,noreferrer');
}
