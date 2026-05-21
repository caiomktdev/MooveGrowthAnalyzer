import { PDFDocument, rgb, StandardFonts } from 'https://esm.sh/pdf-lib@1.17.1';

const PURPLE = rgb(0.545, 0.361, 0.965);
const PURPLE_DARK = rgb(0.18, 0.08, 0.35);
const WHITE = rgb(1, 1, 1);
const GRAY = rgb(0.66, 0.62, 0.72);
const MARGIN = 50;
const PAGE_W = 595;
const PAGE_H = 842;

function sanitize(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function wrapText(text, maxWidth, font, size) {
  const safe = sanitize(text);
  if (!safe) return [''];
  const words = safe.split(' ');
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
  return lines.length ? lines : [''];
}

async function embedImage(pdfDoc, dataUrl) {
  if (!dataUrl || !dataUrl.startsWith('data:image')) return null;
  try {
    const base64 = dataUrl.split(',')[1];
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    return pdfDoc.embedPng(bytes);
  } catch {
    return null;
  }
}

function drawHeader(page, fontBold, title, y) {
  page.drawRectangle({ x: 0, y: y - 8, width: PAGE_W, height: 36, color: PURPLE_DARK });
  page.drawText(sanitize(title), { x: MARGIN, y, size: 14, font: fontBold, color: WHITE });
  return y - 50;
}

function drawLines(page, font, lines, x, y, size, color) {
  lines.forEach((line) => {
    page.drawText(line, { x, y, size, font, color });
    y -= size + 4;
  });
  return y;
}

function drawBullets(page, font, items, x, y, maxWidth) {
  items.forEach((item) => {
    y = drawLines(page, font, wrapText(`- ${item}`, maxWidth, font, 10), x, y, 10, WHITE);
    y -= 4;
  });
  return y;
}

export async function generateInteractivePDF(plan, shareUrl) {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`Plano de Growth — ${sanitize(plan.inputs.productName)}`);
  pdfDoc.setAuthor('Moove Growth Analyzer');
  pdfDoc.setSubject(sanitize(plan.inputs.productDesc));

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const form = pdfDoc.getForm();

  const budgetImg = await embedImage(pdfDoc, plan.chartImages?.budget);
  const growthImg = await embedImage(pdfDoc, plan.chartImages?.growth);
  const contentImg = await embedImage(pdfDoc, plan.chartImages?.content);

  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: PURPLE_DARK });
  page.drawText('MOOVE', { x: MARGIN, y: PAGE_H - 80, size: 28, font: fontBold, color: PURPLE });
  page.drawText('Plano Estrategico de Growth', { x: MARGIN, y: PAGE_H - 110, size: 14, font, color: GRAY });

  let y = PAGE_H - 180;
  y = drawLines(
    page,
    fontBold,
    wrapText(plan.inputs.productName, PAGE_W - MARGIN * 2, fontBold, 22),
    MARGIN,
    y,
    22,
    WHITE
  );

  y -= 8;
  y = drawLines(page, font, wrapText(plan.inputs.productDesc, PAGE_W - MARGIN * 2, font, 11), MARGIN, y, 11, GRAY);

  y -= 10;
  const budgetLabel = plan.meta?.budgetLabel || `R$ ${plan.meta.budget.toLocaleString('pt-BR')}/mes`;
  const tags = sanitize(`${plan.meta.nichoLabel} · ${plan.meta.modeloLabel} · ${plan.meta.ticketLabel} · ${budgetLabel}`);
  page.drawText(tags, { x: MARGIN, y, size: 10, font, color: PURPLE });
  page.drawText(`Gerado em ${new Date(plan.createdAt || Date.now()).toLocaleDateString('pt-BR')}`, {
    x: MARGIN,
    y: y - 20,
    size: 9,
    font,
    color: GRAY
  });

  page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: rgb(0.04, 0.02, 0.08) });
  y = drawHeader(page, fontBold, '01 — Persona / ICP', PAGE_H - 60);
  y = drawLines(
    page,
    fontBold,
    wrapText(`${plan.persona.name} — ${plan.persona.title}`, PAGE_W - MARGIN * 2, fontBold, 13),
    MARGIN,
    y,
    13,
    WHITE
  );
  y -= 6;
  y = drawLines(page, font, wrapText(plan.persona.bio, PAGE_W - MARGIN * 2, font, 10), MARGIN, y, 10, GRAY);
  y -= 10;
  page.drawText('Dores criticas', { x: MARGIN, y, size: 11, font: fontBold, color: PURPLE });
  y -= 16;
  y = drawBullets(page, font, plan.persona.dores.slice(0, 4), MARGIN, y, PAGE_W - MARGIN * 2);
  page.drawText('Desejos', { x: MARGIN, y, size: 11, font: fontBold, color: PURPLE });
  y -= 16;
  y = drawBullets(page, font, plan.persona.desejos.slice(0, 4), MARGIN, y, PAGE_W - MARGIN * 2);

  page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: rgb(0.04, 0.02, 0.08) });
  y = drawHeader(page, fontBold, '02 — Jornada & Captacao', PAGE_H - 60);
  plan.funnel.forEach((stage) => {
    page.drawText(sanitize(`${stage.icon} ${stage.title} (${stage.rate})`), { x: MARGIN, y, size: 10, font: fontBold, color: WHITE });
    y -= 14;
    y = drawLines(page, font, wrapText(stage.desc, PAGE_W - MARGIN * 2, font, 9), MARGIN + 10, y, 9, GRAY);
    y -= 6;
  });
  y -= 8;
  page.drawText('Isca digital', { x: MARGIN, y, size: 11, font: fontBold, color: PURPLE });
  y -= 16;
  y = drawLines(page, fontBold, wrapText(plan.captacao.iscaTitle, PAGE_W - MARGIN * 2, fontBold, 10), MARGIN, y, 10, WHITE);
  y -= 6;
  y = drawLines(page, font, wrapText(plan.captacao.headline, PAGE_W - MARGIN * 2, font, 9), MARGIN, y, 9, GRAY);

  page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: rgb(0.04, 0.02, 0.08) });
  y = drawHeader(page, fontBold, '03 — Trafego Pago & KPIs', PAGE_H - 60);
  plan.kpis.forEach((k) => {
    page.drawText(sanitize(`${k.label}: ${k.value} (${k.trend})`), { x: MARGIN, y, size: 10, font, color: WHITE });
    y -= 16;
  });
  y -= 10;
  if (budgetImg) page.drawImage(budgetImg, { x: MARGIN, y: y - 140, width: 220, height: 140 });
  if (growthImg) page.drawImage(growthImg, { x: 300, y: y - 140, width: 220, height: 140 });

  page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: rgb(0.04, 0.02, 0.08) });
  y = drawHeader(page, fontBold, '04 — Conteudo Organico', PAGE_H - 60);
  if (contentImg) {
    page.drawImage(contentImg, { x: MARGIN, y: y - 180, width: 240, height: 180 });
    y -= 200;
  }
  plan.content.examples.forEach((ex) => {
    y = drawLines(
      page,
      font,
      wrapText(`${ex.tipo}: ${ex.text}`, PAGE_W - MARGIN * 2, font, 9),
      MARGIN,
      y,
      9,
      GRAY
    );
    y -= 8;
  });

  page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: rgb(0.04, 0.02, 0.08) });
  y = drawHeader(page, fontBold, '05 — Anotacoes & Proximos Passos', PAGE_H - 60);
  page.drawText('Preencha durante a reuniao com o cliente:', { x: MARGIN, y, size: 10, font, color: GRAY });
  y -= 30;

  [
    { name: 'proximos_passos', label: 'Proximos passos acordados' },
    { name: 'observacoes_moove', label: 'Observacoes Moove' },
    { name: 'budget_aprovado', label: 'Budget aprovado pelo cliente' },
    { name: 'prazo_execucao', label: 'Prazo de execucao' }
  ].forEach(({ name, label }) => {
    page.drawText(label, { x: MARGIN, y, size: 10, font: fontBold, color: PURPLE });
    y -= 14;
    const field = form.createTextField(name);
    field.addToPage(page, {
      x: MARGIN,
      y: y - 50,
      width: PAGE_W - MARGIN * 2,
      height: 50,
      borderColor: PURPLE,
      backgroundColor: rgb(0.08, 0.05, 0.15),
      textColor: WHITE
    });
    field.enableMultiline();
    field.setFontSize(10);
    y -= 70;
  });

  if (shareUrl) {
    page.drawText('Plano online:', { x: MARGIN, y: 80, size: 9, font, color: GRAY });
    page.drawText(sanitize(shareUrl), { x: MARGIN, y: 64, size: 9, font: fontBold, color: PURPLE });
  }
  page.drawText('Moove — Growth Predictable', { x: MARGIN, y: 40, size: 9, font, color: GRAY });

  form.updateFieldAppearances(font);

  const pdfBytes = await pdfDoc.save();
  const slug = sanitize(plan.inputs.productName).replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 40);
  const filename = `plano-growth-${slug || 'moove'}.pdf`;

  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([pdfBytes], { type: 'application/pdf' }));
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
