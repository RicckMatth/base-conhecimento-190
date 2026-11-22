'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  QUALITY_BLOCKS,
  QUALITY_CRITICAL,
  QUALITY_MANAGEMENT,
  QUALITY_ACKNOWLEDGE,
  qualityScore,
  qualityClass,
  canAuditQuality
} from '../lib/quality-core.js';

const STORAGE_KEY = 'copom_190_monitorias_v7';

function formatDecimalScore(score) {
  if (score === null || score === undefined || isNaN(score)) return '0,0';
  return (score / 10).toFixed(1).replace('.', ',');
}

function formatDateTimeBR(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoString;
  }
}

function formatDateBR(dateStr) {
  if (!dateStr) return '—';
  const parts = String(dateStr).split('T')[0].split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function getCurrentDateInput() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
}

function getCurrentLocalDateTimeInput() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function formatDurationDisplay(totalSeconds) {
  const s = parseInt(totalSeconds, 10) || 0;
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}m ${String(secs).padStart(2, '0')}s`;
}

export default function Quality({ user, activeProfile = null, dark = false, toggleTheme = null, onStateChange = null }) {
  const isSupervisor = useMemo(() => {
    if (activeProfile) {
      return ['dev', 'coordinator', 'manager', 'quality_analyst'].includes(activeProfile);
    }
    return user?.role === 'admin' || ['manager', 'coordinator', 'dev', 'quality_analyst'].includes(user?.operationalRole);
  }, [user, activeProfile]);

  // Identificação do atendente conectado
  const attendantSelfName = useMemo(() => {
    const rawName = (user?.name || '').trim();
    const rawUser = (user?.username || '').trim();
    return rawName || rawUser || 'Atendente';
  }, [user]);

  const [currentRole, setCurrentRole] = useState(isSupervisor ? 'monitor' : 'atendente');
  const [currentView, setCurrentView] = useState(isSupervisor ? 'cadastro' : 'monitorias');
  const [selectedAttendant, setSelectedAttendant] = useState(isSupervisor ? 'ALL' : attendantSelfName);

  useEffect(() => {
    if (activeProfile === 'attendant' || !isSupervisor) {
      setCurrentRole('atendente');
      setCurrentView('monitorias');
      setSelectedAttendant(attendantSelfName);
    } else if (isSupervisor) {
      setCurrentRole('monitor');
      if (currentView === 'monitorias') {
        setCurrentView('cadastro');
      }
    }
  }, [activeProfile, isSupervisor, attendantSelfName]);

  const [monitorias, setMonitorias] = useState([]);
  const [registeredAttendants, setRegisteredAttendants] = useState([]);

  // Filtros
  const [activeStatusFilter, setActiveStatusFilter] = useState(null); // Aba 2
  const [publicStatusFilter, setPublicStatusFilter] = useState('ALL'); // Aba 3
  const [searchFeedback, setSearchFeedback] = useState('');
  const [searchPublic, setSearchPublic] = useState('');

  // Modais
  const [activeModalId, setActiveModalId] = useState(null); // Modal de Gerenciamento (Monitor)
  const [activeResultModalId, setActiveResultModalId] = useState(null); // Modal de Ver Resultado & Assinar
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  // =========================================================================
  // ESTADO DO FORMULÁRIO DE CADASTRAMENTO (Baseado nas Fichas Oficiais)
  // =========================================================================
  const [formChamado, setFormChamado] = useState('');
  const [formDataChamada, setFormDataChamada] = useState(getCurrentDateInput());
  const [formDurationMinutes, setFormDurationMinutes] = useState(4);
  const [formDurationSeconds, setFormDurationSeconds] = useState(20);
  const [formTurno, setFormTurno] = useState('weekday'); // weekday | weekend
  const [formTipoAuditoria, setFormTipoAuditoria] = useState('audio'); // audio | live
  const [formMonitor, setFormMonitor] = useState(user?.name || user?.username || 'Supervisor de Qualidade');
  const [formSelectedAttendantKey, setFormSelectedAttendantKey] = useState('');
  const [formAtendente, setFormAtendente] = useState('');
  const [formMatricula, setFormMatricula] = useState('');
  const [formEmailAtendente, setFormEmailAtendente] = useState('');

  // 12 Critérios dos 4 Blocos (Sim, Não, N/A)
  const [formRatings, setFormRatings] = useState(() => {
    const initial = {};
    QUALITY_BLOCKS.forEach(b => {
      b.items.forEach(item => {
        initial[item.id] = 'yes'; // Padrão inicial 100% Sim
      });
    });
    return initial;
  });

  // 6 Penalidades Críticas (Tolerância Zero)
  const [formCritical, setFormCritical] = useState([]);

  // Diagnóstico PDCA e Providência Gerencial
  const [formManagementAction, setFormManagementAction] = useState('praise');
  const [formStrengths, setFormStrengths] = useState('Prontidão no atendimento, comunicação clara e assertiva com o cidadão.');
  const [formImprovements, setFormImprovements] = useState('Atentar para a verificação ágil do ponto de referência no SADE.');
  const [formCorrectiveAction, setFormCorrectiveAction] = useState('Alinhamento de fraseologia de corte e confirmação imediata do local.');

  // Modal 1: Agendamento & Envio
  const [schedDate, setSchedDate] = useState('');
  const [schedTime, setSchedTime] = useState('');
  const [schedModality, setSchedModality] = useState('Presencial');
  const [schedLocation, setSchedLocation] = useState('');
  const [schedStatus, setSchedStatus] = useState('Pendente de Leitura');
  const [channelEmail, setChannelEmail] = useState(true);
  const [channelDash, setChannelDash] = useState(true);

  // Modal 2: Assinatura Digital do Atendente
  const [signatureCanvasDrawing, setSignatureCanvasDrawing] = useState(false);
  const [signatureAgreed, setSignatureAgreed] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState('');
  const signatureCanvasRef = useRef(null);

  // Toast helper
  const showToast = useCallback((message, type = 'info', action = null) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, action }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5500);
  }, []);

  const removeToast = useCallback(id => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // 1. Carregar monitorias salvas (inicia zerado de amostras antigas)
  useEffect(() => {
    try {
      ['copom_190_monitorias', 'copom_190_monitorias_v1', 'copom_190_monitorias_v2', 'copom_190_monitorias_v3', 'copom_190_monitorias_v4', 'copom_190_monitorias_v5', 'copom_190_monitorias_v6'].forEach(k => {
        localStorage.removeItem(k);
      });

      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMonitorias(parsed);
          return;
        }
      }
    } catch (e) {
      console.warn('Erro ao ler localStorage de qualidade:', e);
    }
    setMonitorias([]);
  }, []);

  // 2. Carregar atendentes cadastrados no banco de dados e monitorias da API
  useEffect(() => {
    let alive = true;
    const monthNow = new Date().toISOString().slice(0, 7);
    fetch('/api/quality?month=' + monthNow, { credentials: 'same-origin', cache: 'no-store' })
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then(data => {
        if (!alive) return;
        const ops = Array.isArray(data?.operators) ? data.operators : [];
        const formatted = ops.map(op => ({
          id: op.id,
          nome: op.display_name || op.username,
          email: op.username?.includes('@') ? op.username : `${op.username}@copom.gov.br`,
          username: op.username,
          fromDb: true
        }));
        setRegisteredAttendants(formatted);

        // Se houver monitorias do servidor
        if (Array.isArray(data?.monitors) && data.monitors.length > 0) {
          const apiMonitors = data.monitors.map(m => ({
            id: m.id,
            chamado: m.protocol_cad || 'CAD-190',
            atendente: m.operator_name || 'Operador',
            matricula: m.operator_username || '',
            emailAtendente: m.operator_username?.includes('@') ? m.operator_username : `${m.operator_username}@copom.gov.br`,
            dataChamada: m.audit_day || new Date().toISOString().slice(0, 10),
            duration_seconds: m.duration_seconds || 240,
            shift_period: m.shift_period || 'weekday',
            audit_type: m.audit_type || 'audio',
            monitor: m.auditor_name || 'Supervisor',
            ratings: m.ratings || {},
            critical: m.critical || [],
            notaFinal: m.score ?? 0,
            observacoes: m.strengths || '',
            strengths: m.strengths || '',
            improvements: m.improvements || '',
            correctiveAction: m.corrective_action || '',
            managementAction: m.management_action || 'praise',
            status: m.acknowledged_at ? 'Concluído' : m.status === 'published' ? 'Pendente de Leitura' : 'Rascunho',
            encaminhada: m.status === 'published',
            envio: m.published_at ? { enviadoEm: m.published_at, canais: ['Dashboard do Atendente'] } : null,
            cienciaEm: m.acknowledged_at || null,
            operator_signature_name: m.operator_signature_name || null,
            operator_signature_image: m.operator_signature_image || null,
            fromServer: true
          }));
          setMonitorias(prev => {
            const merged = [...apiMonitors];
            prev.forEach(p => {
              if (!merged.some(x => x.id === p.id || x.chamado === p.chamado)) {
                merged.push(p);
              }
            });
            return merged;
          });
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Lista consolidada de atendentes conhecidos
  const allAttendants = useMemo(() => {
    const map = new Map();
    registeredAttendants.forEach(a => map.set(a.nome.toLowerCase(), a));
    monitorias.forEach(m => {
      if (m.atendente && !map.has(m.atendente.toLowerCase())) {
        map.set(m.atendente.toLowerCase(), {
          id: 'mon-' + m.atendente,
          nome: m.atendente,
          email: m.emailAtendente || `${m.atendente.toLowerCase().replace(/\s+/g, '.')}@copom.gov.br`,
          username: m.matricula || m.atendente.toLowerCase().replace(/\s+/g, '.')
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [registeredAttendants, monitorias]);

  // Persistir monitorias no localStorage
  const persistMonitorias = useCallback(updated => {
    setMonitorias(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error('Erro ao salvar no localStorage:', err);
    }
  }, []);

  // Monitorias ativas para modais
  const activeModalItem = useMemo(() => {
    return monitorias.find(m => m.id === activeModalId) || null;
  }, [monitorias, activeModalId]);

  const activeResultModalItem = useMemo(() => {
    return monitorias.find(m => m.id === activeResultModalId) || null;
  }, [monitorias, activeResultModalId]);

  // Atualizar dados do modal 1 ao abrir
  useEffect(() => {
    if (activeModalItem) {
      setSchedDate(activeModalItem.feedback?.data || '');
      setSchedTime(activeModalItem.feedback?.horario || '');
      setSchedModality(activeModalItem.feedback?.modalidade || 'Presencial');
      setSchedLocation(activeModalItem.feedback?.local || '');
      setSchedStatus(activeModalItem.status);
      setChannelEmail(true);
      setChannelDash(true);
    }
  }, [activeModalItem]);

  // Inicializar Canvas de Assinatura do Modal 2
  useEffect(() => {
    if (activeResultModalItem && !activeResultModalItem.cienciaEm) {
      setSignatureAgreed(false);
      setSignatureDataUrl('');
      setTimeout(() => {
        const cvs = signatureCanvasRef.current;
        if (cvs) {
          const ctx = cvs.getContext('2d');
          ctx.clearRect(0, 0, cvs.width, cvs.height);
          ctx.strokeStyle = dark ? '#69d0e0' : '#0c2333';
          ctx.lineWidth = 2.5;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
        }
      }, 100);
    }
  }, [activeResultModalItem, dark]);

  // Sincronizar seleção de atendente
  function handleSelectAttendant(attKey) {
    setFormSelectedAttendantKey(attKey);
    if (!attKey || attKey === 'custom') {
      return;
    }
    const found = allAttendants.find(a => a.id === attKey || a.nome === attKey);
    if (found) {
      setFormAtendente(found.nome);
      setFormMatricula(found.username || '190-PM');
      setFormEmailAtendente(found.email);
    }
  }

  // =========================================================================
  // CÁLCULO DE PONTUAÇÃO EM TEMPO REAL (Conforme Ficha Oficial 100 Pts)
  // =========================================================================
  const formScoring = useMemo(() => {
    try {
      return qualityScore(formRatings, formCritical, { complete: false });
    } catch {
      return { score: 100, raw: 100, critical: false, class: qualityClass(100), blocks: [] };
    }
  }, [formRatings, formCritical]);

  const formTotalScore = formScoring.score ?? 0;
  const formIsZeroTolerance = formScoring.critical;

  const formMeta = useMemo(() => {
    if (formIsZeroTolerance) {
      return {
        label: 'Tolerância Zero (0)',
        stroke: dark ? '#f87171' : '#dc2626',
        barColor: dark ? '#f87171' : '#dc2626',
        badgeClass: 'critico'
      };
    }
    if (formTotalScore >= 90) {
      return {
        label: 'Excelente (Padrão Ouro)',
        stroke: dark ? '#14b8a6' : '#0d9488',
        barColor: dark ? '#14b8a6' : '#0d9488',
        badgeClass: 'excelente'
      };
    }
    if (formTotalScore >= 75) {
      return {
        label: 'Adequado (Operacional)',
        stroke: dark ? '#69d0e0' : '#096d85',
        barColor: dark ? '#69d0e0' : '#096d85',
        badgeClass: 'bom'
      };
    }
    return {
      label: 'Abaixo do Padrão (Reciclagem)',
      stroke: dark ? '#f87171' : '#dc2626',
      barColor: dark ? '#f87171' : '#dc2626',
      badgeClass: 'critico'
    };
  }, [formTotalScore, formIsZeroTolerance, dark]);

  function handleRatingChange(criterionId, value) {
    setFormRatings(prev => ({
      ...prev,
      [criterionId]: value
    }));
  }

  function handleToggleCritical(critId) {
    setFormCritical(prev => {
      if (prev.includes(critId)) {
        return prev.filter(x => x !== critId);
      }
      return [...prev, critId];
    });
  }

  function handleMarkAllYes() {
    const allYes = {};
    QUALITY_BLOCKS.forEach(b => {
      b.items.forEach(item => {
        allYes[item.id] = 'yes';
      });
    });
    setFormRatings(allYes);
    setFormCritical([]);
    showToast('Todos os 12 critérios marcados como "Sim".', 'info');
  }

  function resetCadastroForm(notify = false) {
    setFormChamado('');
    setFormDataChamada(getCurrentDateInput());
    setFormDurationMinutes(4);
    setFormDurationSeconds(20);
    setFormTurno('weekday');
    setFormTipoAuditoria('audio');
    setFormSelectedAttendantKey('');
    setFormAtendente('');
    setFormMatricula('');
    setFormEmailAtendente('');
    const allYes = {};
    QUALITY_BLOCKS.forEach(b => {
      b.items.forEach(item => {
        allYes[item.id] = 'yes';
      });
    });
    setFormRatings(allYes);
    setFormCritical([]);
    setFormManagementAction('praise');
    setFormStrengths('Prontidão no atendimento, comunicação clara e assertiva com o cidadão.');
    setFormImprovements('Atentar para a verificação ágil do ponto de referência no SADE.');
    setFormCorrectiveAction('Alinhamento de fraseologia de corte e confirmação imediata do local.');
    if (notify) showToast('Formulário limpo e pronto para novo registro.', 'info');
  }

  // Salvar Monitoria (Local e Backend)
  async function handleSaveMonitoria(e, shouldPublish = false) {
    if (e) e.preventDefault();
    const chamado = formChamado.trim();
    const atendente = formAtendente.trim();
    const email = formEmailAtendente.trim();
    const monitor = formMonitor.trim();

    if (!chamado || !formDataChamada || !atendente || !email || !monitor) {
      showToast('Preencha os campos obrigatórios de Dados do Atendimento.', 'error');
      return;
    }

    const totalSeconds = (parseInt(formDurationMinutes, 10) || 0) * 60 + (parseInt(formDurationSeconds, 10) || 0);

    const novaMonitoria = {
      id: 'mon-' + Date.now(),
      chamado,
      protocol_cad: chamado,
      atendente,
      operator_name: atendente,
      matricula: formMatricula || '190-PM',
      operator_username: formMatricula || 'sd.operador',
      emailAtendente: email,
      dataChamada: formDataChamada,
      audit_day: formDataChamada,
      duration_seconds: totalSeconds,
      shift_period: formTurno,
      audit_type: formTipoAuditoria,
      monitor,
      auditor_name: monitor,
      ratings: { ...formRatings },
      critical: [...formCritical],
      notaFinal: formTotalScore,
      score: formTotalScore,
      management_action: formManagementAction,
      strengths: formStrengths.trim(),
      improvements: formImprovements.trim(),
      corrective_action: formCorrectiveAction.trim(),
      observacoes: formStrengths.trim(),
      status: shouldPublish ? 'Pendente de Leitura' : 'Rascunho',
      encaminhada: shouldPublish,
      envio: shouldPublish ? { enviadoEm: new Date().toISOString(), canais: ['Dashboard do Atendente'] } : null,
      feedback: null,
      cienciaEm: null,
      operator_signature_name: null,
      operator_signature_image: null,
      criadoEm: new Date().toISOString()
    };

    // Tentar persistir no backend se selecionado operador cadastrado no banco
    const matchedOp = registeredAttendants.find(a => a.nome.toLowerCase() === atendente.toLowerCase() || a.id === formSelectedAttendantKey);
    if (matchedOp?.id && isSupervisor) {
      try {
        await fetch('/api/quality/monitor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            operatorId: matchedOp.id,
            protocolCad: chamado,
            auditDay: formDataChamada,
            durationSeconds: totalSeconds,
            auditType: formTipoAuditoria,
            shiftPeriod: formTurno,
            ratings: formRatings,
            critical: formCritical,
            strengths: formStrengths.trim(),
            improvements: formImprovements.trim(),
            correctiveAction: formCorrectiveAction.trim(),
            managementAction: formManagementAction,
            auditorName: monitor,
            auditorAgreed: true,
            publish: shouldPublish
          })
        });
      } catch (err) {
        console.warn('Salvamento no backend em contingência:', err);
      }
    }

    const next = [novaMonitoria, ...monitorias.filter(m => m.chamado !== chamado)];
    persistMonitorias(next);
    resetCadastroForm(false);

    showToast(
      shouldPublish
        ? `Monitoria ${chamado} salva e publicada para ciência de ${atendente} com nota ${formTotalScore}/100.`
        : `Rascunho da monitoria ${chamado} salvo com sucesso.`,
      'success',
      {
        label: 'Ver Monitorias →',
        onClick: () => setCurrentView('feedback')
      }
    );
  }

  // Encaminhar do Modal 1
  function handleSendReport() {
    if (!activeModalItem) return;
    if (!channelEmail && !channelDash) {
      showToast('Selecione ao menos um canal de envio (E-mail ou Dashboard).', 'error');
      return;
    }
    const canais = [];
    if (channelEmail) canais.push('E-mail Institucional');
    if (channelDash) canais.push('Dashboard do Atendente');

    const updated = monitorias.map(m => {
      if (m.id === activeModalItem.id) {
        return {
          ...m,
          encaminhada: true,
          status: m.status === 'Rascunho' ? 'Pendente de Leitura' : m.status,
          envio: { enviadoEm: new Date().toISOString(), canais }
        };
      }
      return m;
    });

    persistMonitorias(updated);
    showToast(`Relatório do chamado ${activeModalItem.chamado} encaminhado ao atendente com sucesso!`, 'success');
  }

  function handleSaveSchedule(e) {
    e.preventDefault();
    if (!activeModalItem) return;
    if (!schedDate || !schedTime || !schedModality) {
      showToast('Informe Data, Horário e Modalidade para o agendamento.', 'error');
      return;
    }

    const updated = monitorias.map(m => {
      if (m.id === activeModalItem.id) {
        return {
          ...m,
          status: 'Feedback Agendado',
          feedback: {
            data: schedDate,
            horario: schedTime,
            modalidade: schedModality,
            local: schedLocation.trim()
          }
        };
      }
      return m;
    });

    persistMonitorias(updated);
    showToast(`Feedback agendado para ${formatDateBR(schedDate)} às ${schedTime} (${schedModality}).`, 'success');
  }

  function handleDirectStatusChange(newStatus) {
    if (!activeModalItem) return;
    const updated = monitorias.map(m => {
      if (m.id === activeModalItem.id) {
        return { ...m, status: newStatus };
      }
      return m;
    });
    persistMonitorias(updated);
    setSchedStatus(newStatus);
    showToast(`Status atualizado para "${newStatus}".`, 'info');
  }

  function handleToggleConclude() {
    if (!activeModalItem) return;
    const isConcluded = activeModalItem.status === 'Concluído';
    const newStatus = isConcluded ? (activeModalItem.feedback ? 'Feedback Agendado' : 'Pendente de Leitura') : 'Concluído';

    const updated = monitorias.map(m => {
      if (m.id === activeModalItem.id) {
        return { ...m, status: newStatus };
      }
      return m;
    });
    persistMonitorias(updated);
    setSchedStatus(newStatus);
    showToast(isConcluded ? `Monitoria reaberta com status "${newStatus}".` : `Monitoria ${activeModalItem.chamado} marcada como Concluída.`, 'success');
  }

  // =========================================================================
  // SISTEMA INTEGRADO DE ASSINATURA DIGITAL (CANVAS E CERTIFICADO)
  // =========================================================================
  function startSignatureDrawing(e) {
    const cvs = signatureCanvasRef.current;
    if (!cvs) return;
    const rect = cvs.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const ctx = cvs.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setSignatureCanvasDrawing(true);
  }

  function drawSignature(e) {
    if (!signatureCanvasDrawing) return;
    const cvs = signatureCanvasRef.current;
    if (!cvs) return;
    const rect = cvs.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const ctx = cvs.getContext('2d');
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    e.preventDefault();
  }

  function stopSignatureDrawing() {
    if (!signatureCanvasDrawing) return;
    setSignatureCanvasDrawing(false);
    const cvs = signatureCanvasRef.current;
    if (cvs) {
      setSignatureDataUrl(cvs.toDataURL('image/png'));
    }
  }

  function clearSignature() {
    const cvs = signatureCanvasRef.current;
    if (cvs) {
      const ctx = cvs.getContext('2d');
      ctx.clearRect(0, 0, cvs.width, cvs.height);
    }
    setSignatureDataUrl('');
  }

  function generateAutoRubric() {
    const cvs = signatureCanvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    ctx.save();
    ctx.strokeStyle = dark ? '#69d0e0' : '#0c2333';
    ctx.fillStyle = dark ? '#69d0e0' : '#0c2333';
    ctx.lineWidth = 2.5;

    // Desenha rubrica caligráfica vetorial baseada no nome
    ctx.beginPath();
    ctx.moveTo(30, 60);
    ctx.bezierCurveTo(60, 20, 90, 80, 140, 45);
    ctx.bezierCurveTo(170, 20, 190, 75, 230, 40);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(25, 68);
    ctx.lineTo(260, 62);
    ctx.stroke();

    ctx.font = 'italic 16px "Brush Script MT", cursive, sans-serif';
    ctx.fillText(attendantSelfName.slice(0, 25), 45, 52);
    ctx.restore();

    setSignatureDataUrl(cvs.toDataURL('image/png'));
  }

  // Confirmar Ciência e Assinatura Digital do Atendente Logado
  async function handleConfirmSignature() {
    if (!activeResultModalItem) return;
    if (!signatureAgreed) {
      showToast('Por favor, assinale o termo de declaração de ciência para assinar.', 'error');
      return;
    }

    let finalSignImg = signatureDataUrl;
    if (!finalSignImg) {
      // Se não desenhou manualmente, gera rubrica institucional automática
      generateAutoRubric();
      const cvs = signatureCanvasRef.current;
      finalSignImg = cvs ? cvs.toDataURL('image/png') : null;
    }

    const ackTime = new Date().toISOString();

    // Sincronizar com backend `/api/quality/ack`
    try {
      await fetch('/api/quality/ack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeResultModalItem.id,
          kind: 'monitor',
          signature: {
            name: attendantSelfName,
            agreed: true,
            image: finalSignImg
          }
        })
      });
    } catch (e) {
      console.warn('Ciência salva em contingência local:', e);
    }

    // Atualizar no estado local
    const updated = monitorias.map(m => {
      if (m.id === activeResultModalItem.id) {
        return {
          ...m,
          status: 'Concluído',
          cienciaEm: ackTime,
          acknowledged_at: ackTime,
          operator_signature_name: attendantSelfName,
          operator_signature_image: finalSignImg
        };
      }
      return m;
    });

    persistMonitorias(updated);
    showToast(`Ficha assinada digitalmente com sucesso por ${attendantSelfName}! Documento autenticado.`, 'success');
  }

  // =========================================================================
  // BAIXAR PDF PREENCHIDO E ASSINADO (MANIPULAÇÃO DO PDF ORIGINAL)
  // =========================================================================
  async function handleDownloadPdf(item) {
    if (!item) return;
    showToast('Gerando documento PDF preenchido e assinado...', 'info');
    try {
      // Tentar rota oficial do servidor primeiro (se já persistido)
      if (item.fromServer && item.id) {
        const url = `/api/quality/pdf?kind=monitor&id=${encodeURIComponent(item.id)}`;
        window.open(url, '_blank');
        return;
      }

      // Geração segura via endpoint POST do servidor
      const res = await fetch('/api/quality/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'monitor', data: item })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Falha ao processar PDF no servidor');
      }

      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `Ficha_Monitoria_190_${item.chamado || item.protocol_cad || 'registro'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      showToast('Download do PDF concluído com sucesso!', 'success');
    } catch (err) {
      console.error('Erro ao gerar PDF preenchido:', err);
      showToast('Não foi possível gerar o PDF: ' + (err.message || 'Erro inesperado'), 'error');
    }
  }

  // Baixar PDF da Ficha de Acompanhamento Mensal
  async function handleDownloadFollowupPdf(followupObj, list) {
    showToast('Gerando Ficha de Acompanhamento Consolidada em PDF...', 'info');
    try {
      if (followupObj?.id) {
        const url = `/api/quality/pdf?kind=followup&id=${encodeURIComponent(followupObj.id)}`;
        window.open(url, '_blank');
        return;
      }

      const res = await fetch('/api/quality/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'followup', data: followupObj, monitors: list })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Falha ao processar PDF no servidor');
      }

      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `Ficha_Acompanhamento_Operador_190_${followupObj?.period || 'mes'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
      showToast('Download da Ficha de Acompanhamento concluído!', 'success');
    } catch (err) {
      console.error('Erro ao gerar PDF de acompanhamento:', err);
      showToast('Erro ao gerar PDF: ' + err.message, 'error');
    }
  }

  // Filtros Aba 2 (Encaminhamento e Feedback)
  const filteredFeedbackList = useMemo(() => {
    const q = searchFeedback.trim().toLowerCase();
    return monitorias.filter(m => {
      const matchStatus = !activeStatusFilter || m.status === activeStatusFilter;
      const matchQuery =
        !q ||
        m.chamado.toLowerCase().includes(q) ||
        m.atendente.toLowerCase().includes(q) ||
        m.monitor.toLowerCase().includes(q);
      return matchStatus && matchQuery;
    });
  }, [monitorias, activeStatusFilter, searchFeedback]);

  // Contadores Aba 2
  const countPendente = useMemo(() => monitorias.filter(m => m.status === 'Pendente de Leitura').length, [monitorias]);
  const countAgendado = useMemo(() => monitorias.filter(m => m.status === 'Feedback Agendado').length, [monitorias]);
  const countConcluido = useMemo(() => monitorias.filter(m => m.status === 'Concluído').length, [monitorias]);

  // Filtros Aba 3 (Monitorias para o Atendente / Gerais)
  const forwardedBaseList = useMemo(() => {
    return monitorias.filter(m => {
      if (!m.encaminhada && m.status !== 'Concluído') return false;
      // No perfil de Atendente: estritamente e somente as DELE
      if (activeProfile === 'attendant' || currentRole === 'atendente') {
        const myName = (attendantSelfName || '').trim().toLowerCase();
        const mAtendente = String(m.atendente || '').trim().toLowerCase();
        const mEmail = String(m.emailAtendente || '').trim().toLowerCase();
        const isMine =
          mAtendente === myName ||
          mEmail === myName ||
          (myName && mEmail.startsWith(myName)) ||
          (myName && mAtendente.includes(myName)) ||
          (myName && myName.includes(mAtendente));
        return isMine;
      }
      // Modo supervisor: pode filtrar por atendente ou ver todos
      if (selectedAttendant && selectedAttendant !== 'ALL') {
        return String(m.atendente || '').trim().toLowerCase() === selectedAttendant.trim().toLowerCase();
      }
      return true;
    });
  }, [monitorias, activeProfile, currentRole, attendantSelfName, selectedAttendant]);

  const filteredPublicList = useMemo(() => {
    const q = searchPublic.trim().toLowerCase();
    return forwardedBaseList.filter(m => {
      const matchStatus = publicStatusFilter === 'ALL' || m.status === publicStatusFilter;
      const matchQuery =
        !q ||
        m.chamado.toLowerCase().includes(q) ||
        m.atendente.toLowerCase().includes(q) ||
        m.monitor.toLowerCase().includes(q);
      return matchStatus && matchQuery;
    });
  }, [forwardedBaseList, publicStatusFilter, searchPublic]);

  // Indicadores Aba 3
  const publicTotal = forwardedBaseList.length;
  const publicMedia = useMemo(() => {
    if (!publicTotal) return null;
    const sum = forwardedBaseList.reduce((acc, m) => acc + (m.notaFinal || 0), 0);
    return Math.round(sum / publicTotal);
  }, [forwardedBaseList, publicTotal]);

  const publicAgendados = useMemo(
    () => forwardedBaseList.filter(m => m.feedback && m.status === 'Feedback Agendado').length,
    [forwardedBaseList]
  );
  const publicCiencia = useMemo(
    () => forwardedBaseList.filter(m => Boolean(m.cienciaEm) || m.status === 'Concluído').length,
    [forwardedBaseList]
  );

  // SVG Gauge calculations
  const circumference = 326.73;
  const strokeOffset = circumference - (formTotalScore / 100) * circumference;

  // Broadcast nav state to parent shell (for unified topbar integration)
  useEffect(() => {
    if (typeof onStateChange === 'function') {
      onStateChange({ currentView, setCurrentView, currentRole, setCurrentRole, isSupervisor, countPendente, publicTotal });
    }
  }, [currentView, currentRole, isSupervisor, countPendente, publicTotal]);

  return (
    <div className="quality-module">
      <div className="qm-shell">
        {/* Overlay mobile */}
        {mobileMenuOpen && (
          <div className="qm-mobile-overlay" onClick={() => setMobileMenuOpen(false)} aria-hidden="true" />
        )}

        {/* Sidebar Fixa à Esquerda */}
        <aside className={`qm-sidebar ${mobileMenuOpen ? 'open' : ''}`}>
          <div className="qm-sidebar-header">
            <div className="qm-brand">
              <div className="qm-brand-icon">
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
                </svg>
              </div>
              <div>
                <div className="qm-brand-title">Central 190</div>
                <div className="qm-brand-sub">Monitoria de Qualidade</div>
              </div>
            </div>
            <button
              type="button"
              className="qm-close-btn lg-hidden"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Fechar menu"
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Selo do Perfil Ativo */}
          <div className="qm-role-pill-wrap">
            <div className="qm-role-pill">
              <span className={`qm-role-dot ${currentRole}`} />
              <span className="truncate">
                {currentRole === 'monitor' ? 'Acesso: Monitor / Supervisor' : 'Acesso: Atendente'}
              </span>
            </div>
          </div>

          {/* Navegação Principal */}
          <nav className="qm-nav" aria-label="Navegação da Monitoria">
            <span className="qm-nav-label">Módulos do Sistema</span>

            {currentRole === 'monitor' && (
              <>
                <button
                  type="button"
                  className={`qm-nav-btn ${currentView === 'cadastro' ? 'active' : ''}`}
                  onClick={() => {
                    setCurrentView('cadastro');
                    setMobileMenuOpen(false);
                  }}
                >
                  <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                    <rect x="9" y="3" width="6" height="4" rx="1" strokeLinecap="round" strokeLinejoin="round" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6M9 16h4" />
                  </svg>
                  <span>Cadastramento</span>
                </button>

                <button
                  type="button"
                  className={`qm-nav-btn ${currentView === 'feedback' ? 'active' : ''}`}
                  onClick={() => {
                    setCurrentView('feedback');
                    setMobileMenuOpen(false);
                  }}
                >
                  <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Encaminhamento</span>
                  {countPendente > 0 && <span className="qm-badge amber">{countPendente}</span>}
                </button>
              </>
            )}

            <button
              type="button"
              className={`qm-nav-btn ${currentView === 'monitorias' ? 'active' : ''}`}
              onClick={() => {
                setCurrentView('monitorias');
                setMobileMenuOpen(false);
              }}
            >
              <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>Monitorias & Ciência</span>
              {publicTotal > 0 && <span className="qm-badge blue">{publicTotal}</span>}
            </button>
          </nav>

          {/* Seletor de Perfil (Rodapé da Sidebar) */}
          <div className="qm-sidebar-footer">
            {isSupervisor ? (
              <div>
                <span className="qm-role-selector-label">Perfil de Simulação</span>
                <div className="qm-role-toggle">
                  <button
                    type="button"
                    className={`qm-role-toggle-btn ${currentRole === 'monitor' ? 'active monitor' : ''}`}
                    onClick={() => {
                      setCurrentRole('monitor');
                      showToast('Perfil alternado para Monitor / Supervisor (acesso completo).', 'info');
                    }}
                  >
                    Monitor
                  </button>
                  <button
                    type="button"
                    className={`qm-role-toggle-btn ${currentRole === 'atendente' ? 'active atendente' : ''}`}
                    onClick={() => {
                      setCurrentRole('atendente');
                      setCurrentView('monitorias');
                      showToast('Perfil alternado para Atendente (visualização estrita das suas monitorias).', 'info');
                    }}
                  >
                    Atendente
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '6px 0' }}>
                <span className="qm-role-selector-label">Perfil Operacional</span>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', background: 'rgba(56, 189, 248, 0.12)', padding: '6px 8px', borderRadius: 8, border: '1px solid rgba(56, 189, 248, 0.25)' }}>
                  🎧 Atendente (Consulta & Assinatura)
                </div>
                <small className="qm-text-muted" style={{ display: 'block', marginTop: 4, fontSize: 10 }}>
                  Acesso exclusivo às suas avaliações
                </small>
              </div>
            )}

            {currentRole === 'atendente' && (
              <div className="qm-attendant-select-wrap">
                <span className="qm-role-selector-label">Atendente Conectado</span>
                <div className="qm-attendant-locked-badge">
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <strong style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {attendantSelfName}
                  </strong>
                </div>
                <small className="qm-text-muted" style={{ display: 'block', marginTop: 4, fontSize: 10, lineHeight: 1.3 }}>
                  🔒 Assinatura vinculada à sua sessão
                </small>
              </div>
            )}

            {toggleTheme && (
              <button
                type="button"
                className="qm-sidebar-theme-btn"
                onClick={toggleTheme}
                title={dark ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
              >
                {dark ? (
                  <>
                    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="5" />
                      <path strokeLinecap="round" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                    </svg>
                    <span>Modo Claro</span>
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                    </svg>
                    <span>Modo Escuro</span>
                  </>
                )}
              </button>
            )}

            {/* Identificação do Usuário */}
            <div className="qm-user-profile">
              <div className="qm-avatar">
                {currentRole === 'monitor' ? 'MS' : 'AT'}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="qm-user-name">
                  {currentRole === 'monitor' ? (user?.name || user?.username || 'Monitor / Supervisor') : attendantSelfName}
                </div>
                <div className="qm-user-sub">
                  {currentRole === 'monitor' ? 'Acesso de Gestão / Auditoria' : 'Atendente • COPOM 190'}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Conteúdo Principal */}
        <div className="qm-content-wrap">
          <header className="qm-mobile-topbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                className="qm-hamburger-btn"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Abrir menu"
              >
                <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div>
                <strong style={{ fontSize: 14, display: 'block', lineHeight: 1.2 }}>Central 190</strong>
                <small className="qm-text-muted" style={{ fontSize: 11 }}>
                  {currentRole === 'monitor' ? 'Monitoria de Qualidade Oficial' : 'Visão do Atendente'}
                </small>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {toggleTheme && (
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="qm-theme-btn"
                  style={{ padding: '6px 10px' }}
                  title={dark ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
                >
                  {dark ? (
                    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="5" />
                      <path strokeLinecap="round" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                    </svg>
                  ) : (
                    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                    </svg>
                  )}
                </button>
              )}
            </div>
          </header>

          <main className="qm-main">
            {/* =============================================================== */}
            {/* ABA 1: CADASTRAMENTO DE MONITORIA (4 BLOCOS + TOLERÂNCIA ZERO)  */}
            {/* =============================================================== */}
            {currentView === 'cadastro' && currentRole === 'monitor' && (
              <section key="cadastro" className="qm-view-enter">
                <div className="qm-section-header">
                  <div>
                    <div className="qm-section-title-wrap">
                      <h1 className="qm-section-title">Ficha de Monitoria e Auditoria de Qualidade</h1>
                      <span className="qm-section-badge blue">Modelo Oficial COPOM 190</span>
                    </div>
                    <p className="qm-section-desc">
                      Avaliação operacional em 4 blocos técnicos (100 pontos), 12 critérios auditados e 6 penalidades de tolerância zero.
                    </p>
                  </div>
                  <div className="qm-header-actions">
                    <button
                      type="button"
                      onClick={handleMarkAllYes}
                      className="qm-btn-secondary"
                      style={{ width: 'auto', padding: '7px 12px', fontSize: 12 }}
                      title="Define 'Sim' em todos os 12 critérios"
                    >
                      ✓ Marcar Todos como Sim
                    </button>
                    <div className="qm-section-badge">
                      <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--copom-blue)' }} />
                      Escala Oficial: 100 Pontos
                    </div>
                  </div>
                </div>

                <form onSubmit={e => handleSaveMonitoria(e, true)} className="qm-grid-cadastro">
                  {/* Coluna Esquerda: Formulário Completo */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* Bloco de Cabeçalho: Identificação do Atendimento */}
                    <div className="qm-card">
                      <div className="qm-card-header">
                        <div className="qm-card-icon">
                          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </div>
                        <div>
                          <h2 className="qm-card-title">Dados do Atendimento e da Auditoria</h2>
                          <p className="qm-card-desc">
                            Identificação do operador avaliado, número de CAD, duração e turno operacional.
                          </p>
                        </div>
                      </div>

                      <div className="qm-form-grid-3">
                        <div className="qm-field">
                          <label className="qm-label">
                            Protocolo / Nº CAD <span className="qm-req">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: CAD-190-2026-085104"
                            value={formChamado}
                            onChange={e => setFormChamado(e.target.value)}
                            className="qm-input"
                          />
                        </div>

                        <div className="qm-field">
                          <label className="qm-label">
                            Data da Auditoria <span className="qm-req">*</span>
                          </label>
                          <input
                            type="date"
                            required
                            value={formDataChamada}
                            onChange={e => setFormDataChamada(e.target.value)}
                            className="qm-input"
                          />
                        </div>

                        <div className="qm-field">
                          <label className="qm-label">
                            Supervisor / Auditor <span className="qm-req">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={formMonitor}
                            onChange={e => setFormMonitor(e.target.value)}
                            className="qm-input"
                          />
                        </div>

                        {/* Seletor do Atendente */}
                        <div className="qm-field col-span-2">
                          <label className="qm-label">
                            Operador Avaliado (Base de Usuários) <span className="qm-req">*</span>
                          </label>
                          <select
                            value={formSelectedAttendantKey}
                            onChange={e => handleSelectAttendant(e.target.value)}
                            className="qm-select"
                          >
                            <option value="">-- Selecione o atendente cadastrado no COPOM --</option>
                            {allAttendants.map(att => (
                              <option key={att.id || att.nome} value={att.id || att.nome}>
                                {att.nome} ({att.username}) — {att.email}
                              </option>
                            ))}
                            <option value="custom">Outro operador (digitação manual)...</option>
                          </select>
                        </div>

                        <div className="qm-field">
                          <label className="qm-label">
                            Matrícula / ID <span className="qm-req">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: 190-8842"
                            value={formMatricula}
                            onChange={e => setFormMatricula(e.target.value)}
                            className="qm-input"
                          />
                        </div>

                        <div className="qm-field col-span-2">
                          <label className="qm-label">
                            Nome Completo do Atendente <span className="qm-req">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Nome do atendente"
                            value={formAtendente}
                            onChange={e => {
                              setFormAtendente(e.target.value);
                              setFormSelectedAttendantKey('custom');
                            }}
                            className="qm-input"
                          />
                        </div>

                        <div className="qm-field">
                          <label className="qm-label">
                            Duração da Chamada (TMA) <span className="qm-req">*</span>
                          </label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <input
                              type="number"
                              min="0"
                              max="120"
                              value={formDurationMinutes}
                              onChange={e => setFormDurationMinutes(Math.max(0, parseInt(e.target.value, 10) || 0))}
                              className="qm-input"
                              style={{ width: 65, textAlign: 'center' }}
                            />
                            <span style={{ fontSize: 12, fontWeight: 600 }}>min</span>
                            <input
                              type="number"
                              min="0"
                              max="59"
                              value={formDurationSeconds}
                              onChange={e => setFormDurationSeconds(Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0)))}
                              className="qm-input"
                              style={{ width: 65, textAlign: 'center' }}
                            />
                            <span style={{ fontSize: 12, fontWeight: 600 }}>seg</span>
                          </div>
                        </div>

                        {/* Turno e Tipo de Auditoria */}
                        <div className="qm-field">
                          <label className="qm-label">Turno / Período</label>
                          <select
                            value={formTurno}
                            onChange={e => setFormTurno(e.target.value)}
                            className="qm-select"
                          >
                            <option value="weekday">Dia Útil</option>
                            <option value="weekend">Final de Semana / Pico</option>
                          </select>
                        </div>

                        <div className="qm-field">
                          <label className="qm-label">Tipo de Auditoria</label>
                          <select
                            value={formTipoAuditoria}
                            onChange={e => setFormTipoAuditoria(e.target.value)}
                            className="qm-select"
                          >
                            <option value="audio">Áudio Retrospectivo</option>
                            <option value="live">Tempo Real (Escuta Ativa)</option>
                          </select>
                        </div>

                        <div className="qm-field col-span-2">
                          <label className="qm-label">E-mail Institucional</label>
                          <input
                            type="email"
                            required
                            placeholder="atendente@copom.gov.br"
                            value={formEmailAtendente}
                            onChange={e => setFormEmailAtendente(e.target.value)}
                            className="qm-input"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Os 4 Blocos Técnicos Oficiais da Ficha */}
                    {QUALITY_BLOCKS.map((block, bIdx) => (
                      <div key={block.id} className="qm-card qm-block-card">
                        <div className="qm-card-header" style={{ paddingBottom: 10 }}>
                          <div className="qm-card-icon" style={{ backgroundColor: 'var(--copom-soft)', color: 'var(--copom-blue)' }}>
                            <strong>B{bIdx + 1}</strong>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                              <h2 className="qm-card-title">
                                Bloco {bIdx + 1}: {block.name}
                              </h2>
                              <span className="qm-badge blue" style={{ fontWeight: 700 }}>
                                {block.max} Pontos
                              </span>
                            </div>
                            <p className="qm-card-desc">
                              Avalie a conformidade de cada item operacional conforme o Procedimento Operacional Padrão (POP).
                            </p>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                          {block.items.map(item => {
                            const val = formRatings[item.id] || 'yes';
                            return (
                              <div key={item.id} className="qm-criterion-box">
                                <div className="qm-criterion-info">
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span className="qm-crit-code">{item.id}</span>
                                    <strong className="qm-crit-name">{item.label}</strong>
                                    <span className="qm-crit-weight">{item.points} pts</span>
                                  </div>
                                  <p className="qm-crit-desc">{item.description}</p>
                                </div>

                                <div className="qm-crit-actions">
                                  <button
                                    type="button"
                                    onClick={() => handleRatingChange(item.id, 'yes')}
                                    className={`qm-opt-btn sim ${val === 'yes' ? 'active' : ''}`}
                                  >
                                    Sim ({item.points})
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRatingChange(item.id, 'no')}
                                    className={`qm-opt-btn nao ${val === 'no' ? 'active' : ''}`}
                                  >
                                    Não (0)
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRatingChange(item.id, 'na')}
                                    className={`qm-opt-btn na ${val === 'na' ? 'active' : ''}`}
                                    title="Não Aplicável: a pontuação máxima é recalculada proporcionalmente"
                                  >
                                    N/A
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {/* Seção 2: Penalidades Críticas – Tolerância Zero */}
                    <div className="qm-card qm-critical-card">
                      <div className="qm-card-header">
                        <div className="qm-card-icon" style={{ backgroundColor: 'rgba(220, 38, 38, 0.15)', color: '#dc2626' }}>
                          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <h2 className="qm-card-title" style={{ color: '#dc2626' }}>
                              2. Penalidades Críticas — Tolerância Zero
                            </h2>
                            <span className="qm-badge red">Anula a nota para 0</span>
                          </div>
                          <p className="qm-card-desc">
                            Ocorrência de falha grave zera a nota final da monitoria imediatamente e exige plano de ação corretivo em sala.
                          </p>
                        </div>
                      </div>

                      {formIsZeroTolerance && (
                        <div className="qm-critical-active-banner">
                          ⚠️ ATENÇÃO: Falha crítica identificada. A nota final foi fixada em 0 (Zero) e exige plano imediato de reciclagem ou feedback formal.
                        </div>
                      )}

                      <div className="qm-critical-grid">
                        {QUALITY_CRITICAL.map(crit => {
                          const isChecked = formCritical.includes(crit.id);
                          return (
                            <label key={crit.id} className={`qm-critical-item ${isChecked ? 'active' : ''}`}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleCritical(crit.id)}
                                className="qm-critical-checkbox"
                              />
                              <div className="qm-critical-info">
                                <strong className="qm-critical-label">{crit.label}</strong>
                                <p className="qm-critical-desc">{crit.description}</p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Seção 3: Diagnóstico, PDCA e Providência Gerencial */}
                    <div className="qm-card">
                      <div className="qm-card-header">
                        <div className="qm-card-icon">
                          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <h2 className="qm-card-title">3. Diagnóstico e Plano de Ação (Ciclo PDCA)</h2>
                          <p className="qm-card-desc">
                            Preencha as observações qualitativas e a providência gerencial acordada com o operador.
                          </p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {/* Providência Gerencial */}
                        <div className="qm-field">
                          <label className="qm-label">Providência Gerencial Acordada <span className="qm-req">*</span></label>
                          <div className="qm-mgmt-grid">
                            {QUALITY_MANAGEMENT.map(([mId, mLabel]) => {
                              const isSelected = formManagementAction === mId;
                              return (
                                <label key={mId} className={`qm-mgmt-card ${isSelected ? 'active' : ''}`}>
                                  <input
                                    type="radio"
                                    name="managementAction"
                                    value={mId}
                                    checked={isSelected}
                                    onChange={() => setFormManagementAction(mId)}
                                    className="qm-mgmt-radio"
                                  />
                                  <div className="qm-mgmt-info">
                                    <span className="qm-mgmt-title">{mLabel}</span>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        <div className="qm-field">
                          <label className="qm-label">Pontos Fortes (O que o operador executou com excelência) <span className="qm-req">*</span></label>
                          <textarea
                            rows={2}
                            required
                            placeholder="Descreva a postura, empatia, tom de voz e domínio do protocolo..."
                            value={formStrengths}
                            onChange={e => setFormStrengths(e.target.value)}
                            className="qm-textarea"
                          />
                        </div>

                        <div className="qm-field">
                          <label className="qm-label">Não Conformidades / Oportunidades de Melhoria <span className="qm-req">*</span></label>
                          <textarea
                            rows={2}
                            required
                            placeholder="Excesso de perguntas, validação de ponto de referência, controle emocional..."
                            value={formImprovements}
                            onChange={e => setFormImprovements(e.target.value)}
                            className="qm-textarea"
                          />
                        </div>

                        <div className="qm-field">
                          <label className="qm-label">Ação Corretiva Acordada (Plano de Ação) <span className="qm-req">*</span></label>
                          <textarea
                            rows={2}
                            required
                            placeholder="Escuta conjunta da gravação, reforço na fraseologia de corte, treinamento no SADE..."
                            value={formCorrectiveAction}
                            onChange={e => setFormCorrectiveAction(e.target.value)}
                            className="qm-textarea"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Coluna Direita: Painel Sticky de Pontuação em Tempo Real */}
                  <div className="qm-sticky-panel">
                    <div className="qm-card">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--copom-dark)' }}>Resumo da Pontuação</span>
                        <span className={`qm-score-tag ${formMeta.badgeClass}`}>
                          {formMeta.label}
                        </span>
                      </div>

                      {/* Gráfico Circular SVG */}
                      <div className="qm-score-circle-wrap">
                        <div className="qm-circle-svg-container">
                          <svg className="qm-circle-svg" viewBox="0 0 120 120">
                            <circle cx="60" cy="60" r="52" fill="none" className="qm-gauge-track-circle" strokeWidth="10" />
                            <circle
                              cx="60"
                              cy="60"
                              r="52"
                              fill="none"
                              stroke={formMeta.stroke}
                              strokeWidth="10"
                              strokeLinecap="round"
                              strokeDasharray={circumference}
                              strokeDashoffset={strokeOffset}
                              style={{ transition: 'stroke-dashoffset 0.3s ease, stroke 0.3s ease' }}
                            />
                          </svg>
                          <div className="qm-circle-inner">
                            <span className="qm-circle-score-val">{formTotalScore}</span>
                            <span className="qm-circle-score-max">de 100 pts</span>
                          </div>
                        </div>
                        <div className="qm-circle-decimal">
                          Equivalente: <strong>{formatDecimalScore(formTotalScore)} / 10,0</strong>
                        </div>
                      </div>

                      {/* Barras de progresso por Bloco */}
                      <div className="qm-breakdown-list">
                        {QUALITY_BLOCKS.map((b, idx) => {
                          let earned = 0, possible = 0;
                          b.items.forEach(item => {
                            if (formRatings[item.id] !== 'na') {
                              possible += item.points;
                              if (formRatings[item.id] === 'yes') earned += item.points;
                            }
                          });
                          const pct = possible > 0 ? Math.round((earned / possible) * 100) : 0;
                          return (
                            <div key={b.id} className="qm-breakdown-row">
                              <div className="qm-breakdown-labels">
                                <span className="qm-breakdown-name">Bloco {idx + 1} ({b.max}p)</span>
                                <span className="qm-breakdown-val">{earned}/{possible}</span>
                              </div>
                              <div className="qm-progress-bar">
                                <div
                                  className="qm-progress-fill"
                                  style={{
                                    width: `${pct}%`,
                                    backgroundColor: formIsZeroTolerance ? '#dc2626' : pct >= 85 ? 'var(--copom-emerald)' : pct >= 70 ? 'var(--copom-blue)' : 'var(--copom-red)'
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Botões de Ação */}
                      <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--copom-border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <button type="submit" className="qm-btn-primary">
                          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          Salvar e Publicar Avaliação
                        </button>
                        <button
                          type="button"
                          onClick={e => handleSaveMonitoria(e, false)}
                          className="qm-btn-secondary"
                        >
                          Salvar como Rascunho
                        </button>
                        <button
                          type="button"
                          onClick={() => resetCadastroForm(true)}
                          className="qm-btn-secondary"
                          style={{ opacity: 0.8 }}
                        >
                          Limpar Formulário
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              </section>
            )}

            {/* =============================================================== */}
            {/* ABA 2: ENCAMINHAMENTO E FEEDBACK (Monitor)                       */}
            {/* =============================================================== */}
            {currentView === 'feedback' && currentRole === 'monitor' && (
              <section key="feedback" className="qm-view-enter">
                <div className="qm-section-header">
                  <div>
                    <div className="qm-section-title-wrap">
                      <h1 className="qm-section-title">Encaminhamento e Gestão de Feedbacks</h1>
                      <span className="qm-section-badge blue">Acesso: Monitor / Supervisor</span>
                    </div>
                    <p className="qm-section-desc">
                      Controle o fluxo de envio aos atendentes, agende as sessões de retorno e emita as Fichas Oficiais em PDF.
                    </p>
                  </div>
                  <div className="qm-header-actions">
                    <button
                      type="button"
                      onClick={() => setCurrentView('cadastro')}
                      className="qm-btn-primary"
                      style={{ width: 'auto', padding: '9px 16px' }}
                    >
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      Nova Monitoria
                    </button>
                  </div>
                </div>

                {/* Cards KPI com Filtro */}
                <div className="qm-kpi-grid">
                  <button
                    type="button"
                    onClick={() => setActiveStatusFilter(prev => (prev === 'Pendente de Leitura' ? null : 'Pendente de Leitura'))}
                    className={`qm-kpi-card ${activeStatusFilter === 'Pendente de Leitura' ? 'active-amber' : ''}`}
                  >
                    <div className="qm-kpi-header">
                      <span className="qm-kpi-label">Pendente de Leitura</span>
                      <span className="qm-kpi-dot amber" />
                    </div>
                    <div className="qm-kpi-body">
                      <span className="qm-kpi-count">{countPendente}</span>
                      <span className="qm-kpi-action">{activeStatusFilter === 'Pendente de Leitura' ? 'Filtro ativo' : 'Filtrar'}</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveStatusFilter(prev => (prev === 'Feedback Agendado' ? null : 'Feedback Agendado'))}
                    className={`qm-kpi-card ${activeStatusFilter === 'Feedback Agendado' ? 'active-blue' : ''}`}
                  >
                    <div className="qm-kpi-header">
                      <span className="qm-kpi-label">Feedback Agendado</span>
                      <span className="qm-kpi-dot blue" />
                    </div>
                    <div className="qm-kpi-body">
                      <span className="qm-kpi-count">{countAgendado}</span>
                      <span className="qm-kpi-action">{activeStatusFilter === 'Feedback Agendado' ? 'Filtro ativo' : 'Filtrar'}</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveStatusFilter(prev => (prev === 'Concluído' ? null : 'Concluído'))}
                    className={`qm-kpi-card ${activeStatusFilter === 'Concluído' ? 'active-emerald' : ''}`}
                  >
                    <div className="qm-kpi-header">
                      <span className="qm-kpi-label">Concluído / Assinado</span>
                      <span className="qm-kpi-dot emerald" />
                    </div>
                    <div className="qm-kpi-body">
                      <span className="qm-kpi-count">{countConcluido}</span>
                      <span className="qm-kpi-action">{activeStatusFilter === 'Concluído' ? 'Filtro ativo' : 'Filtrar'}</span>
                    </div>
                  </button>
                </div>

                {/* Tabela de Monitorias para Gerenciamento */}
                <div className="qm-table-card">
                  <div className="qm-table-toolbar">
                    <div className="qm-search-wrap">
                      <svg className="qm-search-icon" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        type="text"
                        placeholder="Buscar por chamado, atendente ou monitor..."
                        value={searchFeedback}
                        onChange={e => setSearchFeedback(e.target.value)}
                        className="qm-search-input"
                      />
                    </div>

                    <div className="qm-table-badges">
                      {activeStatusFilter && (
                        <div className="qm-filter-chip">
                          <span>Filtro: <strong>{activeStatusFilter}</strong></span>
                          <button
                            type="button"
                            onClick={() => setActiveStatusFilter(null)}
                            className="qm-chip-clear"
                          >
                            Limpar
                          </button>
                        </div>
                      )}
                      <span className="qm-records-counter">
                        {filteredFeedbackList.length} {filteredFeedbackList.length === 1 ? 'registro' : 'registros'}
                      </span>
                    </div>
                  </div>

                  <div className="qm-table-scroll">
                    <table className="qm-table">
                      <thead>
                        <tr>
                          <th>Chamado / CAD</th>
                          <th>Atendente Avaliado</th>
                          <th>Data / Duração</th>
                          <th>Supervisor</th>
                          <th>Nota Final</th>
                          <th>Status</th>
                          <th>Feedback</th>
                          <th style={{ textAlign: 'right' }}>Ações & PDF</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredFeedbackList.map(m => {
                          const isSent = m.encaminhada;
                          return (
                            <tr key={m.id}>
                              <td>
                                <div className="qm-text-bold">{m.chamado}</div>
                                {isSent ? (
                                  <span style={{ fontSize: 11, color: 'var(--copom-emerald)', fontWeight: 600 }}>Nota publicada</span>
                                ) : (
                                  <span style={{ fontSize: 11, color: 'var(--copom-amber)', fontWeight: 600 }}>Rascunho interno</span>
                                )}
                              </td>
                              <td>
                                <div className="qm-text-bold">{m.atendente}</div>
                                <div className="qm-text-muted">{m.emailAtendente}</div>
                              </td>
                              <td>
                                <div className="qm-text-bold" style={{ fontSize: 12 }}>{formatDateBR(m.dataChamada)}</div>
                                <span className="qm-text-muted">{formatDurationDisplay(m.duration_seconds)}</span>
                              </td>
                              <td>
                                <span className="qm-text-muted">{m.monitor}</span>
                              </td>
                              <td>
                                <span className={`qm-score-tag ${m.notaFinal >= 90 ? 'excelente' : m.notaFinal >= 75 ? 'bom' : 'critico'}`}>
                                  {m.notaFinal} / 100
                                </span>
                              </td>
                              <td>
                                <span
                                  className={`qm-status-badge ${
                                    m.status === 'Concluído'
                                      ? 'concluido'
                                      : m.status === 'Feedback Agendado'
                                      ? 'agendado'
                                      : 'pendente'
                                  }`}
                                >
                                  {m.status}
                                </span>
                                {m.cienciaEm && (
                                  <div style={{ fontSize: 10, color: 'var(--copom-emerald)', fontWeight: 700, marginTop: 2 }}>
                                    ✓ Assinado digitalmente
                                  </div>
                                )}
                              </td>
                              <td>
                                {m.feedback ? (
                                  <div>
                                    <div className="qm-text-bold" style={{ fontSize: 12 }}>
                                      {formatDateBR(m.feedback.data)} às {m.feedback.horario}
                                    </div>
                                    <div className="qm-text-muted">{m.feedback.modalidade}</div>
                                  </div>
                                ) : (
                                  <span className="qm-text-muted">Não agendado</span>
                                )}
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadPdf(m)}
                                    className="qm-btn-pdf"
                                    title="Baixar Ficha de Monitoria em PDF (Oficial e Preenchida)"
                                  >
                                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    PDF
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setActiveModalId(m.id)}
                                    className="qm-btn-manage"
                                  >
                                    Gerenciar
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {filteredFeedbackList.length === 0 && (
                    <div className="qm-empty-box">
                      <div className="qm-empty-icon">
                        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <p className="qm-empty-title">Nenhuma monitoria encontrada</p>
                      <p className="qm-empty-desc">Cadastre uma nova monitoria no módulo de Cadastramento.</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* =============================================================== */}
            {/* ABA 3: MONITORIAS & CIÊNCIA (Visão Atendente e Auditor)         */}
            {/* =============================================================== */}
            {currentView === 'monitorias' && (
              <section key="monitorias" className="qm-view-enter">
                <div className="qm-section-header">
                  <div>
                    <div className="qm-section-title-wrap">
                      <h1 className="qm-section-title">Monitorias de Qualidade & Assinatura de Ciência</h1>
                      <span className={`qm-section-badge ${currentRole === 'monitor' ? 'blue' : 'emerald'}`}>
                        {currentRole === 'monitor' ? 'Acesso: Monitor / Supervisor' : 'Acesso: Atendente'}
                      </span>
                    </div>
                    <p className="qm-section-desc">
                      Consulta detalhada das auditorias recebidas, preenchimento automático das fichas e assinatura digital autenticada.
                    </p>
                  </div>

                  <div className="qm-header-actions">
                    {currentRole === 'atendente' && (
                      <div className="qm-attendant-banner">
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span>
                          Operador Conectado: <strong>{attendantSelfName}</strong>
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4 Cards de Resumo */}
                <div className="qm-stat-grid-4">
                  <div className="qm-stat-card">
                    <div className="qm-stat-header">
                      <span className="qm-kpi-label">Avaliações Disponíveis</span>
                      <div className="qm-stat-icon-wrap slate">
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    </div>
                    <div className="qm-stat-val-row">
                      <span className="qm-stat-val">{publicTotal}</span>
                      <span className="qm-stat-sub">auditadas</span>
                    </div>
                  </div>

                  <div className="qm-stat-card">
                    <div className="qm-stat-header">
                      <span className="qm-kpi-label">Média Geral das Notas</span>
                      <div className="qm-stat-icon-wrap blue">
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      </div>
                    </div>
                    <div className="qm-stat-val-row">
                      <span className="qm-stat-val">{publicMedia !== null ? publicMedia : '—'}</span>
                      {publicMedia !== null && (
                        <span className="qm-stat-sub">({formatDecimalScore(publicMedia)} / 10,0)</span>
                      )}
                    </div>
                  </div>

                  <div className="qm-stat-card">
                    <div className="qm-stat-header">
                      <span className="qm-kpi-label">Feedbacks Agendados</span>
                      <div className="qm-stat-icon-wrap amber">
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>
                    <div className="qm-stat-val-row">
                      <span className="qm-stat-val">{publicAgendados}</span>
                      <span className="qm-stat-sub">sessões</span>
                    </div>
                  </div>

                  <div className="qm-stat-card">
                    <div className="qm-stat-header">
                      <span className="qm-kpi-label">Ciência / Assinadas</span>
                      <div className="qm-stat-icon-wrap emerald">
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <div className="qm-stat-val-row">
                      <span className="qm-stat-val">{publicCiencia}</span>
                      <span className="qm-stat-sub">completas</span>
                    </div>
                  </div>
                </div>

                {/* Tabela de Monitorias Públicas / do Atendente */}
                <div className="qm-table-card">
                  <div className="qm-table-toolbar">
                    <div className="qm-search-wrap">
                      <svg className="qm-search-icon" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        type="text"
                        placeholder="Buscar por chamado, atendente ou monitor..."
                        value={searchPublic}
                        onChange={e => setSearchPublic(e.target.value)}
                        className="qm-search-input"
                      />
                    </div>

                    <div className="qm-filter-pills">
                      {['ALL', 'Pendente de Leitura', 'Feedback Agendado', 'Concluído'].map(filterKey => (
                        <button
                          key={filterKey}
                          type="button"
                          onClick={() => setPublicStatusFilter(filterKey)}
                          className={`qm-filter-pill-btn ${publicStatusFilter === filterKey ? 'active' : ''}`}
                        >
                          {filterKey === 'ALL' ? 'Todos' : filterKey}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="qm-table-scroll">
                    <table className="qm-table">
                      <thead>
                        <tr>
                          <th>Chamado / CAD</th>
                          <th>Atendente</th>
                          <th>Data / Duração</th>
                          <th>Supervisor</th>
                          <th>Nota Final</th>
                          <th>Status & Assinatura</th>
                          <th>Feedback</th>
                          <th style={{ textAlign: 'right' }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPublicList.map(m => {
                          const isSigned = Boolean(m.cienciaEm || m.acknowledged_at);
                          return (
                            <tr key={m.id}>
                              <td>
                                <div className="qm-text-bold">{m.chamado}</div>
                                <div className="qm-text-muted">
                                  Envio: {m.envio ? formatDateTimeBR(m.envio.enviadoEm) : '—'}
                                </div>
                              </td>
                              <td>
                                <div className="qm-text-bold">{m.atendente}</div>
                                <div className="qm-text-muted">{m.emailAtendente}</div>
                              </td>
                              <td>
                                <div className="qm-text-bold" style={{ fontSize: 12 }}>{formatDateBR(m.dataChamada)}</div>
                                <span className="qm-text-muted">{formatDurationDisplay(m.duration_seconds)}</span>
                              </td>
                              <td>
                                <span className="qm-text-muted">{m.monitor}</span>
                              </td>
                              <td>
                                <span className={`qm-score-tag ${m.notaFinal >= 90 ? 'excelente' : m.notaFinal >= 75 ? 'bom' : 'critico'}`}>
                                  {m.notaFinal} / 100
                                </span>
                              </td>
                              <td>
                                <span
                                  className={`qm-status-badge ${
                                    isSigned ? 'concluido' : m.status === 'Feedback Agendado' ? 'agendado' : 'pendente'
                                  }`}
                                >
                                  {isSigned ? 'Concluído / Assinado' : m.status}
                                </span>
                                {isSigned ? (
                                  <div style={{ fontSize: 11, color: 'var(--copom-emerald)', fontWeight: 700, marginTop: 3 }}>
                                    ✓ Assinado eletronicamente
                                  </div>
                                ) : (
                                  <div style={{ fontSize: 11, color: 'var(--copom-amber)', fontWeight: 600, marginTop: 3 }}>
                                    ⏳ Aguardando assinatura
                                  </div>
                                )}
                              </td>
                              <td>
                                {m.feedback ? (
                                  <div>
                                    <div className="qm-text-bold" style={{ fontSize: 12 }}>
                                      {formatDateBR(m.feedback.data)} às {m.feedback.horario}
                                    </div>
                                    <div className="qm-text-muted">{m.feedback.modalidade}</div>
                                  </div>
                                ) : (
                                  <span className="qm-text-muted">Não agendado</span>
                                )}
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadPdf(m)}
                                    className="qm-btn-pdf"
                                    title="Baixar Ficha de Monitoria em PDF Preenchida e Assinada"
                                  >
                                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    PDF
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setActiveResultModalId(m.id)}
                                    className="qm-btn-view"
                                  >
                                    {isSigned ? 'Visualizar Ficha' : 'Ver Avaliação & Assinar'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {filteredPublicList.length === 0 && (
                    <div className="qm-empty-box">
                      <div className="qm-empty-icon">
                        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <p className="qm-empty-title">Nenhuma monitoria encontrada</p>
                      <p className="qm-empty-desc">
                        {currentRole === 'atendente'
                          ? `Suas avaliações operacionais publicadas pelos monitores aparecerão aqui para ${attendantSelfName}.`
                          : 'Apenas avaliações já publicadas para ciência aparecem nesta listagem.'}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            )}
          </main>
        </div>
      </div>

      {/* =============================================================== */}
      {/* MODAL 1: GERENCIAMENTO E ENCAMINHAMENTO (Monitor)               */}
      {/* =============================================================== */}
      {activeModalItem && (
        <div className="qm-modal-backdrop" onClick={() => setActiveModalId(null)}>
          <div className="qm-modal-box" onClick={e => e.stopPropagation()}>
            <div className="qm-modal-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <h2 className="qm-modal-title">Chamado {activeModalItem.chamado}</h2>
                  <span
                    className={`qm-status-badge ${
                      activeModalItem.status === 'Concluído'
                        ? 'concluido'
                        : activeModalItem.status === 'Feedback Agendado'
                        ? 'agendado'
                        : 'pendente'
                    }`}
                  >
                    {activeModalItem.status}
                  </span>
                </div>
                <p className="qm-modal-sub">
                  Auditado em {formatDateBR(activeModalItem.dataChamada)} · Duração: {formatDurationDisplay(activeModalItem.duration_seconds)}
                </p>
              </div>
              <button
                type="button"
                className="qm-close-btn"
                onClick={() => setActiveModalId(null)}
                aria-label="Fechar janela"
              >
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="qm-modal-body">
              {/* Detalhes da Chamada e Nota */}
              <div className="qm-modal-section tinted">
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14, paddingBottom: 12, borderBottom: '1px solid var(--copom-border)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, flex: 1, fontSize: 12 }}>
                    <div>
                      <span className="qm-text-muted" style={{ display: 'block' }}>Atendente</span>
                      <strong className="qm-text-bold">{activeModalItem.atendente}</strong>
                    </div>
                    <div>
                      <span className="qm-text-muted" style={{ display: 'block' }}>Matrícula / ID</span>
                      <strong className="qm-text-bold">{activeModalItem.matricula || '190-PM'}</strong>
                    </div>
                    <div>
                      <span className="qm-text-muted" style={{ display: 'block' }}>Supervisor</span>
                      <strong className="qm-text-bold">{activeModalItem.monitor}</strong>
                    </div>
                  </div>
                  <div className="qm-modal-tile" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 14px', borderRadius: 12 }}>
                    <div style={{ textAlign: 'right' }}>
                      <span className="qm-text-muted" style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Nota Final</span>
                      <span className="qm-text-muted" style={{ fontSize: 11, fontWeight: 600 }}>{formatDecimalScore(activeModalItem.notaFinal)} / 10,0</span>
                    </div>
                    <span className={`qm-score-tag ${activeModalItem.notaFinal >= 90 ? 'excelente' : activeModalItem.notaFinal >= 75 ? 'bom' : 'critico'}`} style={{ fontSize: 16 }}>
                      {activeModalItem.notaFinal}
                    </span>
                  </div>
                </div>

                {/* Detalhes dos 4 Blocos */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8, marginTop: 14 }}>
                  {QUALITY_BLOCKS.map((b, idx) => {
                    let earned = 0, possible = 0;
                    b.items.forEach(item => {
                      if (activeModalItem.ratings?.[item.id] !== 'na') {
                        possible += item.points;
                        if (activeModalItem.ratings?.[item.id] === 'yes') earned += item.points;
                      }
                    });
                    return (
                      <div key={b.id} className="qm-modal-tile" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, fontSize: 12 }}>
                        <span className="qm-text-muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          Bloco {idx + 1}: {b.name.slice(0, 22)}...
                        </span>
                        <strong style={{ fontWeight: 700 }}>{earned}/{possible}</strong>
                      </div>
                    );
                  })}
                </div>

                {/* PDCA Registrado */}
                <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div>
                    <span className="qm-text-muted" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>
                      Pontos Fortes
                    </span>
                    <div className="qm-modal-text-box">{activeModalItem.strengths || activeModalItem.observacoes}</div>
                  </div>
                  <div>
                    <span className="qm-text-muted" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>
                      Não Conformidades / Oportunidades de Melhoria
                    </span>
                    <div className="qm-modal-text-box">{activeModalItem.improvements || 'Nenhum ponto registrado.'}</div>
                  </div>
                  <div>
                    <span className="qm-text-muted" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>
                      Ação Corretiva Acordada
                    </span>
                    <div className="qm-modal-text-box">{activeModalItem.corrective_action || 'Manutenção na escala.'}</div>
                  </div>
                </div>
              </div>

              {/* Seção 2: Encaminhamento de Relatório */}
              <div className="qm-modal-section">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Encaminhar Ficha de Avaliação</h3>
                    <p className="qm-text-muted" style={{ fontSize: 11, margin: '2px 0 0 0' }}>
                      Disponibiliza o documento na aba Monitorias para ciência e assinatura do atendente.
                    </p>
                  </div>
                  {activeModalItem.encaminhada && (
                    <span className="qm-status-badge concluido">Publicada</span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 12 }}>
                  <label className="qm-modal-check-tile">
                    <input
                      type="checkbox"
                      checked={channelEmail}
                      onChange={e => setChannelEmail(e.target.checked)}
                      className="qm-modal-checkbox"
                    />
                    <div className="qm-modal-check-info">
                      <strong className="qm-modal-check-title">E-mail Institucional</strong>
                      <span className="qm-text-muted" style={{ fontSize: 11 }}>{activeModalItem.emailAtendente}</span>
                    </div>
                  </label>

                  <label className="qm-modal-check-tile">
                    <input
                      type="checkbox"
                      checked={channelDash}
                      onChange={e => setChannelDash(e.target.checked)}
                      className="qm-modal-checkbox"
                    />
                    <div className="qm-modal-check-info">
                      <strong className="qm-modal-check-title">Dashboard do Atendente</strong>
                      <span className="qm-text-muted" style={{ fontSize: 11 }}>Disponibiliza para assinatura digital</span>
                    </div>
                  </label>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <p style={{ fontSize: 11, color: activeModalItem.encaminhada ? 'var(--copom-emerald)' : 'var(--copom-amber)', fontWeight: 600, margin: 0 }}>
                    {activeModalItem.encaminhada && activeModalItem.envio
                      ? `Publicado em ${formatDateTimeBR(activeModalItem.envio.enviadoEm)}.`
                      : 'Ainda não publicado (invisível para o atendente).'}
                  </p>
                  <button
                    type="button"
                    onClick={handleSendReport}
                    className="qm-btn-primary"
                    style={{ width: 'auto', padding: '8px 16px', backgroundColor: '#1d4ed8' }}
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    {activeModalItem.encaminhada ? 'Reenviar / Notificar' : 'Publicar Ficha para Ciência'}
                  </button>
                </div>
              </div>

              {/* Seção 3: Agendamento de Feedback */}
              <form onSubmit={handleSaveSchedule} className="qm-modal-section">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Agendamento de Sessão de Feedback</h3>
                    <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0 0' }}>
                      Defina a data, horário e modalidade para a devolutiva presencial ou online.
                    </p>
                  </div>
                  <div>
                    <select
                      value={schedStatus}
                      onChange={e => handleDirectStatusChange(e.target.value)}
                      className="qm-select"
                      style={{ fontSize: 11, padding: '4px 8px', width: 'auto' }}
                    >
                      <option value="Pendente de Leitura">Pendente de Leitura</option>
                      <option value="Feedback Agendado">Feedback Agendado</option>
                      <option value="Concluído">Concluído</option>
                    </select>
                  </div>
                </div>

                <div className="qm-form-grid-3" style={{ marginBottom: 12 }}>
                  <div className="qm-field">
                    <label className="qm-label">Data do Feedback</label>
                    <input
                      type="date"
                      value={schedDate}
                      onChange={e => setSchedDate(e.target.value)}
                      className="qm-input"
                    />
                  </div>
                  <div className="qm-field">
                    <label className="qm-label">Horário</label>
                    <input
                      type="time"
                      value={schedTime}
                      onChange={e => setSchedTime(e.target.value)}
                      className="qm-input"
                    />
                  </div>
                  <div className="qm-field">
                    <label className="qm-label">Modalidade</label>
                    <select
                      value={schedModality}
                      onChange={e => setSchedModality(e.target.value)}
                      className="qm-select"
                    >
                      <option value="Presencial">Presencial</option>
                      <option value="Online">Online</option>
                    </select>
                  </div>
                </div>

                <div className="qm-field" style={{ marginBottom: 12 }}>
                  <label className="qm-label">Local / Sala de Feedback</label>
                  <input
                    type="text"
                    placeholder="Ex: Sala de Supervisão 02 — COPOM"
                    value={schedLocation}
                    onChange={e => setSchedLocation(e.target.value)}
                    className="qm-input"
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className="qm-btn-primary" style={{ width: 'auto', padding: '8px 16px' }}>
                    Salvar Agendamento
                  </button>
                </div>
              </form>
            </div>

            {/* Rodapé do Modal 1 */}
            <div className="qm-modal-footer">
              <button
                type="button"
                onClick={() => handleDownloadPdf(activeModalItem)}
                className="qm-btn-pdf"
                style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px' }}
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Baixar Ficha em PDF (Oficial)
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  type="button"
                  onClick={handleToggleConclude}
                  className="qm-btn-primary"
                  style={{
                    width: 'auto',
                    backgroundColor: activeModalItem.status === 'Concluído' ? '#d97706' : '#059669'
                  }}
                >
                  {activeModalItem.status === 'Concluído' ? 'Reabrir Monitoria' : 'Marcar como Concluído'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModalId(null)}
                  className="qm-btn-secondary"
                  style={{ width: 'auto' }}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =============================================================== */}
      {/* MODAL 2: RESULTADO DA MONITORIA E ASSINATURA DIGITAL (Atendente)*/}
      {/* =============================================================== */}
      {activeResultModalItem && (
        <div className="qm-modal-backdrop" onClick={() => setActiveResultModalId(null)}>
          <div className="qm-modal-box" style={{ maxWidth: 880 }} onClick={e => e.stopPropagation()}>
            <div className="qm-modal-header dark">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#93c5fd' }}>
                    Ficha de Monitoria de Qualidade — COPOM 190
                  </span>
                  <span
                    className={`qm-status-badge ${
                      activeResultModalItem.cienciaEm ? 'concluido' : 'pendente'
                    }`}
                  >
                    {activeResultModalItem.cienciaEm ? 'Assinado Digitalmente' : 'Aguardando Assinatura'}
                  </span>
                </div>
                <h2 className="qm-modal-title" style={{ marginTop: 4 }}>
                  Chamado CAD {activeResultModalItem.chamado}
                </h2>
                <p className="qm-modal-sub">
                  Atendimento em {formatDateBR(activeResultModalItem.dataChamada)} · Duração: {formatDurationDisplay(activeResultModalItem.duration_seconds)} · Auditor: {activeResultModalItem.monitor}
                </p>
              </div>
              <button
                type="button"
                className="qm-close-btn"
                onClick={() => setActiveResultModalId(null)}
                aria-label="Fechar janela"
              >
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="qm-modal-body">
              {/* Resumo da Nota e Diagnóstico */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
                <div className="qm-modal-section tinted" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12 }}>
                  <div>
                    <span className="qm-text-muted" style={{ display: 'block' }}>Operador Avaliado</span>
                    <strong className="qm-text-bold" style={{ fontSize: 14 }}>{activeResultModalItem.atendente}</strong>
                    <span className="qm-text-muted" style={{ display: 'block' }}>Matrícula: {activeResultModalItem.matricula || '190-PM'}</span>
                  </div>
                  <div>
                    <span className="qm-text-muted" style={{ display: 'block' }}>Supervisor Auditor</span>
                    <strong className="qm-text-bold">{activeResultModalItem.monitor}</strong>
                  </div>
                  <div>
                    <span className="qm-text-muted" style={{ display: 'block' }}>Turno / Período</span>
                    <span className="qm-text-bold">{activeResultModalItem.shift_period === 'weekend' ? 'Final de Semana / Pico' : 'Dia Útil'}</span>
                  </div>
                  <div>
                    <span className="qm-text-muted" style={{ display: 'block' }}>Tipo de Auditoria</span>
                    <span className="qm-text-bold">{activeResultModalItem.audit_type === 'live' ? 'Tempo Real (Escuta Ativa)' : 'Áudio Retrospectivo'}</span>
                  </div>
                </div>

                <div className="qm-modal-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                  <span className="qm-text-muted" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                    Pontuação Final Obtida
                  </span>
                  <div style={{ marginTop: 6, display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: 40, fontWeight: 800, color: 'var(--copom-dark)', lineHeight: 1 }}>
                      {activeResultModalItem.notaFinal}
                    </span>
                    <span className="qm-text-muted" style={{ fontSize: 15, fontWeight: 600 }}>/ 100</span>
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="qm-circle-decimal" style={{ margin: 0, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>
                      {formatDecimalScore(activeResultModalItem.notaFinal)} / 10,0
                    </span>
                    <span className={`qm-score-tag ${activeResultModalItem.notaFinal >= 90 ? 'excelente' : activeResultModalItem.notaFinal >= 75 ? 'bom' : 'critico'}`}>
                      {activeResultModalItem.notaFinal >= 90 ? 'Excelente' : activeResultModalItem.notaFinal >= 75 ? 'Adequado' : 'Abaixo do Padrão'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Detalhamento dos 4 Blocos Oficiais */}
              <div className="qm-modal-section">
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px 0' }}>Detalhamento Técnico por Bloco de Avaliação</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {QUALITY_BLOCKS.map((b, bIdx) => (
                    <div key={b.id} style={{ border: '1px solid var(--copom-border)', borderRadius: 10, padding: 12, backgroundColor: 'var(--copom-card-tint)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, borderBottom: '1px solid var(--copom-border)', paddingBottom: 6 }}>
                        <strong style={{ fontSize: 13, color: 'var(--copom-blue)' }}>Bloco {bIdx + 1}: {b.name}</strong>
                        <span style={{ fontSize: 11, fontWeight: 700 }}>Máx: {b.max} pts</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 8 }}>
                        {b.items.map(item => {
                          const val = activeResultModalItem.ratings?.[item.id] || 'yes';
                          return (
                            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, padding: '4px 8px', borderRadius: 6, background: 'var(--copom-card)' }}>
                              <span style={{ color: 'var(--copom-dark)' }}>{item.id} {item.label}</span>
                              <span
                                style={{
                                  fontWeight: 700,
                                  color: val === 'yes' ? 'var(--copom-emerald)' : val === 'no' ? 'var(--copom-red)' : 'var(--copom-muted)',
                                  backgroundColor: val === 'yes' ? 'rgba(13, 148, 136, 0.12)' : val === 'no' ? 'rgba(220, 38, 38, 0.12)' : 'rgba(100, 116, 139, 0.12)',
                                  padding: '2px 8px',
                                  borderRadius: 6
                                }}
                              >
                                {val === 'yes' ? `Sim (${item.points})` : val === 'no' ? 'Não (0)' : 'N/A'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* PDCA e Feedback */}
              <div className="qm-modal-section tinted">
                <h3 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 10px 0' }}>Diagnóstico Qualitativo e Providência Gerencial</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
                  <div>
                    <strong style={{ color: 'var(--copom-dark)', display: 'block' }}>Pontos Fortes:</strong>
                    <div className="qm-modal-text-box">{activeResultModalItem.strengths || activeResultModalItem.observacoes}</div>
                  </div>
                  <div>
                    <strong style={{ color: 'var(--copom-dark)', display: 'block' }}>Oportunidades de Melhoria:</strong>
                    <div className="qm-modal-text-box">{activeResultModalItem.improvements || 'Procedimentos em conformidade.'}</div>
                  </div>
                  <div>
                    <strong style={{ color: 'var(--copom-dark)', display: 'block' }}>Ação Corretiva Acordada:</strong>
                    <div className="qm-modal-text-box">{activeResultModalItem.corrective_action || 'Manutenção na escala.'}</div>
                  </div>
                </div>
              </div>

              {/* ============================================================= */}
              {/* SISTEMA INTEGRADO DE ASSINATURA DIGITAL DO ATENDENTE          */}
              {/* ============================================================= */}
              <div className="qm-modal-section" style={{ border: '2px solid var(--copom-blue)', borderRadius: 12, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: 'var(--copom-blue)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: 'var(--copom-blue)' }}>
                      Assinatura Digital de Ciência do Operador
                    </h3>
                  </div>
                  {activeResultModalItem.cienciaEm ? (
                    <span className="qm-badge emerald">Documento Assinado</span>
                  ) : (
                    <span className="qm-badge amber">Pendente de Assinatura</span>
                  )}
                </div>

                {activeResultModalItem.cienciaEm ? (
                  /* SE JÁ ESTIVER ASSINADA */
                  <div className="qm-signed-box">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                      {activeResultModalItem.operator_signature_image && (
                        <div style={{ background: '#ffffff', padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }}>
                          <img
                            src={activeResultModalItem.operator_signature_image}
                            alt="Assinatura Digital do Atendente"
                            style={{ height: 44, width: 'auto', display: 'block' }}
                          />
                        </div>
                      )}
                      <div>
                        <strong style={{ fontSize: 14, color: 'var(--copom-emerald)', display: 'block' }}>
                          ✓ Ciência Confirmada Eletronicamente
                        </strong>
                        <span style={{ fontSize: 12, color: 'var(--copom-dark)', display: 'block' }}>
                          Assinado por: <strong>{activeResultModalItem.operator_signature_name || activeResultModalItem.atendente}</strong>
                        </span>
                        <span className="qm-text-muted" style={{ fontSize: 11 }}>
                          Data/Hora do Registro: {formatDateTimeBR(activeResultModalItem.cienciaEm)}
                        </span>
                        <small style={{ display: 'block', fontSize: 10, color: '#64748b', marginTop: 4 }}>
                          🔒 Certificado digital emitido com a identidade autenticada da sessão do operador.
                        </small>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* SE ESTIVER PENDENTE DE ASSINATURA */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <p style={{ fontSize: 12, color: 'var(--copom-dark)', margin: 0, background: 'var(--copom-card-tint)', padding: 10, borderRadius: 8, border: '1px solid var(--copom-border)' }}>
                      <strong>Declaração Legal de Ciência:</strong> {QUALITY_ACKNOWLEDGE}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                      <span className="qm-text-muted">Operador autenticado para assinatura:</span>
                      <strong style={{ color: 'var(--copom-blue)' }}>{attendantSelfName}</strong>
                    </div>

                    {/* Canvas Interativo de Assinatura */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>Desenhe sua assinatura no quadro abaixo (ou use a rubrica automática):</span>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            type="button"
                            onClick={generateAutoRubric}
                            className="qm-btn-secondary"
                            style={{ padding: '4px 10px', fontSize: 11 }}
                          >
                            Rubrica Automática
                          </button>
                          <button
                            type="button"
                            onClick={clearSignature}
                            className="qm-btn-secondary"
                            style={{ padding: '4px 10px', fontSize: 11 }}
                          >
                            Limpar
                          </button>
                        </div>
                      </div>

                      <div className="qm-canvas-wrap">
                        <canvas
                          ref={signatureCanvasRef}
                          width={400}
                          height={100}
                          className="qm-signature-canvas"
                          onMouseDown={startSignatureDrawing}
                          onMouseMove={drawSignature}
                          onMouseUp={stopSignatureDrawing}
                          onMouseLeave={stopSignatureDrawing}
                          onTouchStart={startSignatureDrawing}
                          onTouchMove={drawSignature}
                          onTouchEnd={stopSignatureDrawing}
                        />
                        <div className="qm-canvas-guide">Assine aqui com mouse, caneta ou toque</div>
                      </div>
                    </div>

                    <label className="qm-agree-label">
                      <input
                        type="checkbox"
                        checked={signatureAgreed}
                        onChange={e => setSignatureAgreed(e.target.checked)}
                        className="qm-agree-checkbox"
                      />
                      <span className="qm-agree-text">
                        Confirmo a minha identidade como <u>{attendantSelfName}</u> e declaro ciência da nota e das orientações técnicas desta monitoria.
                      </span>
                    </label>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                      <button
                        type="button"
                        onClick={handleConfirmSignature}
                        disabled={!signatureAgreed}
                        className="qm-btn-primary"
                        style={{
                          width: 'auto',
                          backgroundColor: signatureAgreed ? '#059669' : '#94a3b8',
                          cursor: signatureAgreed ? 'pointer' : 'not-allowed',
                          padding: '10px 20px',
                          fontSize: 13
                        }}
                      >
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Confirmar e Assinar Digitalmente
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Rodapé do Modal 2 */}
            <div className="qm-modal-footer">
              <button
                type="button"
                onClick={() => handleDownloadPdf(activeResultModalItem)}
                className="qm-btn-pdf"
                style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px' }}
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Baixar Ficha em PDF (Preenchida & Assinada)
              </button>

              <button
                type="button"
                onClick={() => setActiveResultModalId(null)}
                className="qm-btn-secondary"
                style={{ width: 'auto' }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =============================================================== */}
      {/* SISTEMA DE TOASTS FLUTUANTES                                    */}
      {/* =============================================================== */}
      <div className="qm-toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`qm-toast ${t.type}`}>
            <span className="qm-toast-dot" />
            <div className="qm-toast-msg">
              <p style={{ margin: 0 }}>{t.message}</p>
              {t.action && (
                <button
                  type="button"
                  onClick={() => {
                    t.action.onClick();
                    removeToast(t.id);
                  }}
                  className="qm-toast-action"
                >
                  {t.action.label}
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="qm-toast-close"
              aria-label="Fechar"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
