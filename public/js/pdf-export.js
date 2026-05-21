import { PDFDocument, rgb, StandardFonts } from 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/+esm';

const PURPLE = rgb(0.545, 0.361, 0.965);
const PURPLE_DARK = rgb(0.18, 0.08, 0.35);
const WHITE = rgb(1, 1, 1);
const GRAY = rgb(0.66, 0.62, 0.72);
const MARGIN = 50;
const PAGE_W = 595;
const PAGE_H = 842;

function wrapText(text, maxWidth, font, size) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  words.forEach((word) => {
    const test = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) > maxWidth) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = test;
    }
  });
  if (line) lines.push(line);
  return lines;
}

async function embedImage(pdfDoc, dataUrl) {
  if (!dataUrl) return null;
  const base64 = dataUrl.split(',')[1];
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return pdfDoc.embedPng(bytes);
}

function drawHeader(page, fontBold, title, y) {
  page.drawRectangle({ x: 0, y: y - 8, width: PAGE_W, height: 36, color: PURPLE_DARK });
  page.drawText(title, { x: MARGIN, y, size: 14, font: fontBold, color: WHITE });
  return y - 50;
}

function drawBullets(page, font, items, x, y, maxWidth) {
  items.forEach((item) => {
    const lines = wrapText(`• ${item}`, maxWidth, font, 10);
    lines.forEach((line) => {
      page.drawText(line, { x, y, size: 10, font, color: WHITE });
      y -= 14;
    });
    y -= 4;
  });
  return y;
}

export async function generateInteractivePDF(plan, shareUrl) {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`Plano de Growth — ${plan.inputs.productName}`);
  pdfDoc.setAuthor('Moove Growth Analyzer');
  pdfDoc.setSubject(plan.inputs.productDesc);

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const form = pdfDoc.getForm();

  const budgetImg = await embedImage(pdfDoc, plan.chartImages?.budget);
  const growthImg = await embedImage(pdfDoc, plan.chartImages?.growth);
  const contentImg = await embedImage(pdfDoc, plan.chartImages?.content);

  // Capa
  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: PURPLE_DARK });
  page.drawText('MOOVE', { x: MARGIN, y: PAGE_H - 80, size: 28, font: fontBold, color: PURPLE });
  page.drawText('Plano Estratégico de Growth', { x: MARGIN, y: PAGE_H - 110, size: 14, font, color: GRAY });
  page.drawText(plan.inputs.productName, {
    x: MARGIN,
    y: PAGE_H - 180,
    size: 22,
    font: fontBold,
    color: WHITE,
    maxWidth: PAGE_W - MARGIN * 2
  });

  let y = PAGE_H - 220;
  wrapText(plan.inputs.productDesc, PAGE_W - MARGIN * 2, font, 11).forEach((line) => {
    page.drawText(line, { x: MARGIN, y, size: 11, font, color: GRAY });
    y -= 16;
  });

  y -= 10;
  const budgetLabel = plan.meta?.budgetLabel || `R$ ${plan.meta.budget.toLocaleString('pt-BR')}/mês`;
  const tags = `${plan.meta.nichoLabel} · ${plan.meta.modeloLabel} · ${plan.meta.ticketLabel} · ${budgetLabel}`;
  page.drawText(tags, { x: MARGIN, y, size: 10, font, color: PURPLE });
  page.drawText(`Gerado em ${new Date(plan.createdAt || Date.now()).toLocaleDateString('pt-BR')}`, {
    x: MARGIN,
    y: y - 20,
    size: 9,
    font,
    color: GRAY
  });

  // Persona
  page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: rgb(0.04, 0.02, 0.08) });
  y = drawHeader(page, fontBold, '01 — Persona / ICP', PAGE_H - 60);
  page.drawText(`${plan.persona.name} — ${plan.persona.title}`, { x: MARGIN, y, size: 13, font: fontBold, color: WHITE });
  y -= 22;
  wrapText(plan.persona.bio, PAGE_W - MARGIN * 2, font, 10).forEach((line) => {
    page.drawText(line, { x: MARGIN, y, size: 10, font, color: GRAY });
    y -= 14;
  });
  y -= 10;
  page.drawText('Dores críticas', { x: MARGIN, y, size: 11, font: fontBold, color: PURPLE });
  y -= 16;
  y = drawBullets(page, font, plan.persona.dores.slice(0, 4), MARGIN, y, PAGE_W - MARGIN * 2);
  page.drawText('Desejos', { x: MARGIN, y, size: 11, font: fontBold, color: PURPLE });
  y -= 16;
  y = drawBullets(page, font, plan.persona.desejos.slice(0, 4), MARGIN, y, PAGE_W - MARGIN * 2);

  // Funil + Captação
  page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: rgb(0.04, 0.02, 0.08) });
  y = drawHeader(page, fontBold, '02 — Jornada & Captação', PAGE_H - 60);
  plan.funnel.forEach((stage) => {
    page.drawText(`${stage.icon} ${stage.title} (${stage.rate})`, { x: MARGIN, y, size: 10, font: fontBold, color: WHITE });
    y -= 14;
    wrapText(stage.desc, PAGE_W - MARGIN * 2, font, 9).forEach((line) => {
      page.drawText(line, { x: MARGIN + 10, y, size: 9, font, color: GRAY });
      y -= 12;
    });
    y -= 6;
  });
  y -= 8;
  page.drawText('Isca digital', { x: MARGIN, y, size: 11, font: fontBold, color: PURPLE });
  y -= 16;
  page.drawText(plan.captacao.iscaTitle, { x: MARGIN, y, size: 10, font: fontBold, color: WHITE });
  y -= 14;
  wrapText(plan.captacao.headline, PAGE_W - MARGIN * 2, font, 9).forEach((line) => {
    page.drawText(line, { x: MARGIN, y, size: 9, font, color: GRAY });
    y -= 12;
  });

  // Tráfego + gráficos
  page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: rgb(0.04, 0.02, 0.08) });
  y = drawHeader(page, fontBold, '03 — Tráfego Pago & KPIs', PAGE_H - 60);
  plan.kpis.forEach((k) => {
    page.drawText(`${k.label}: ${k.value} (${k.trend})`, { x: MARGIN, y, size: 10, font, color: WHITE });
    y -= 16;
  });
  y -= 10;
  if (budgetImg) {
    page.drawImage(budgetImg, { x: MARGIN, y: y - 140, width: 220, height: 140 });
  }
  if (growthImg) {
    page.drawImage(growthImg, { x: 300, y: y - 140, width: 220, height: 140 });
  }

  // Conteúdo orgânico
  page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: rgb(0.04, 0.02, 0.08) });
  y = drawHeader(page, fontBold, '04 — Conteúdo Orgânico', PAGE_H - 60);
  if (contentImg) {
    page.drawImage(contentImg, { x: MARGIN, y: y - 180, width: 240, height: 180 });
    y -= 200;
  }
  plan.content.examples.forEach((ex) => {
    page.drawText(`${ex.tipo}: ${ex.text}`, { x: MARGIN, y, size: 9, font, color: GRAY, maxWidth: PAGE_W - MARGIN * 2 });
    y -= 28;
  });

  // Anotações interativas
  page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: rgb(0.04, 0.02, 0.08) });
  y = drawHeader(page, fontBold, '05 — Anotações & Próximos Passos', PAGE_H - 60);
  page.drawText('Preencha durante a reunião com o cliente:', { x: MARGIN, y, size: 10, font, color: GRAY });
  y -= 30;

  const fields = [
    { name: 'proximos_passos', label: 'Próximos passos acordados' },
    { name: 'observacoes_moove', label: 'Observações Moove' },
    { name: 'budget_aprovado', label: 'Budget aprovado pelo cliente' },
    { name: 'prazo_execucao', label: 'Prazo de execução' }
  ];

  fields.forEach(({ name, label }) => {
    page.drawText(label, { x: MARGIN, y, size: 10, font: fontBold, color: PURPLE });
    y -= 14;
    const field = form.createTextField(name);
    field.addToPage(page, { x: MARGIN, y: y - 50, width: PAGE_W - MARGIN * 2, height: 50, borderColor: PURPLE, backgroundColor: rgb(0.08, 0.05, 0.15), textColor: WHITE });
    field.enableMultiline();
    field.setFontSize(10);
    y -= 70;
  });

  if (shareUrl) {
    page.drawText('Plano online:', { x: MARGIN, y: 80, size: 9, font, color: GRAY });
    page.drawText(shareUrl, { x: MARGIN, y: 64, size: 9, font: fontBold, color: PURPLE });
  }
  page.drawText('Moove — Growth Predictable', { x: MARGIN, y: 40, size: 9, font, color: GRAY });

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const slug = plan.inputs.productName.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 40);
  const filename = `plano-growth-${slug || 'moove'}.pdf`;

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
