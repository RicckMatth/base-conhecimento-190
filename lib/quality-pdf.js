import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { QUALITY_BLOCKS, QUALITY_CRITICAL, QUALITY_POINTS, qualityScore, qualityClass } from './quality-core.js';

// Utilitário para sanitizar caracteres fora da faixa Latin-1 (WinAnsi)
function cleanText(text, max = 250) {
  if (!text) return '';
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacríticos problemáticos se necessário ou mantém caracteres básicos
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ')
    .trim()
    .slice(0, max);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }
  const parts = String(dateStr).split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
}

function formatDuration(seconds) {
  const s = parseInt(seconds, 10) || 0;
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
}

const toPdfX = x => x * 0.75;
const toPdfY = y => 841.889764 - y * 0.75;

/**
 * Preenche a Ficha de Monitoria de Qualidade (Ficha_Monitoria_Qualidade_190-1.pdf)
 */
export async function generateMonitoriaPdf(monitorData, supervisor = {}, attendant = {}) {
  const templatePath = path.resolve(process.cwd(), 'Ficha_Monitoria_Qualidade_190-1.pdf');
  const templateBytes = fs.readFileSync(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pages = pdfDoc.getPages();
  const page1 = pages[0];
  const page2 = pages[1];

  const primaryColor = rgb(0.06, 0.15, 0.35); // Azul marinho institucional
  const checkColor = rgb(0.05, 0.45, 0.4); // Verde petróleo COPOM
  const criticalCheckColor = rgb(0.85, 0.15, 0.15); // Vermelho de alerta
  const textColor = rgb(0.1, 0.15, 0.2);

  const ratings = monitorData.ratings || {};
  const critical = Array.isArray(monitorData.critical) ? monitorData.critical : [];
  const scoreInfo = qualityScore(ratings, critical, { complete: false });

  // -------------------------------------------------------------
  // PÁGINA 1: CABEÇALHO E 4 BLOCOS DE AVALIAÇÃO
  // -------------------------------------------------------------

  // Analista / Operador Avaliado
  const opName = monitorData.operator_name || attendant.name || monitorData.atendente || 'Operador 190';
  page1.drawText(cleanText(opName, 45), {
    x: toPdfX(61.9),
    y: toPdfY(143),
    size: 9,
    font: fontBold,
    color: primaryColor
  });

  // Matrícula / ID
  const opMatricula = monitorData.operator_username || attendant.username || monitorData.matricula || 'COPOM-190';
  page1.drawText(cleanText(opMatricula, 20), {
    x: toPdfX(419.1),
    y: toPdfY(143),
    size: 9,
    font: fontBold,
    color: primaryColor
  });

  // Data
  const auditDate = formatDate(monitorData.audit_day || monitorData.dataChamada || new Date());
  page1.drawText(auditDate, {
    x: toPdfX(612.3),
    y: toPdfY(138.7),
    size: 8.5,
    font: fontBold,
    color: primaryColor
  });

  // Supervisor / Auditor
  const supName = monitorData.auditor_name || supervisor.name || monitorData.monitor || 'Supervisor de Qualidade';
  page1.drawText(cleanText(supName, 45), {
    x: toPdfX(61.9),
    y: toPdfY(184),
    size: 9,
    font: fontBold,
    color: primaryColor
  });

  // Protocolo / Nº CAD
  const protocol = monitorData.protocol_cad || monitorData.chamado || 'CAD-190';
  page1.drawText(cleanText(protocol, 25), {
    x: toPdfX(419.1),
    y: toPdfY(184),
    size: 9,
    font: fontBold,
    color: primaryColor
  });

  // Duração
  const durationText = formatDuration(monitorData.duration_seconds || monitorData.durationSeconds || 0);
  page1.drawText(durationText, {
    x: toPdfX(633.2),
    y: toPdfY(179.7),
    size: 8.5,
    font: fontBold,
    color: primaryColor
  });

  // Turno / Período
  const shift = monitorData.shift_period || monitorData.shiftPeriod || 'weekday';
  if (shift === 'weekday' || shift === 'util') {
    page1.drawText('X', { x: toPdfX(148.6) + 2, y: toPdfY(220.6) - 1, size: 9, font: fontBold, color: checkColor });
  } else {
    page1.drawText('X', { x: toPdfX(226) + 2, y: toPdfY(220.6) - 1, size: 9, font: fontBold, color: checkColor });
  }

  // Tipo de Auditoria
  const auditType = monitorData.audit_type || monitorData.auditType || 'audio';
  if (auditType === 'audio') {
    page1.drawText('X', { x: toPdfX(515.7) + 2, y: toPdfY(213.1) - 1, size: 9, font: fontBold, color: checkColor });
  } else {
    page1.drawText('X', { x: toPdfX(630) + 2, y: toPdfY(213.1) - 1, size: 9, font: fontBold, color: checkColor });
  }

  // Mapeamento das linhas dos 12 critérios na Página 1
  const criteriaRows = {
    '1.1': { y: 362.7, max: 5 },
    '1.2': { y: 410.6, max: 5 },
    '2.1': { y: 482.0, max: 15 },
    '2.2': { y: 529.4, max: 8 },
    '2.3': { y: 569.3, max: 7 },
    '2.4': { y: 616.7, max: 10 },
    '2.5': { y: 664.1, max: 5 },
    '3.1': { y: 733.9, max: 9 },
    '3.2': { y: 788.8, max: 9 },
    '3.3': { y: 860.2, max: 7 },
    '4.1': { y: 939.0, max: 12 },
    '4.2': { y: 986.4, max: 8 }
  };

  const colSimX = toPdfX(632.5) + 2;
  const colNaoX = toPdfX(673.7) + 2;
  const colNaX = toPdfX(715.0) + 2;
  const colPtsX = toPdfX(587.1) + 4;

  for (const [id, def] of Object.entries(criteriaRows)) {
    const val = ratings[id];
    const rowY = toPdfY(def.y);
    let ptsEarned = 0;

    if (val === 'yes') {
      page1.drawText('X', { x: colSimX, y: rowY, size: 10, font: fontBold, color: checkColor });
      ptsEarned = def.max;
    } else if (val === 'no') {
      page1.drawText('X', { x: colNaoX, y: rowY, size: 10, font: fontBold, color: rgb(0.8, 0.2, 0.2) });
      ptsEarned = 0;
    } else if (val === 'na') {
      page1.drawText('X', { x: colNaX, y: rowY, size: 10, font: fontBold, color: rgb(0.4, 0.5, 0.6) });
    }

    // Se preenchido, escreve a pontuação obtida
    if (val) {
      const earnedText = val === 'na' ? 'N/A' : String(ptsEarned);
      page1.drawText(earnedText, {
        x: colPtsX,
        y: rowY,
        size: 8.5,
        font: fontBold,
        color: val === 'no' ? rgb(0.8, 0.2, 0.2) : textColor
      });
    }
  }

  // -------------------------------------------------------------
  // PÁGINA 2: PENALIDADES CRÍTICAS, PDCA E ASSINATURAS
  // -------------------------------------------------------------

  // 2. Penalidades Críticas – Tolerância Zero
  const criticalMap = {
    geo: { x: toPdfX(68.4) + 2, y: toPdfY(85.9) },
    vital: { x: toPdfX(68.4) + 2, y: toPdfY(119.8) },
    priority: { x: toPdfX(68.4) + 2, y: toPdfY(153.6) },
    rudeness: { x: toPdfX(400.9) + 2, y: toPdfY(85.9) },
    disconnect: { x: toPdfX(400.9) + 2, y: toPdfY(119.8) },
    refusal: { x: toPdfX(400.9) + 2, y: toPdfY(153.6) }
  };

  for (const critId of critical) {
    const pos = criticalMap[critId];
    if (pos) {
      page2.drawText('X', {
        x: pos.x,
        y: pos.y,
        size: 11,
        font: fontBold,
        color: criticalCheckColor
      });
    }
  }

  // 3. Resultado Final e Classificação
  const finalScore = scoreInfo.score ?? monitorData.score ?? monitorData.notaFinal ?? 0;
  const finalScoreStr = `${finalScore} / 100 pts`;
  page2.drawText(finalScoreStr, {
    x: toPdfX(61.9) + 2,
    y: toPdfY(269.9),
    size: 14,
    font: fontBold,
    color: finalScore >= 90 ? checkColor : finalScore >= 75 ? primaryColor : rgb(0.8, 0.15, 0.15)
  });

  // Classificação Checkbox
  if (finalScore >= 90) {
    page2.drawText('X', { x: toPdfX(295.5) + 2, y: toPdfY(258.5), size: 10, font: fontBold, color: checkColor });
  } else if (finalScore >= 75) {
    page2.drawText('X', { x: toPdfX(295.5) + 2, y: toPdfY(273.5), size: 10, font: fontBold, color: primaryColor });
  } else {
    page2.drawText('X', { x: toPdfX(295.5) + 2, y: toPdfY(288.5), size: 10, font: fontBold, color: criticalCheckColor });
  }

  // Providência Gerencial Checkbox
  const mgmt = monitorData.management_action || monitorData.managementAction || (finalScore >= 90 ? 'praise' : finalScore >= 75 ? 'feedback' : 'training');
  if (mgmt === 'praise') {
    page2.drawText('X', { x: toPdfX(522.1) + 2, y: toPdfY(258.5), size: 10, font: fontBold, color: checkColor });
  } else if (mgmt === 'feedback') {
    page2.drawText('X', { x: toPdfX(522.1) + 2, y: toPdfY(273.5), size: 10, font: fontBold, color: primaryColor });
  } else if (mgmt === 'training') {
    page2.drawText('X', { x: toPdfX(522.1) + 2, y: toPdfY(288.5), size: 10, font: fontBold, color: criticalCheckColor });
  }

  // Campos de Texto PDCA
  const strengths = cleanText(monitorData.strengths || monitorData.observacoes || 'Bom alinhamento operacional e postura respeitosa.', 180);
  page2.drawText(strengths, {
    x: toPdfX(61.9),
    y: toPdfY(360),
    size: 8.5,
    font: font,
    color: textColor
  });

  const improvements = cleanText(monitorData.improvements || 'Revisar confirmação de ponto de referência e agilidade no despacho.', 180);
  page2.drawText(improvements, {
    x: toPdfX(61.9),
    y: toPdfY(400),
    size: 8.5,
    font: font,
    color: textColor
  });

  const corrective = cleanText(monitorData.corrective_action || monitorData.correctiveAction || 'Acompanhamento de escuta conjunta e validação de procedimentos com a supervisão.', 180);
  page2.drawText(corrective, {
    x: toPdfX(61.9),
    y: toPdfY(440),
    size: 8.5,
    font: font,
    color: textColor
  });

  // -------------------------------------------------------------
  // ASSINATURAS DIGITAIS INTEGRADAS
  // -------------------------------------------------------------

  // Assinatura do Supervisor / Auditor
  const auditorSignName = monitorData.auditor_signature || monitorData.auditorName || supName;
  page2.drawText(cleanText(auditorSignName, 40), {
    x: toPdfX(93.9),
    y: toPdfY(485),
    size: 9,
    font: fontBold,
    color: primaryColor
  });
  page2.drawText('Auditor de Qualidade - Assinado via Base 190', {
    x: toPdfX(93.9),
    y: toPdfY(495),
    size: 7,
    font: font,
    color: rgb(0.3, 0.4, 0.5)
  });

  // Assinatura / Ciência do Operador Auditado
  const isAcknowledged = Boolean(monitorData.acknowledged_at || monitorData.cienciaEm);
  const opSignName = monitorData.operator_signature_name || (isAcknowledged ? opName : '');

  if (isAcknowledged && opSignName) {
    // Se houver imagem da assinatura desenhada em canvas (base64 PNG)
    const signImgBase64 = monitorData.operator_signature_image || monitorData.signatureImage;
    if (signImgBase64 && typeof signImgBase64 === 'string' && signImgBase64.startsWith('data:image/png;base64,')) {
      try {
        const rawBase64 = signImgBase64.replace(/^data:image\/png;base64,/, '');
        const imgBytes = Buffer.from(rawBase64, 'base64');
        const embeddedImg = await pdfDoc.embedPng(imgBytes);
        page2.drawImage(embeddedImg, {
          x: toPdfX(428.6) + 10,
          y: toPdfY(490) + 12,
          width: 110,
          height: 28
        });
      } catch (err) {
        console.warn('Erro ao embutir imagem da assinatura:', err);
      }
    }

    // Nome digitado autenticado
    page2.drawText(cleanText(opSignName, 35), {
      x: toPdfX(428.6),
      y: toPdfY(485),
      size: 9,
      font: fontBold,
      color: primaryColor
    });

    // Carimbo de certificação digital
    const ackDateStr = formatDate(monitorData.acknowledged_at || monitorData.cienciaEm || new Date());
    page2.drawText(`Ciência confirmada eletronicamente em ${ackDateStr}`, {
      x: toPdfX(428.6),
      y: toPdfY(495),
      size: 7,
      font: font,
      color: checkColor
    });

    // Data no campo específico
    page2.drawText(ackDateStr, {
      x: toPdfX(620),
      y: toPdfY(503.9),
      size: 8,
      font: fontBold,
      color: primaryColor
    });
  }

  return await pdfDoc.save();
}

/**
 * Preenche a Ficha de Acompanhamento Mensal do Operador (Ficha_Acompanhamento_Operador_190-1.pdf)
 */
export async function generateAcompanhamentoPdf(followupData, monitorsList = [], supervisor = {}, attendant = {}) {
  const templatePath = path.resolve(process.cwd(), 'Ficha_Acompanhamento_Operador_190-1.pdf');
  const templateBytes = fs.readFileSync(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pages = pdfDoc.getPages();
  const page = pages[0];

  const primaryColor = rgb(0.06, 0.15, 0.35);
  const checkColor = rgb(0.05, 0.45, 0.4);
  const textColor = rgb(0.1, 0.15, 0.2);

  // Operador Avaliado
  const opName = followupData.operator_name || attendant.name || followupData.atendente || 'Operador 190';
  page.drawText(cleanText(opName, 40), {
    x: toPdfX(70.5),
    y: toPdfY(170),
    size: 9,
    font: fontBold,
    color: primaryColor
  });

  // Matrícula / ID
  const opMatricula = followupData.operator_username || attendant.username || followupData.matricula || 'COPOM-190';
  page.drawText(cleanText(opMatricula, 18), {
    x: toPdfX(392.9),
    y: toPdfY(170),
    size: 9,
    font: fontBold,
    color: primaryColor
  });

  // Período / Mês
  const periodMonth = followupData.period || followupData.month || new Date().toISOString().slice(0, 7);
  page.drawText(cleanText(periodMonth, 12), {
    x: toPdfX(636.2),
    y: toPdfY(164.8),
    size: 9,
    font: fontBold,
    color: primaryColor
  });

  // Supervisor / Auditor
  const supName = followupData.auditor_name || supervisor.name || followupData.monitor || 'Supervisor de Qualidade';
  page.drawText(cleanText(supName, 40), {
    x: toPdfX(70.5),
    y: toPdfY(216),
    size: 9,
    font: fontBold,
    color: primaryColor
  });

  // Turno / Equipe
  const shiftTeam = cleanText(followupData.shift_team || followupData.shiftTeam || 'Geral / 24h', 15);
  page.drawText(shiftTeam, {
    x: toPdfX(392.9),
    y: toPdfY(216),
    size: 9,
    font: fontBold,
    color: primaryColor
  });

  // Qtd. Auditorias
  const snap = followupData.snapshot || {};
  const totalAudits = snap.summary?.count ?? monitorsList.length ?? 0;
  page.drawText(String(totalAudits), {
    x: toPdfX(644.4),
    y: toPdfY(210.9),
    size: 9,
    font: fontBold,
    color: primaryColor
  });

  // 1. Indicadores Consolidados
  const avgScore = snap.summary?.average ?? (totalAudits ? Math.round(monitorsList.reduce((acc, m) => acc + (m.score || m.notaFinal || 0), 0) / totalAudits) : 0);
  page.drawText(`${avgScore} / 100 pts`, {
    x: toPdfX(273.1),
    y: toPdfY(291.9),
    size: 11,
    font: fontBold,
    color: avgScore >= 90 ? checkColor : primaryColor
  });

  const tmaSecs = snap.summary?.tmaSeconds ?? 360;
  page.drawText(formatDuration(tmaSecs), {
    x: toPdfX(536.1),
    y: toPdfY(291.9),
    size: 9,
    font: fontBold,
    color: textColor
  });

  // Classificação Atual
  if (avgScore >= 90) {
    page.drawText('X', { x: toPdfX(230.4) + 2, y: toPdfY(324.2), size: 10, font: fontBold, color: checkColor });
  } else if (avgScore >= 75) {
    page.drawText('X', { x: toPdfX(360) + 2, y: toPdfY(324.2), size: 10, font: fontBold, color: primaryColor });
  } else {
    page.drawText('X', { x: toPdfX(480) + 2, y: toPdfY(324.2), size: 10, font: fontBold, color: rgb(0.8, 0.15, 0.15) });
  }

  // Tolerância Zero
  const zeroCount = snap.summary?.criticalCount ?? monitorsList.filter(m => Array.isArray(m.critical) && m.critical.length > 0).length;
  if (zeroCount === 0) {
    page.drawText('X', { x: toPdfX(303.8) + 2, y: toPdfY(372.2), size: 10, font: fontBold, color: checkColor });
  } else {
    page.drawText('X', { x: toPdfX(380) + 2, y: toPdfY(372.2), size: 10, font: fontBold, color: rgb(0.8, 0.15, 0.15) });
  }

  // 3. Histórico das Auditorias Realizadas no Período
  const auditList = snap.history || monitorsList;
  const tableRowsY = [720.9, 751.9, 782.9, 813.9];

  for (let i = 0; i < Math.min(4, auditList.length); i++) {
    const item = auditList[i];
    const rowY = toPdfY(tableRowsY[i]);
    const dt = formatDate(item.audit_day || item.dataChamada);
    const cad = cleanText(item.protocol_cad || item.chamado || 'CAD-190', 16);
    const dur = formatDuration(item.duration_seconds || item.durationSeconds || 0);
    const sc = `${item.score ?? item.notaFinal ?? 0} / 100`;
    const obs = cleanText(item.improvements || item.strengths || item.observacoes || 'Procedimentos adequados', 30);

    page.drawText(dt, { x: toPdfX(73.0), y: rowY, size: 8, font: font, color: textColor });
    page.drawText(cad, { x: toPdfX(160), y: rowY, size: 8, font: fontBold, color: textColor });
    page.drawText(dur, { x: toPdfX(294.2), y: rowY, size: 8, font: font, color: textColor });
    page.drawText(sc, { x: toPdfX(389.2), y: rowY, size: 8, font: fontBold, color: textColor });
    page.drawText(obs, { x: toPdfX(475), y: rowY, size: 8, font: font, color: textColor });
  }

  // 4. Feedback, Plano de Ação (PDCA) e Providência Gerencial
  const strengths = cleanText(followupData.strengths || 'Postura ética, empatia no atendimento e aderência aos fluxos operacionais.', 160);
  page.drawText(strengths, { x: toPdfX(72.5), y: toPdfY(896), size: 8.5, font: font, color: textColor });

  const gaps = cleanText(followupData.recurring_gaps || followupData.recurringGaps || 'Consistência na confirmação imediata do ponto de referência no SADE.', 160);
  page.drawText(gaps, { x: toPdfX(72.5), y: toPdfY(935), size: 8.5, font: font, color: textColor });

  // Providência Gerencial Checkboxes
  const mgmt = followupData.management_action || followupData.managementAction || 'praise';
  if (mgmt === 'praise') {
    page.drawText('X', { x: toPdfX(202.5) + 2, y: toPdfY(959.6), size: 10, font: fontBold, color: checkColor });
  } else if (mgmt === 'feedback') {
    page.drawText('X', { x: toPdfX(320) + 2, y: toPdfY(959.6), size: 10, font: fontBold, color: primaryColor });
  } else if (mgmt === 'training') {
    page.drawText('X', { x: toPdfX(450) + 2, y: toPdfY(959.6), size: 10, font: fontBold, color: rgb(0.8, 0.15, 0.15) });
  }

  // Assinaturas
  page.drawText(cleanText(supName, 35), {
    x: toPdfX(88.9),
    y: toPdfY(1020),
    size: 9,
    font: fontBold,
    color: primaryColor
  });

  const isAck = Boolean(followupData.acknowledged_at || followupData.cienciaEm);
  if (isAck) {
    const signImgBase64 = followupData.operator_signature_image || followupData.signatureImage;
    if (signImgBase64 && typeof signImgBase64 === 'string' && signImgBase64.startsWith('data:image/png;base64,')) {
      try {
        const rawBase64 = signImgBase64.replace(/^data:image\/png;base64,/, '');
        const imgBytes = Buffer.from(rawBase64, 'base64');
        const embeddedImg = await pdfDoc.embedPng(imgBytes);
        page.drawImage(embeddedImg, {
          x: toPdfX(424.2) + 10,
          y: toPdfY(1020) + 12,
          width: 100,
          height: 25
        });
      } catch (err) {
        console.warn('Erro ao embutir imagem da assinatura:', err);
      }
    }

    page.drawText(cleanText(opName, 35), {
      x: toPdfX(424.2),
      y: toPdfY(1020),
      size: 9,
      font: fontBold,
      color: primaryColor
    });

    const ackDate = formatDate(followupData.acknowledged_at || followupData.cienciaEm || new Date());
    page.drawText(ackDate, {
      x: toPdfX(565),
      y: toPdfY(1043.0),
      size: 8,
      font: fontBold,
      color: primaryColor
    });
  }

  return await pdfDoc.save();
}

