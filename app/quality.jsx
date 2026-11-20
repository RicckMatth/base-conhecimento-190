'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'copom_190_monitorias_v6';

const CRITERIA_DEF = [
  {
    id: 'cordialidade',
    label: 'Cordialidade e Postura',
    description: 'Tom de voz adequado, respeito, empatia e clareza na abertura e condução da chamada.',
    max: 20,
    defaultScore: 18
  },
  {
    id: 'agilidade',
    label: 'Agilidade na Coleta de Dados',
    description: 'Rapidez e objetividade na identificação da natureza da ocorrência e avaliação de risco imediato.',
    max: 20,
    defaultScore: 18
  },
  {
    id: 'endereco',
    label: 'Assertividade no Endereço',
    description: 'Confirmação exata de logradouro, número, bairro, município e ponto de referência.',
    max: 20,
    defaultScore: 18
  },
  {
    id: 'crise',
    label: 'Gerenciamento de Crise e Calma',
    description: 'Controle emocional, postura firme e condução segura de solicitantes em situação de estresse.',
    max: 20,
    defaultScore: 18
  },
  {
    id: 'pop',
    label: 'Procedimentos Operacionais Padrão',
    description: 'Aderência integral ao protocolo POP 190 de classificação de prioridade, triagem e despacho.',
    max: 20,
    defaultScore: 18
  }
];

const DEFAULT_ATTENDANTS = [];

function getSeedData() {
  return [];
}

function getPerformanceMeta(score, isDark = false) {
  if (score >= 90) {
    return {
      label: 'Excelente',
      stroke: isDark ? '#14b8a6' : '#0d9488',
      barColor: isDark ? '#14b8a6' : '#0d9488',
      badgeClass: 'excelente'
    };
  }
  if (score >= 75) {
    return {
      label: 'Bom',
      stroke: isDark ? '#69d0e0' : '#096d85',
      barColor: isDark ? '#69d0e0' : '#096d85',
      badgeClass: 'bom'
    };
  }
  if (score >= 60) {
    return {
      label: 'Atenção',
      stroke: isDark ? '#f59e0b' : '#d97706',
      barColor: isDark ? '#f59e0b' : '#d97706',
      badgeClass: 'atencao'
    };
  }
  return {
    label: 'Crítico',
    stroke: isDark ? '#f87171' : '#dc2626',
    barColor: isDark ? '#f87171' : '#dc2626',
    badgeClass: 'critico'
  };
}

function formatDecimalScore(score) {
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
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function getCurrentLocalDateTimeInput() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export default function Quality({ user, activeProfile = null, dark = false, toggleTheme = null }) {
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

  // Modais e gaveta
  const [activeModalId, setActiveModalId] = useState(null); // Modal de Gerenciamento
  const [activeResultModalId, setActiveResultModalId] = useState(null); // Modal de Ver Resultado
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Estado do formulário de cadastro
  const [formChamado, setFormChamado] = useState('');
  const [formDataChamada, setFormDataChamada] = useState(getCurrentLocalDateTimeInput());
  const [formMonitor, setFormMonitor] = useState(user?.name || user?.username || '');
  const [formSelectedAttendantKey, setFormSelectedAttendantKey] = useState('');
  const [formAtendente, setFormAtendente] = useState('');
  const [formEmailAtendente, setFormEmailAtendente] = useState('');
  const [formObservacoes, setFormObservacoes] = useState('');
  const [formScores, setFormScores] = useState({
    cordialidade: 18,
    agilidade: 18,
    endereco: 18,
    crise: 18,
    pop: 18
  });

  // Modal 1: Agendamento & Envio
  const [schedDate, setSchedDate] = useState('');
  const [schedTime, setSchedTime] = useState('');
  const [schedModality, setSchedModality] = useState('Presencial');
  const [schedLocation, setSchedLocation] = useState('');
  const [schedStatus, setSchedStatus] = useState('Pendente de Leitura');
  const [channelEmail, setChannelEmail] = useState(true);
  const [channelDash, setChannelDash] = useState(true);

  // Exibição e Impressão
  const [printReportItem, setPrintReportItem] = useState(null);

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

  // 1. Carregar monitorias salvas (inicia zerado)
  useEffect(() => {
    try {
      // Limpa dados de demonstrações anteriores
      localStorage.removeItem('copom_190_monitorias');
      localStorage.removeItem('copom_190_monitorias_v1');
      localStorage.removeItem('copom_190_monitorias_v2');
      localStorage.removeItem('copom_190_monitorias_v3');
      localStorage.removeItem('copom_190_monitorias_v4');
      localStorage.removeItem('copom_190_monitorias_v5');

      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMonitorias(
            parsed.map(item => ({
              ...item,
              encaminhada: typeof item.encaminhada === 'boolean' ? item.encaminhada : Boolean(item.envio),
              cienciaEm: item.cienciaEm || null
            }))
          );
          return;
        }
      }
    } catch (e) {
      console.warn('Erro ao ler localStorage de qualidade:', e);
    }
    setMonitorias([]);
  }, []);

  // 2. Carregar atendentes cadastrados no banco de dados
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
      })
      .catch(() => {
        // Se falhar ou não tiver permissão, mantemos atendentes padrão
      });
    return () => {
      alive = false;
    };
  }, []);

  // Lista consolidada de atendentes conhecidos
  const allAttendants = useMemo(() => {
    const map = new Map();
    // Atendentes padrão
    DEFAULT_ATTENDANTS.forEach(a => map.set(a.nome.toLowerCase(), a));
    // Atendentes do banco de dados (têm prioridade)
    registeredAttendants.forEach(a => map.set(a.nome.toLowerCase(), a));
    // Atendentes das monitorias existentes
    monitorias.forEach(m => {
      if (m.atendente && !map.has(m.atendente.toLowerCase())) {
        map.set(m.atendente.toLowerCase(), {
          id: 'mon-' + m.atendente,
          nome: m.atendente,
          email: m.emailAtendente || `${m.atendente.toLowerCase().replace(/\s+/g, '.')}@copom.gov.br`,
          username: m.atendente.toLowerCase().replace(/\s+/g, '.')
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [registeredAttendants, monitorias]);

  // Persistir monitorias
  const persistMonitorias = useCallback(
    updated => {
      setMonitorias(updated);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error('Erro ao salvar no localStorage:', err);
      }
    },
    []
  );

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

  // Sincronizar atendente do formulário de cadastro
  function handleSelectAttendant(attKey) {
    setFormSelectedAttendantKey(attKey);
    if (!attKey || attKey === 'custom') {
      return;
    }
    const found = allAttendants.find(a => a.id === attKey || a.nome === attKey);
    if (found) {
      setFormAtendente(found.nome);
      setFormEmailAtendente(found.email);
    }
  }

  // Pontuação do formulário em tempo real
  const formTotalScore = useMemo(() => {
    return CRITERIA_DEF.reduce((acc, c) => acc + (Number(formScores[c.id]) || 0), 0);
  }, [formScores]);

  const formMeta = useMemo(() => getPerformanceMeta(formTotalScore, dark), [formTotalScore, dark]);

  function handleScoreChange(id, value) {
    const val = Math.max(0, Math.min(20, parseInt(value, 10) || 0));
    setFormScores(prev => ({ ...prev, [id]: val }));
  }

  function resetCadastroForm(notify = false) {
    setFormChamado('');
    setFormDataChamada(getCurrentLocalDateTimeInput());
    setFormSelectedAttendantKey('');
    setFormAtendente('');
    setFormEmailAtendente('');
    setFormObservacoes('');
    setFormScores({ cordialidade: 18, agilidade: 18, endereco: 18, crise: 18, pop: 18 });
    if (notify) showToast('Formulário limpo e pronto para novo registro.', 'info');
  }

  function handleSaveMonitoria(e) {
    e.preventDefault();
    const chamado = formChamado.trim();
    const atendente = formAtendente.trim();
    const email = formEmailAtendente.trim();
    const monitor = formMonitor.trim();

    if (!chamado || !formDataChamada || !atendente || !email || !monitor) {
      showToast('Preencha todos os campos obrigatórios de Dados do Atendimento.', 'error');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showToast('Informe um e-mail institucional válido para o atendente.', 'error');
      return;
    }

    const nova = {
      id: 'mon-' + Date.now(),
      chamado,
      atendente,
      emailAtendente: email,
      dataChamada: formDataChamada,
      monitor,
      scores: { ...formScores },
      notaFinal: formTotalScore,
      observacoes: formObservacoes.trim() || 'Sem observações adicionais registradas.',
      status: 'Pendente de Leitura',
      encaminhada: false,
      envio: null,
      feedback: null,
      cienciaEm: null,
      criadoEm: new Date().toISOString()
    };

    const next = [nova, ...monitorias];
    persistMonitorias(next);
    resetCadastroForm(false);

    showToast(
      `Monitoria ${chamado} salva com nota ${formTotalScore}/100 para ${atendente}.`,
      'success',
      {
        label: 'Ir para Encaminhamento →',
        onClick: () => setCurrentView('feedback')
      }
    );
  }

  // Ações do Modal 1 (Monitor)
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
          envio: { enviadoEm: new Date().toISOString(), canais }
        };
      }
      return m;
    });

    persistMonitorias(updated);
    showToast(`Relatório do chamado ${activeModalItem.chamado} encaminhado e publicado na aba Monitorias.`, 'success');
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

  // Ação do Modal 2: Confirmar Ciência
  function handleConfirmCiencia() {
    if (!activeResultModalItem) return;
    const updated = monitorias.map(m => {
      if (m.id === activeResultModalItem.id) {
        return {
          ...m,
          cienciaEm: new Date().toISOString(),
          status: m.status === 'Pendente de Leitura' ? (m.feedback ? 'Feedback Agendado' : 'Concluído') : m.status
        };
      }
      return m;
    });
    persistMonitorias(updated);
    showToast(`Ciência registrada com sucesso para o chamado ${activeResultModalItem.chamado}.`, 'success');
  }

  // Impressão Institucional
  function triggerPrint(item) {
    if (!item) return;
    setPrintReportItem(item);
    setTimeout(() => {
      window.print();
    }, 150);
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

  // Filtros Aba 3 (Monitorias Encaminhadas)
  const forwardedBaseList = useMemo(() => {
    return monitorias.filter(m => {
      if (!m.encaminhada) return false;
      // No perfil de Atendente (ou visão de atendente): estritamente e somente as DELE
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
      // Modo supervisor/monitor: pode filtrar por atendente ou visualizar todos
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

  return (
    <div className="quality-module">
      {/* Shell Principal */}
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
              <span>Monitorias</span>
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
                      showToast('Perfil alternado para Atendente (visualização das monitorias).', 'info');
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
                  🎧 Atendente (Consulta & Ciência)
                </div>
                <small className="qm-text-muted" style={{ display: 'block', marginTop: 4, fontSize: 10 }}>
                  Cadastramento e envio restritos
                </small>
              </div>
            )}

            {/* Identificação Fixa do Atendente (modo atendente restrito às suas avaliações) */}
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
                  🔒 Visualização restrita às suas avaliações
                </small>
              </div>
            )}

            {/* Alternador de Tema na Sidebar */}
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

        {/* Coluna de Conteúdo Principal */}
        <div className="qm-content-wrap">
          {/* Barra Mobile */}
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
                  {currentRole === 'monitor' ? 'Monitoria de Qualidade' : 'Visão do Atendente'}
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
              {currentRole === 'monitor' && countPendente > 0 && (
                <span className="qm-section-badge amber">{countPendente} pendentes</span>
              )}
            </div>
          </header>

          <main className="qm-main">
            {/* =============================================================== */}
            {/* ABA 1: CADASTRAMENTO DE MONITORIA                               */}
            {/* =============================================================== */}
            {currentView === 'cadastro' && currentRole === 'monitor' && (
              <section key="cadastro" className="qm-view-enter">
                <div className="qm-section-header">
                  <div>
                    <div className="qm-section-title-wrap">
                      <h1 className="qm-section-title">Cadastramento de Monitoria</h1>
                      <span className="qm-section-badge blue">Acesso: Monitor / Supervisor</span>
                    </div>
                    <p className="qm-section-desc">
                      Avaliação técnica de chamadas de emergência 190 com cálculo e diagnóstico em tempo real.
                    </p>
                  </div>
                  <div className="qm-header-actions">
                    {toggleTheme && (
                      <button
                        type="button"
                        onClick={toggleTheme}
                        className="qm-theme-btn"
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
                    <div className="qm-section-badge">
                      <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--copom-blue)' }} />
                      Escala: 0 a 100 pontos (0,0 a 10,0)
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSaveMonitoria} className="qm-grid-cadastro">
                  {/* Coluna Esquerda: Formulário de Avaliação */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* Bloco 1: Dados do Atendimento */}
                    <div className="qm-card">
                      <div className="qm-card-header">
                        <div className="qm-card-icon">
                          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </div>
                        <div>
                          <h2 className="qm-card-title">Dados do Atendimento</h2>
                          <p className="qm-card-desc">
                            Identificação do chamado, seleção do atendente cadastrado no sistema e monitor responsável.
                          </p>
                        </div>
                      </div>

                      <div className="qm-form-grid-3">
                        <div className="qm-field">
                          <label className="qm-label">
                            Número do Chamado / CAD <span className="qm-req">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: 190-2026-085104"
                            value={formChamado}
                            onChange={e => setFormChamado(e.target.value)}
                            className="qm-input"
                          />
                        </div>

                        <div className="qm-field">
                          <label className="qm-label">
                            Data e Hora da Chamada <span className="qm-req">*</span>
                          </label>
                          <input
                            type="datetime-local"
                            required
                            value={formDataChamada}
                            onChange={e => setFormDataChamada(e.target.value)}
                            className="qm-input"
                          />
                        </div>

                        <div className="qm-field">
                          <label className="qm-label">
                            Nome do Monitor / Supervisor <span className="qm-req">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: Sgt. Supervisor"
                            value={formMonitor}
                            onChange={e => setFormMonitor(e.target.value)}
                            className="qm-input"
                          />
                        </div>

                        {/* SELETOR INTELIGENTE DE ATENDENTE CADASTRADO NO SISTEMA */}
                        <div className="qm-field col-span-2">
                          <label className="qm-label">
                            Atendente Cadastrado no Sistema <span className="qm-req">*</span>
                          </label>
                          <select
                            value={formSelectedAttendantKey}
                            onChange={e => handleSelectAttendant(e.target.value)}
                            className="qm-select"
                          >
                            <option value="">-- Selecione um atendente cadastrado na base --</option>
                            {allAttendants.map(att => (
                              <option key={att.id || att.nome} value={att.id || att.nome}>
                                {att.nome} {att.fromDb ? '(Usuário do Sistema)' : ''} — {att.email}
                              </option>
                            ))}
                            <option value="custom">Outro (digitação manual)...</option>
                          </select>
                        </div>

                        <div className="qm-field">
                          <label className="qm-label">
                            Nome do Atendente <span className="qm-req">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Nome completo do atendente"
                            value={formAtendente}
                            onChange={e => {
                              setFormAtendente(e.target.value);
                              setFormSelectedAttendantKey('custom');
                            }}
                            className="qm-input"
                          />
                        </div>

                        <div className="qm-field col-span-2">
                          <label className="qm-label">
                            E-mail Institucional do Atendente <span className="qm-req">*</span>
                          </label>
                          <input
                            type="email"
                            required
                            placeholder="atendente@copom.gov.br"
                            value={formEmailAtendente}
                            onChange={e => {
                              setFormEmailAtendente(e.target.value);
                              setFormSelectedAttendantKey('custom');
                            }}
                            className="qm-input"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Bloco 2: Critérios Específicos 190 */}
                    <div className="qm-card">
                      <div className="qm-card-header">
                        <div className="qm-card-icon">
                          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <h2 className="qm-card-title">Critérios Operacionais 190 (POP)</h2>
                          <p className="qm-card-desc">
                            Atribua de 0 a 20 pontos em cada critério operacional (total de 100 pontos).
                          </p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {CRITERIA_DEF.map((c, index) => {
                          const val = formScores[c.id] ?? 0;
                          return (
                            <div key={c.id} className="qm-criterion-item">
                              <div className="qm-criterion-header">
                                <div>
                                  <label className="qm-criterion-label">
                                    {index + 1}. {c.label}
                                  </label>
                                  <p className="qm-criterion-desc">{c.description}</p>
                                </div>
                                <div className="qm-criterion-score-input">
                                  <input
                                    type="number"
                                    min="0"
                                    max={c.max}
                                    value={val}
                                    onChange={e => handleScoreChange(c.id, e.target.value)}
                                    className="qm-num-input"
                                    aria-label={`Pontuação de ${c.label}`}
                                  />
                                  <span className="qm-max-label">/ {c.max}</span>
                                </div>
                              </div>

                              <div className="qm-slider-row">
                                <input
                                  type="range"
                                  min="0"
                                  max={c.max}
                                  value={val}
                                  onChange={e => handleScoreChange(c.id, e.target.value)}
                                  className="qm-score-slider"
                                />
                                <div className="qm-quick-btns">
                                  {[0, 5, 10, 15, 20].map(quickVal => (
                                    <button
                                      key={quickVal}
                                      type="button"
                                      onClick={() => handleScoreChange(c.id, quickVal)}
                                      className={`qm-quick-btn ${val === quickVal ? 'active' : ''}`}
                                    >
                                      {quickVal}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Bloco 3: Observações e Pontos de Melhoria */}
                    <div className="qm-card">
                      <div className="qm-card-header">
                        <div className="qm-card-icon">
                          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </div>
                        <div>
                          <h2 className="qm-card-title">Observações e Pontos de Melhoria</h2>
                          <p className="qm-card-desc">
                            Orientações técnicas, pontos fortes e recomendações para o feedback com o atendente.
                          </p>
                        </div>
                      </div>
                      <textarea
                        rows={4}
                        placeholder="Descreva os pontos fortes observados e as oportunidades específicas de melhoria operacional..."
                        value={formObservacoes}
                        onChange={e => setFormObservacoes(e.target.value)}
                        className="qm-textarea"
                      />
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

                      {/* Barras de progresso por critério */}
                      <div className="qm-breakdown-list">
                        {CRITERIA_DEF.map(c => {
                          const val = formScores[c.id] ?? 0;
                          const pct = Math.round((val / c.max) * 100);
                          const barCol = val >= 16 ? (dark ? '#14b8a6' : '#0d9488') : val >= 12 ? (dark ? '#69d0e0' : '#096d85') : val >= 8 ? (dark ? '#f59e0b' : '#d97706') : (dark ? '#f87171' : '#dc2626');
                          return (
                            <div key={c.id} className="qm-breakdown-row">
                              <div className="qm-breakdown-labels">
                                <span className="qm-breakdown-name">{c.label}</span>
                                <span className="qm-breakdown-val">{val}/{c.max}</span>
                              </div>
                              <div className="qm-progress-bar">
                                <div
                                  className="qm-progress-fill"
                                  style={{ width: `${pct}%`, backgroundColor: barCol }}
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
                          Salvar Monitoria
                        </button>
                        <button
                          type="button"
                          onClick={() => resetCadastroForm(true)}
                          className="qm-btn-secondary"
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
                      <h1 className="qm-section-title">Encaminhamento e Feedback</h1>
                      <span className="qm-section-badge blue">Acesso: Monitor / Supervisor</span>
                    </div>
                    <p className="qm-section-desc">
                      Gerencie o envio de notas aos atendentes, agende as sessões de retorno e acompanhe os status.
                    </p>
                  </div>
                  <div className="qm-header-actions">
                    {toggleTheme && (
                      <button
                        type="button"
                        onClick={toggleTheme}
                        className="qm-theme-btn"
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
                      <span className="qm-kpi-label">Concluído</span>
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
                          <th>Chamado</th>
                          <th>Atendente</th>
                          <th>Data da Chamada</th>
                          <th>Monitor</th>
                          <th>Nota Final</th>
                          <th>Status</th>
                          <th>Feedback Agendado</th>
                          <th style={{ textAlign: 'right' }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredFeedbackList.map(m => {
                          const meta = getPerformanceMeta(m.notaFinal);
                          const isSent = m.encaminhada;
                          return (
                            <tr key={m.id}>
                              <td>
                                <div className="qm-text-bold">{m.chamado}</div>
                                {isSent ? (
                                  <span style={{ fontSize: 11, color: 'var(--copom-emerald)', fontWeight: 600 }}>Nota encaminhada</span>
                                ) : (
                                  <span style={{ fontSize: 11, color: 'var(--copom-amber)', fontWeight: 600 }}>Aguardando envio</span>
                                )}
                              </td>
                              <td>
                                <div className="qm-text-bold">{m.atendente}</div>
                                <div className="qm-text-muted">{m.emailAtendente}</div>
                              </td>
                              <td>
                                <span className="qm-text-muted">{formatDateTimeBR(m.dataChamada)}</span>
                              </td>
                              <td>
                                <span className="qm-text-muted">{m.monitor}</span>
                              </td>
                              <td>
                                <span className={`qm-score-tag ${meta.badgeClass}`}>
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
                                <button
                                  type="button"
                                  onClick={() => setActiveModalId(m.id)}
                                  className="qm-btn-manage"
                                >
                                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  Gerenciar
                                </button>
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
                      <p className="qm-empty-desc">Ajuste os filtros de busca ou cadastre uma nova avaliação.</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* =============================================================== */}
            {/* ABA 3: MONITORIAS (ENCAMINHADAS / ATENDENTES)                    */}
            {/* =============================================================== */}
            {currentView === 'monitorias' && (
              <section key="monitorias" className="qm-view-enter">
                <div className="qm-section-header">
                  <div>
                    <div className="qm-section-title-wrap">
                      <h1 className="qm-section-title">Monitorias</h1>
                      <span className={`qm-section-badge ${currentRole === 'monitor' ? 'blue' : 'emerald'}`}>
                        {currentRole === 'monitor' ? 'Acesso: Monitor / Supervisor' : 'Acesso: Atendente'}
                      </span>
                    </div>
                    <p className="qm-section-desc">
                      Consulta transparente das monitorias encaminhadas, pontuações operacionais e confirmação de ciência.
                    </p>
                  </div>

                  <div className="qm-header-actions">
                    {toggleTheme && (
                      <button
                        type="button"
                        onClick={toggleTheme}
                        className="qm-theme-btn"
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

                    {/* Indicador de Atendente Filtrado */}
                    {currentRole === 'atendente' && (
                      <div className="qm-attendant-banner">
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span>
                          Minhas Avaliações: <strong>{attendantSelfName}</strong>
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4 Cards de Resumo */}
                <div className="qm-stat-grid-4">
                  <div className="qm-stat-card">
                    <div className="qm-stat-header">
                      <span className="qm-kpi-label">Monitorias Encaminhadas</span>
                      <div className="qm-stat-icon-wrap slate">
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    </div>
                    <div className="qm-stat-val-row">
                      <span className="qm-stat-val">{publicTotal}</span>
                      <span className="qm-stat-sub">disponíveis</span>
                    </div>
                  </div>

                  <div className="qm-stat-card">
                    <div className="qm-stat-header">
                      <span className="qm-kpi-label">Média das Notas</span>
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
                      <span className="qm-kpi-label">Ciência / Concluídas</span>
                      <div className="qm-stat-icon-wrap emerald">
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <div className="qm-stat-val-row">
                      <span className="qm-stat-val">{publicCiencia}</span>
                      <span className="qm-stat-sub">confirmadas</span>
                    </div>
                  </div>
                </div>

                {/* Tabela de Monitorias Públicas */}
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
                          <th>Chamado</th>
                          <th>Atendente</th>
                          <th>Data da Chamada</th>
                          <th>Monitor</th>
                          <th>Nota Final</th>
                          <th>Status / Ciência</th>
                          <th>Feedback Agendado</th>
                          <th style={{ textAlign: 'right' }}>Resultado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPublicList.map(m => {
                          const meta = getPerformanceMeta(m.notaFinal);
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
                                <span className="qm-text-muted">{formatDateTimeBR(m.dataChamada)}</span>
                              </td>
                              <td>
                                <span className="qm-text-muted">{m.monitor}</span>
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span className={`qm-score-tag ${meta.badgeClass}`}>
                                    {m.notaFinal} / 100
                                  </span>
                                  <span className="qm-text-muted" style={{ fontSize: 11, fontWeight: 600 }}>
                                    {meta.label}
                                  </span>
                                </div>
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
                                {m.cienciaEm ? (
                                  <div style={{ fontSize: 11, color: 'var(--copom-emerald)', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                    Ciência confirmada
                                  </div>
                                ) : (
                                  <div className="qm-text-muted" style={{ fontSize: 11, marginTop: 4 }}>
                                    Aguardando ciência
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
                                <button
                                  type="button"
                                  onClick={() => setActiveResultModalId(m.id)}
                                  className="qm-btn-view"
                                >
                                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  Ver Resultado
                                </button>
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
                      <p className="qm-empty-title">
                        {currentRole === 'atendente'
                          ? 'Nenhuma avaliação recebida'
                          : 'Nenhuma monitoria encaminhada encontrada'}
                      </p>
                      <p className="qm-empty-desc">
                        {currentRole === 'atendente'
                          ? `Suas avaliações operacionais encaminhadas pelos monitores serão listadas aqui para ${attendantSelfName}.`
                          : 'Apenas avaliações já encaminhadas pelo monitor aparecem nesta listagem.'}
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
                <p className="qm-modal-sub">Registrado em {formatDateTimeBR(activeModalItem.criadoEm)}</p>
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
                      <span className="qm-text-muted" style={{ display: 'block' }}>Monitor</span>
                      <strong className="qm-text-bold">{activeModalItem.monitor}</strong>
                    </div>
                    <div>
                      <span className="qm-text-muted" style={{ display: 'block' }}>Data da Chamada</span>
                      <strong className="qm-text-bold">{formatDateTimeBR(activeModalItem.dataChamada)}</strong>
                    </div>
                  </div>
                  <div className="qm-modal-tile" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 14px', borderRadius: 12 }}>
                    <div style={{ textAlign: 'right' }}>
                      <span className="qm-text-muted" style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Nota Final</span>
                      <span className="qm-text-muted" style={{ fontSize: 11, fontWeight: 600 }}>{formatDecimalScore(activeModalItem.notaFinal)} / 10,0</span>
                    </div>
                    <span className={`qm-score-tag ${getPerformanceMeta(activeModalItem.notaFinal, dark).badgeClass}`} style={{ fontSize: 16 }}>
                      {activeModalItem.notaFinal}
                    </span>
                  </div>
                </div>

                {/* Grade de 5 Critérios */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8, marginTop: 14 }}>
                  {CRITERIA_DEF.map(c => {
                    const score = activeModalItem.scores?.[c.id] ?? 0;
                    return (
                      <div key={c.id} className="qm-modal-tile" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, fontSize: 12 }}>
                        <span className="qm-text-muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.label}</span>
                        <strong style={{ fontWeight: 700 }}>{score}/{c.max}</strong>
                      </div>
                    );
                  })}
                </div>

                {/* Observações */}
                <div style={{ marginTop: 14 }}>
                  <span className="qm-text-muted" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                    Observações e Recomendações
                  </span>
                  <div className="qm-modal-text-box">
                    {activeModalItem.observacoes}
                  </div>
                </div>
              </div>

              {/* Seção 2: Encaminhamento de Relatório */}
              <div className="qm-modal-section">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Encaminhar Relatório / Nota</h3>
                    <p className="qm-text-muted" style={{ fontSize: 11, margin: '2px 0 0 0' }}>
                      Disponibiliza a avaliação na aba Monitorias para ciência do atendente.
                    </p>
                  </div>
                  {activeModalItem.encaminhada && (
                    <span className="qm-status-badge concluido">Encaminhado</span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 12 }}>
                  <label className="qm-modal-check-tile">
                    <input
                      type="checkbox"
                      checked={channelEmail}
                      onChange={e => setChannelEmail(e.target.checked)}
                      style={{ accentColor: 'var(--copom-blue)' }}
                    />
                    <div>
                      <strong style={{ fontSize: 12, display: 'block' }}>E-mail Institucional</strong>
                      <span className="qm-text-muted" style={{ fontSize: 10 }}>{activeModalItem.emailAtendente}</span>
                    </div>
                  </label>

                  <label className="qm-modal-check-tile">
                    <input
                      type="checkbox"
                      checked={channelDash}
                      onChange={e => setChannelDash(e.target.checked)}
                      style={{ accentColor: 'var(--copom-blue)' }}
                    />
                    <div>
                      <strong style={{ fontSize: 12, display: 'block' }}>Dashboard do Atendente</strong>
                      <span className="qm-text-muted" style={{ fontSize: 10 }}>Disponibiliza na aba Monitorias</span>
                    </div>
                  </label>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <p style={{ fontSize: 11, color: activeModalItem.encaminhada ? 'var(--copom-emerald)' : 'var(--copom-amber)', fontWeight: 600, margin: 0 }}>
                    {activeModalItem.encaminhada && activeModalItem.envio
                      ? `Encaminhado em ${formatDateTimeBR(activeModalItem.envio.enviadoEm)} via ${activeModalItem.envio.canais.join(' e ')}.`
                      : 'Ainda não encaminhado (oculto para o atendente).'}
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
                    {activeModalItem.encaminhada ? 'Reenviar Relatório' : 'Encaminhar Relatório/Nota'}
                  </button>
                </div>
              </div>

              {/* Seção 3: Agendamento de Feedback & Status */}
              <form onSubmit={handleSaveSchedule} className="qm-modal-section">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Agendamento de Feedback e Status</h3>
                    <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0 0' }}>
                      Defina a data, horário e modalidade para o alinhamento individual.
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
                  <label className="qm-label">Local / Sala ou Link da Reunião</label>
                  <input
                    type="text"
                    placeholder="Ex: Sala de Supervisão 02 — COPOM ou link da videoconferência"
                    value={schedLocation}
                    onChange={e => setSchedLocation(e.target.value)}
                    className="qm-input"
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className="qm-btn-primary" style={{ width: 'auto', padding: '8px 16px' }}>
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Salvar Agendamento
                  </button>
                </div>
              </form>
            </div>

            {/* Rodapé do Modal 1 */}
            <div className="qm-modal-footer">
              <button
                type="button"
                onClick={() => triggerPrint(activeModalItem)}
                className="qm-btn-secondary"
                style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Imprimir Relatório
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
      {/* MODAL 2: RESULTADO DA MONITORIA (Atendente / Leitura / Ciência)  */}
      {/* =============================================================== */}
      {activeResultModalItem && (
        <div className="qm-modal-backdrop" onClick={() => setActiveResultModalId(null)}>
          <div className="qm-modal-box" onClick={e => e.stopPropagation()}>
            <div className="qm-modal-header dark">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#93c5fd' }}>
                    Resultado da Monitoria
                  </span>
                  <span
                    className={`qm-status-badge ${
                      activeResultModalItem.status === 'Concluído'
                        ? 'concluido'
                        : activeResultModalItem.status === 'Feedback Agendado'
                        ? 'agendado'
                        : 'pendente'
                    }`}
                  >
                    {activeResultModalItem.status}
                  </span>
                </div>
                <h2 className="qm-modal-title" style={{ marginTop: 4 }}>
                  Chamado {activeResultModalItem.chamado}
                </h2>
                <p className="qm-modal-sub">
                  Chamada de {formatDateTimeBR(activeResultModalItem.dataChamada)} · Avaliado por {activeResultModalItem.monitor}
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
              {/* Bloco Superior: Dados + Card Nota Final */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 14 }}>
                <div className="qm-modal-section tinted" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12 }}>
                  <div>
                    <span className="qm-text-muted" style={{ display: 'block' }}>Atendente Avaliado</span>
                    <strong className="qm-text-bold" style={{ fontSize: 14 }}>{activeResultModalItem.atendente}</strong>
                    <span className="qm-text-muted" style={{ display: 'block' }}>{activeResultModalItem.emailAtendente}</span>
                  </div>
                  <div>
                    <span className="qm-text-muted" style={{ display: 'block' }}>Monitor Responsável</span>
                    <strong className="qm-text-bold">{activeResultModalItem.monitor}</strong>
                  </div>
                  <div>
                    <span className="qm-text-muted" style={{ display: 'block' }}>Data da Chamada</span>
                    <span className="qm-text-bold">{formatDateTimeBR(activeResultModalItem.dataChamada)}</span>
                  </div>
                  <div>
                    <span className="qm-text-muted" style={{ display: 'block' }}>Encaminhado em</span>
                    <span className="qm-text-bold">
                      {activeResultModalItem.envio ? formatDateTimeBR(activeResultModalItem.envio.enviadoEm) : '—'}
                    </span>
                  </div>
                </div>

                {/* Card de Destaque da Nota Final */}
                <div className="qm-modal-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                  <span className="qm-text-muted" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                    Nota Final da Monitoria
                  </span>
                  <div style={{ marginTop: 6, display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: 36, fontWeight: 800, color: 'var(--copom-dark)', lineHeight: 1 }}>
                      {activeResultModalItem.notaFinal}
                    </span>
                    <span className="qm-text-muted" style={{ fontSize: 14, fontWeight: 600 }}>/ 100</span>
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="qm-circle-decimal" style={{ margin: 0, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>
                      {formatDecimalScore(activeResultModalItem.notaFinal)} / 10,0
                    </span>
                    <span className={`qm-score-tag ${getPerformanceMeta(activeResultModalItem.notaFinal, dark).badgeClass}`}>
                      {getPerformanceMeta(activeResultModalItem.notaFinal, dark).label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Detalhamento dos 5 Critérios */}
              <div className="qm-modal-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Detalhamento por Critério Operacional (190)</h3>
                  <span className="qm-text-muted" style={{ fontSize: 11 }}>Máximo: 20 pts por critério</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {CRITERIA_DEF.map(c => {
                    const score = activeResultModalItem.scores?.[c.id] ?? 0;
                    const pct = Math.round((score / c.max) * 100);
                    const barColor = score >= 16 ? (dark ? '#14b8a6' : '#059669') : score >= 12 ? (dark ? '#69d0e0' : '#2563eb') : score >= 8 ? (dark ? '#f59e0b' : '#f59e0b') : (dark ? '#f87171' : '#dc2626');
                    return (
                      <div key={c.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                          <span style={{ fontWeight: 600, color: 'var(--copom-dark)' }}>{c.label}</span>
                          <span style={{ fontWeight: 800 }}>
                            {score} <span className="qm-text-muted" style={{ fontWeight: 500 }}>/ {c.max}</span>
                          </span>
                        </div>
                        <div className="qm-progress-bar" style={{ height: 8 }}>
                          <div
                            className="qm-progress-fill"
                            style={{ width: `${pct}%`, backgroundColor: barColor }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Observações e Pontos de Melhoria */}
              <div className="qm-modal-section blue">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: 'var(--copom-blue)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0, color: 'var(--copom-blue)' }}>
                    Observações e Pontos de Melhoria
                  </h3>
                </div>
                <p style={{ fontSize: 13, color: 'var(--copom-dark)', margin: 0, lineHeight: 1.5 }}>
                  {activeResultModalItem.observacoes}
                </p>
              </div>

              {/* Sessão de Feedback Agendada */}
              <div className="qm-modal-section tinted">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>Sessão de Feedback</h3>
                </div>
                {activeResultModalItem.feedback ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, fontSize: 12 }}>
                    <div className="qm-modal-tile" style={{ padding: 10, borderRadius: 8 }}>
                      <span className="qm-text-muted" style={{ display: 'block' }}>Data e Horário</span>
                      <strong className="qm-text-bold">
                        {formatDateBR(activeResultModalItem.feedback.data)} às {activeResultModalItem.feedback.horario}
                      </strong>
                    </div>
                    <div className="qm-modal-tile" style={{ padding: 10, borderRadius: 8 }}>
                      <span className="qm-text-muted" style={{ display: 'block' }}>Modalidade</span>
                      <strong className="qm-text-bold">{activeResultModalItem.feedback.modalidade}</strong>
                    </div>
                    <div className="qm-modal-tile" style={{ padding: 10, borderRadius: 8 }}>
                      <span className="qm-text-muted" style={{ display: 'block' }}>Local / Link</span>
                      <strong className="qm-text-bold" style={{ wordBreak: 'break-all' }}>
                        {activeResultModalItem.feedback.local || 'A definir com o monitor'}
                      </strong>
                    </div>
                  </div>
                ) : (
                  <p className="qm-modal-tile qm-text-muted" style={{ fontSize: 12, padding: 10, borderRadius: 8, margin: 0 }}>
                    A sessão de feedback ainda não foi agendada pelo monitor.
                  </p>
                )}
              </div>

              {/* Banner de Ciência Confirmada */}
              {activeResultModalItem.cienciaEm && (
                <div className="qm-notice-confirmed" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: 'var(--copom-emerald)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div style={{ fontSize: 12, color: 'inherit' }}>
                    <strong style={{ display: 'block' }}>Leitura e Ciência Confirmadas</strong>
                    <span>Registrada em {formatDateTimeBR(activeResultModalItem.cienciaEm)}.</span>
                  </div>
                </div>
              )}
            </div>

            {/* Rodapé do Modal 2 */}
            <div className="qm-modal-footer">
              <button
                type="button"
                onClick={() => triggerPrint(activeResultModalItem)}
                className="qm-btn-secondary"
                style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Imprimir Relatório
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {!activeResultModalItem.cienciaEm && (
                  <button
                    type="button"
                    onClick={handleConfirmCiencia}
                    className="qm-btn-primary"
                    style={{ width: 'auto', backgroundColor: '#059669' }}
                  >
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Confirmar Leitura / Dar Ciência
                  </button>
                )}
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

      {/* =============================================================== */}
      {/* ÁREA DEDICADA DE IMPRESSÃO LIMPA (PDF / PAPEL)                  */}
      {/* =============================================================== */}
      {printReportItem && (
        <div id="qm-print-report-area">
          <div style={{ fontFamily: 'Inter, sans-serif', color: '#0f172a', maxWidth: 780, margin: '0 auto', padding: 24 }}>
            <div style={{ borderBottom: '2px solid #0b1220', paddingBottom: 14, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', fontWeight: 700 }}>
                  Central de Atendimento 190 — COPOM
                </div>
                <h1 style={{ fontSize: 20, fontWeight: 800, margin: '4px 0 0 0' }}>
                  Relatório de Monitoria de Qualidade
                </h1>
              </div>
              <div style={{ textAlign: 'right', fontSize: 12, color: '#475569' }}>
                <div><strong>Chamado:</strong> {printReportItem.chamado}</div>
                <div><strong>Status:</strong> {printReportItem.status}</div>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20, fontSize: 13 }}>
              <tbody>
                <tr>
                  <td style={{ padding: 8, border: '1px solid #cbd5e1', background: '#f8fafc', width: '22%' }}><strong>Atendente</strong></td>
                  <td style={{ padding: 8, border: '1px solid #cbd5e1', width: '28%' }}>{printReportItem.atendente}</td>
                  <td style={{ padding: 8, border: '1px solid #cbd5e1', background: '#f8fafc', width: '22%' }}><strong>Data da Chamada</strong></td>
                  <td style={{ padding: 8, border: '1px solid #cbd5e1', width: '28%' }}>{formatDateTimeBR(printReportItem.dataChamada)}</td>
                </tr>
                <tr>
                  <td style={{ padding: 8, border: '1px solid #cbd5e1', background: '#f8fafc' }}><strong>E-mail</strong></td>
                  <td style={{ padding: 8, border: '1px solid #cbd5e1' }}>{printReportItem.emailAtendente}</td>
                  <td style={{ padding: 8, border: '1px solid #cbd5e1', background: '#f8fafc' }}><strong>Monitor Responsável</strong></td>
                  <td style={{ padding: 8, border: '1px solid #cbd5e1' }}>{printReportItem.monitor}</td>
                </tr>
              </tbody>
            </table>

            <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Avaliação por Critérios Operacionais (POP 190)</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20, fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{ textAlign: 'left', padding: 8, border: '1px solid #cbd5e1' }}>Critério</th>
                  <th style={{ textAlign: 'right', padding: 8, border: '1px solid #cbd5e1', width: 120 }}>Pontuação</th>
                </tr>
              </thead>
              <tbody>
                {CRITERIA_DEF.map(c => (
                  <tr key={c.id}>
                    <td style={{ padding: 8, border: '1px solid #cbd5e1' }}>{c.label}</td>
                    <td style={{ padding: 8, border: '1px solid #cbd5e1', textAlign: 'right', fontWeight: 600 }}>
                      {printReportItem.scores?.[c.id] ?? 0} / {c.max}
                    </td>
                  </tr>
                ))}
                <tr style={{ background: '#f8fafc' }}>
                  <td style={{ padding: '10px 8px', border: '1px solid #cbd5e1', fontWeight: 700 }}>
                    NOTA FINAL ({getPerformanceMeta(printReportItem.notaFinal).label})
                  </td>
                  <td style={{ padding: '10px 8px', border: '1px solid #cbd5e1', textAlign: 'right', fontWeight: 700, fontSize: 15 }}>
                    {printReportItem.notaFinal} / 100 ({formatDecimalScore(printReportItem.notaFinal)})
                  </td>
                </tr>
              </tbody>
            </table>

            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Observações e Pontos de Melhoria</h2>
              <div style={{ padding: 12, border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13, lineHeight: 1.5, background: '#ffffff' }}>
                {printReportItem.observacoes}
              </div>
            </div>

            <div style={{ marginBottom: 32, fontSize: 13 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Feedback, Encaminhamento e Ciência</h2>
              <p style={{ margin: '4px 0' }}>
                <strong>Encaminhamento:</strong> {printReportItem.envio ? `Enviado em ${formatDateTimeBR(printReportItem.envio.enviadoEm)} (${printReportItem.envio.canais.join(', ')})` : 'Não encaminhado'}
              </p>
              <p style={{ margin: '4px 0' }}>
                <strong>Sessão de Feedback:</strong> {printReportItem.feedback ? `${formatDateBR(printReportItem.feedback.data)} às ${printReportItem.feedback.horario} — ${printReportItem.feedback.modalidade}${printReportItem.feedback.local ? ` (${printReportItem.feedback.local})` : ''}` : 'Não agendada'}
              </p>
              <p style={{ margin: '4px 0' }}>
                <strong>Ciência do Atendente:</strong> {printReportItem.cienciaEm ? `Confirmada em ${formatDateTimeBR(printReportItem.cienciaEm)}` : 'Pendente de confirmação'}
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 48, fontSize: 12, color: '#475569' }}>
              <div style={{ width: '44%', borderTop: '1px solid #64748b', paddingTop: 6, textAlign: 'center' }}>
                Assinatura do Monitor / Supervisor<br />
                <strong>{printReportItem.monitor}</strong>
              </div>
              <div style={{ width: '44%', borderTop: '1px solid #64748b', paddingTop: 6, textAlign: 'center' }}>
                Ciência do Atendente<br />
                <strong>{printReportItem.atendente}</strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
