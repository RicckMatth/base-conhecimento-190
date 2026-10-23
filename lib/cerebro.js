import { withLegalReferences } from './legal-references.js';
import { correctReport } from './writing.js';
import { applyTriage,withTriageQuestions,withLearnedTriage } from './triage.js';
import { normalizeText } from './assistant.js';
/**
 * ============================================================================
 * CÉREBRO 190 — MOTOR DE CLASSIFICAÇÃO DE RELATOS E CHATBOT OPERACIONAL COPOM
 * ============================================================================
 * Como alimentar novas naturezas no futuro:
 * Basta adicionar um novo objeto dentro da lista `regrasNaturezas` abaixo
 * (ou cadastrar visualmente pela aba "Cérebro 190" dentro do sistema e exportar).
 */

(function (global) {
  'use strict';

  // Normaliza texto (remove acentos, converte para minúsculas e limpa pontuação extra)
  function normalizar(texto) {
    return normalizeText(texto);
  }

  // Verifica se o texto normalizado contém qualquer radical/termo da lista
  function contemAlgum(textoNorm, listaTermos) {
    if (!Array.isArray(listaTermos) || !listaTermos.length) return false;
    return listaTermos.some(termo => {
      const t = normalizar(termo);
      return t && textoNorm.includes(t);
    });
  }

  // Conta quantos termos da lista aparecem no texto e retorna os termos encontrados
  function encontrarTermos(textoNorm, listaTermos) {
    if (!Array.isArray(listaTermos)) return [];
    const encontrados = [];
    listaTermos.forEach(termo => {
      const t = normalizar(termo);
      if (t && textoNorm.includes(t)) encontrados.push(termo);
    });
    return encontrados;
  }

  // ==========================================================================
  // 1. DICIONÁRIOS SEMÂNTICOS DE ENTIDADES E CONTEXTO OPERACIONAL
  // ==========================================================================
  const DICIONARIO = {
    vitimaMulher: [
      'mulher', 'esposa', 'companheira', 'namorada', 'noiva', 'ex-mulher', 'ex-esposa',
      'ex-companheira', 'ex-namorada', 'mae', 'filha', 'irma', 'senhora', 'adolescente gravida',
      'gestante', 'agredida', 'ameacada', 'ela esta', 'minha mae', 'minha irma', 'vizinha'
    ],
    vinculoDomestico: [
      'marido', 'esposo', 'companheiro', 'namorado', 'noivo', 'amasio', 'ex-marido',
      'ex-companheiro', 'ex-namorado', 'ex-noivo', 'pai', 'padrasto', 'filho', 'irmao',
      'tio', 'avô', 'cunhado', 'genro', 'dentro de casa', 'em casa', 'na residencia',
      'violencia domestica', 'maria da penha', 'convivente'
    ],
    presencaMenores: [
      'filho', 'filhos', 'crianca', 'criancas', 'bebe', 'menor', 'menores',
      'frente aos filhos', 'frente a seus filhos', 'frente das criancas', 'presenca dos filhos'
    ],
    usoArmaFogo: [
      'arma de fogo', 'revolver', 'pistola', 'espingarda', 'fuzil', 'garrucha',
      'armado', 'atirou', 'disparo', 'tiro', 'tiros', 'baleado', 'baleada', 'apontou a arma'
    ],
    usoArmaBranca: [
      'faca', 'facao', 'canivete', 'punhal', 'estilete', 'tesoura', 'facada',
      'esfaqueou', 'esfaqueada', 'arma branca', 'barra de ferro', 'pedaco de pau', 'paulada', 'garrafa quebrada'
    ],
    emAndamento: [
      'esta sendo', 'estao', 'neste momento', 'agora', 'em andamento', 'socorro',
      'gritando', 'tentando entrar', 'invadindo', 'batendo nela', 'agredindo', 'no local ainda', 'permanece no local'
    ],
    fatoConsumado: [
      'ontem', 'hoje cedo', 'ja foi embora', 'evadiu', 'fugiu', 'sumiu',
      'quando cheguei', 'dei falta', 'constatei', 'horas atras', 'dias atras'
    ]
  };

  // ==========================================================================
  // 2. BASE DE REGRAS DE NATUREZAS (ALIMENTÁVEL / EXPANSÍVEL)
  // ==========================================================================
  const REGRAS_BASE = [
    {
      id: 'nat-vd-lesao',
      code: 'VD-001 / DEM-005A',
      officialNature: 'LESÃO CORPORAL CONTRA A MULHER - CONDIÇÃO DO SEXO FEMININO E VIOLÊNCIA DOMÉSTICA E FAMILIAR',
      category: 'Proteção',
      priority: 'Crítica',
      legalBase: 'Art. 129, § 13 do Código Penal c/c Lei nº 11.340/2006 (Lei Maria da Penha)',
      agency: 'Polícia Militar (Despacho Prioritário) / SAMU 192 se houver ferimentos graves',
      // Grupos obrigatórios: precisa bater pelo menos 1 termo do grupo A (mulher/doméstico) E 1 termo do grupo B (agressão física/lesão)
      requiredGroups: [
        ['mulher', 'esposa', 'companheira', 'namorada', 'noiva', 'mae', 'filha', 'irma', 'vizinha', 'marido', 'companheiro', 'namorado', 'ex-marido', 'ex-namorado', 'amasio', 'padrasto'],
        ['agredid', 'agredind', 'agressao', 'agrediu', 'batendo', 'bateu', 'apanhando', 'apanhou', 'soco', 'socos', 'chute', 'chutes', 'espanc', 'machuc', 'ferid', 'sangr', 'lesao', 'tapa', 'tapas', 'empurr', 'puxao de cabelo', 'enforc', 'esgan', 'facada', 'paulada', 'violencia fisica']
      ],
      boostKeywords: ['marido', 'esposa', 'dentro de casa', 'residencia', 'filhos', 'frente a seus filhos', 'gravida', 'sangrando', 'socorro'],
      excludeKeywords: ['acidente de transito', 'cachorro', 'animal'],
      explanation: 'Identificada agressão física direta contra vítima do sexo feminino no contexto de relação íntima de afeto, doméstica ou familiar.',
      triageQuestions: [
        'O agressor ainda está dentro da residência ou nas proximidades?',
        'O agressor utiliza arma de fogo, faca ou algum objeto contundente?',
        'A vítima ou os filhos necessitam de ambulância (SAMU/SIATE) imediata?',
        'A vítima possui Medida Protetiva de Urgência (MPU) vigente?'
      ],
      dispatchMask: 'SOLICITANTE INFORMA QUE VÍTIMA DO SEXO FEMININO ESTÁ SENDO AGREDIDA FISICAMENTE POR SEU [VÍNCULO DO AUTOR: MARIDO/COMPANHEIRO/EX] NO INTERIOR DA RESIDÊNCIA. CONSTAM [DETALHES ADICIONAIS / PRESENÇA DE FILHOS]. AUTOR [PERMANECE NO LOCAL / EVADIU-SE]. VIATURA SOLICITADA COM PRIORIDADE MÁXIMA.'
    },
    {
      id: 'nat-vd-ameaca',
      code: 'VD-002 / DEM-005B',
      officialNature: 'AMEAÇA CONTRA A MULHER - CONDIÇÃO DO SEXO FEMININO E VIOLÊNCIA DOMÉSTICA E FAMILIAR',
      category: 'Proteção',
      priority: 'Alta',
      legalBase: 'Art. 147 do Código Penal c/c Lei nº 11.340/2006 (Lei Maria da Penha)',
      agency: 'Polícia Militar / Patrulha Maria da Penha',
      requiredGroups: [
        ['mulher', 'esposa', 'companheira', 'namorada', 'noiva', 'mae', 'ex-marido', 'ex-companheiro', 'ex-namorado', 'marido', 'companheiro', 'namorado', 'amasio'],
        ['ameac', 'matar', 'morte', 'intimid', 'dizendo que vai', 'prometendo matar', 'quebrar tudo', 'nao aceita o fim', 'perseguind']
      ],
      boostKeywords: ['arma', 'faca', 'portao', 'tentando entrar', 'medida protetiva', 'separacao'],
      excludeKeywords: ['agredindo fisicamente', 'espancando', 'sangrando', 'soco'],
      explanation: 'Identificada promessa de mal injusto e grave (ameaça verbal, gestual ou armada) contra mulher em contexto doméstico ou familiar, sem relato até o momento de lesão física consumada.',
      triageQuestions: [
        'O autor da ameaça está no local ou tentando forçar a entrada no imóvel?',
        'Ele porta arma de fogo ou faca?',
        'Existe Medida Protetiva de Urgência ativa contra ele?',
        'Quais as vestimentas e características do autor?'
      ],
      dispatchMask: 'SOLICITANTE INFORMA QUE VÍTIMA DO SEXO FEMININO ESTÁ SENDO AMEAÇADA POR SEU [MARIDO / EX-COMPANHEIRO / NAMORADO] NO LOCAL. O AUTOR [ESTÁ NO LOCAL / TENTA INVADIR O IMÓVEL] E [PORTA / NÃO PORTA] ARMA. VIATURA SOLICITADA PARA AVERIGUAÇÃO PRIORITÁRIA.'
    },
    {
      id: 'nat-vd-mpu',
      code: 'VD-003 / DEM-005C',
      officialNature: 'DESCUMPRIMENTO DE MEDIDA PROTETIVA DE URGÊNCIA (LEI MARIA DA PENHA)',
      category: 'Proteção',
      priority: 'Crítica',
      legalBase: 'Art. 24-A da Lei nº 11.340/2006 (Crime de Descumprimento de Medida Protetiva)',
      agency: 'Polícia Militar / Patrulha Maria da Penha',
      requiredGroups: [
        ['medida protetiva', 'proibido de se aproximar', 'mpu'],
        ['descumpr', 'porta', 'portao', 'frente de casa', 'aproximou', 'invadiu', 'veio ate', 'rondando', 'ligando', 'ameacando', 'marido', 'ex']
      ],
      boostKeywords: ['medida protetiva', 'ex-marido', 'ex-companheiro', 'portao'],
      excludeKeywords: [],
      explanation: 'Relato indica violação direta de decisão judicial que concedeu Medida Protetiva de Urgência, configurando crime autônomo sujeito a prisão em flagrante.',
      triageQuestions: [
        'O autor está na frente do imóvel ou no interior da residência neste momento?',
        'A vítima está com a cópia ou número do processo da Medida Protetiva em mãos?',
        'O autor está armado ou tentando arrombar o acesso?',
        'Se ele saiu, qual direção tomou, qual roupa veste e se está em veículo?'
      ],
      dispatchMask: 'SOLICITANTE INFORMA DESCUMPRIMENTO DE MEDIDA PROTETIVA DE URGÊNCIA, ONDE O AUTOR ([VÍNCULO]) APROXIMOU-SE DA VÍTIMA VIOLANDO ORDEM JUDICIAL. O INDIVÍDUO [PERMANECE NO LOCAL / EVADIU-SE SENTIDO...], TRAJANDO [VESTIMENTAS]. VIATURA SOLICITADA COM PRIORIDADE.'
    },
    {
      id: 'nat-roubo-geral',
      code: 'PAT-001 / ART-157',
      officialNature: 'ROUBO (SUBTRAÇÃO MEDIANTE GRAVE AMEAÇA OU VIOLÊNCIA À PESSOA)',
      category: 'Patrimônio',
      priority: 'Crítica',
      legalBase: 'Art. 157 do Código Penal',
      agency: 'Polícia Militar (Cerco e Patrulhamento)',
      requiredGroups: [
        ['roub', 'assalt', 'levaram', 'tomaram', 'subtrai', 'arrancaram'],
        ['arma', 'armado', 'revolver', 'pistola', 'faca', 'ameac', 'apontou', 'rendeu', 'renderam', 'anunciou', 'agrediu', 'empurrou', 'grave ameaca', 'violencia', 'coronhada']
      ],
      boostKeywords: ['assalto', 'anunciou o assalto', 'dois individuos em uma moto', 'armado', 'celular', 'bolsa', 'estabelecimento'],
      excludeKeywords: ['sem ninguem ver', 'quando acordei', 'nao tinha ninguem em casa'],
      explanation: 'Caracterizado o crime de ROUBO pois houve subtração patrimonial com contato direto, emprego de violência física, arma ou grave ameaça contra a vítima.',
      triageQuestions: [
        'Há quanto tempo exato ocorreu o roubo e qual a direção de fuga dos autores?',
        'Quantos indivíduos eram e como estavam trajados (capacete, blusa, mochila)?',
        'Utilizaram motocicleta ou veículo (qual cor, modelo e placa)?',
        'Qual arma foi visualizada e se há alguma vítima ferida precisando de socorro?'
      ],
      dispatchMask: 'SOLICITANTE INFORMA ROUBO OCORRIDO HÁ [TEMPO], ONDE [QUANTIDADE] INDIVÍDUO(S) MEDIANTE [ARMA DE FOGO / FACA / GRAVE AMEAÇA] SUBTRAÍRAM [BENS LEVADOS]. OS AUTORES TRAJAVAM [VESTIMENTAS] E EVADIRAM-SE EM [MOTO/VEÍCULO/A PÉ] SENTIDO [DIREÇÃO]. VIATURA SOLICITADA PARA PATRULHAMENTO E CERCO.'
    },
    {
      id: 'nat-furto-andamento',
      code: 'PAT-002 / DEM-004A',
      officialNature: 'FURTO QUALIFICADO / INVASÃO E ARROMBAMENTO EM ANDAMENTO',
      category: 'Patrimônio',
      priority: 'Alta',
      legalBase: 'Art. 155, § 4º do Código Penal',
      agency: 'Polícia Militar',
      requiredGroups: [
        ['furt', 'ladrao', 'individuo', 'suspeito', 'arromb', 'pulou o muro', 'cortando fio', 'mexendo', 'levando'],
        ['agora', 'neste momento', 'em andamento', 'dentro do quintal', 'dentro da loja', 'dentro da casa', 'no telhado', 'tentando abrir', 'forçando a porta']
      ],
      boostKeywords: ['pulou o muro', 'arrombando', 'dentro do comercio', 'alarme disparou', 'no quintal agora'],
      excludeKeywords: ['apontou arma para mim', 'anunciou assalto'],
      explanation: 'Subtração ou tentativa de subtração patrimonial em curso (flagrante), sem violência direta contra pessoa, mas com suspeito ainda no interior ou imediações do imóvel.',
      triageQuestions: [
        'O suspeito ainda está visualizado dentro do imóvel/quintal neste momento?',
        'Quantos indivíduos são e quais suas roupas/características?',
        'Há moradores dentro da residência neste momento (orientar a se trancarem em cômodo seguro)?',
        'Qual o ponto exato de acesso (muro lateral, telhado, porta dos fundos)?'
      ],
      dispatchMask: 'SOLICITANTE INFORMA FURTO EM ANDAMENTO EM [RESIDÊNCIA / COMÉRCIO], ONDE INDIVÍDUO(S) TRAJANDO [VESTIMENTAS] ENCONTRAM-SE NO INTERIOR DO LOCAL PRATICANDO SUBTRAÇÃO/ARROMBAMENTO. VIATURA SOLICITADA COM BREVIDADE PARA AVERIGUAÇÃO DE FLAGRANTE.'
    },
    {
      id: 'nat-furto-consumado',
      code: 'PAT-003 / DEM-004',
      officialNature: 'FURTO SIMPLES OU QUALIFICADO (FATO CONSUMADO SEM SUSPEITOS NO LOCAL)',
      category: 'Patrimônio',
      priority: 'Baixa',
      legalBase: 'Art. 155 do Código Penal',
      agency: 'Polícia Militar / Delegacia Eletrônica (BO Online)',
      requiredGroups: [
        ['furt', 'sumiu', 'levaram', 'subtrairam', 'desapareceu', 'arrombaram'],
        ['objeto', 'celular', 'bicicleta', 'carteira', 'fios', 'portao', 'janela', 'estacionado', 'quando cheguei', 'dei falta', 'nao vi quem foi', 'sem violencia']
      ],
      boostKeywords: ['furtaram', 'dei falta', 'quando sai', 'nao tinha ninguem', 'sem violencia'],
      excludeKeywords: ['armado', 'apontou', 'rendeu', 'assalto', 'agora no quintal'],
      explanation: 'Subtração de bem móvel sem violência ou grave ameaça à pessoa, constatada após a saída do autor.',
      triageQuestions: [
        'Trata-se de veículo automotor com placa (para alerta imediato na rede) ou outros objetos?',
        'Houve arrombamento ou rompimento de obstáculo (porta/fechadura quebrada)?',
        'O autor ainda está no local ou o fato já foi consumado anteriormente?',
        'Existem câmeras de monitoramento que registraram a ação?'
      ],
      dispatchMask: 'SOLICITANTE INFORMA FURTO CONSUMADO EM QUE CONSTATOU A SUBTRAÇÃO DE [BEM SUBTRAÍDO], SEM PRESENÇA DOS AUTORES NO LOCAL NO MOMENTO. RELATA QUE [HOUVE / NÃO HOUVE] ARROMBAMENTO. SOLICITADA ORIENTAÇÃO/REGISTRO.'
    },
    {
      id: 'nat-perturbacao',
      code: 'ORD-001 / DEM-001',
      officialNature: 'PERTURBAÇÃO DO TRABALHO OU DO SOSSEGO ALHEIOS',
      category: 'Ordem pública',
      priority: 'Baixa',
      legalBase: 'Art. 42 do Decreto-Lei nº 3.688/41 (Lei das Contravenções Penais)',
      agency: 'Polícia Militar / Fiscalização Municipal',
      requiredGroups: [
        ['som alto', 'barulho', 'ruido', 'musica alta', 'gritaria', 'algazarra', 'festa', 'perturbacao', 'sossego', 'paredao de som', 'escapamento', 'latido']
      ],
      boostKeywords: ['vizinho', 'madrugada', 'bar', 'som automotivo', 'volume alto', 'nao consigo dormir'],
      excludeKeywords: ['agredindo a esposa', 'tiro', 'facada', 'assalto'],
      explanation: 'Ocorrência de ordem pública caracterizada pelo excesso de ruído, música em volume elevado, algazarra ou uso abusivo de instrumentos sonoros.',
      triageQuestions: [
        'Qual a origem exata do som (residência, bar/comércio ou veículo estacionado)?',
        'O barulho persiste neste exato momento?',
        'O solicitante deseja ser identificado pela guarnição para assinar termo de representação ou prefere anonimato?',
        'Há obstrução de via pública ou aglomeração no local?'
      ],
      dispatchMask: 'SOLICITANTE INFORMA PERTURBAÇÃO DO SOSSEGO PROVENIENTE DE [RESIDÊNCIA / COMÉRCIO / VEÍCULO], ONDE HÁ [SOM ALTO / ALGAZARRA] PERSISTENTE. O SOLICITANTE [DESEJA / NÃO DESEJA] IDENTIFICAR-SE NO LOCAL. VIATURA SOLICITADA PARA AVERIGUAÇÃO.'
    },
    {
      id: 'nat-transito-vitima',
      code: 'TRA-001 / ACID-VIT',
      officialNature: 'SINISTRO DE TRÂNSITO COM VÍTIMA (COLISÃO OU ATROPELAMENTO COM FERIDOS)',
      category: 'Trânsito',
      priority: 'Crítica',
      legalBase: 'Arts. 302 e 303 do Código de Trânsito Brasileiro (Lei nº 9.503/97)',
      agency: 'Polícia Militar / SIATE (193) / SAMU (192)',
      requiredGroups: [
        ['acidente', 'colisao', 'batida', 'bateu', 'abalroamento', 'capot', 'atropel', 'moto caiu', 'motociclista'],
        ['vitima', 'ferid', 'machucad', 'sangrando', 'desacordad', 'inconsciente', 'caido no chao', 'preso nas ferragens', 'atropelado', 'atropelou', 'dor', 'fratura', 'ambulancia', 'socorro']
      ],
      boostKeywords: ['atropelamento', 'motociclista caido', 'inconsciente', 'ferragens', 'siate', 'samu'],
      excludeKeywords: ['sem vitimas', 'ninguem se feriu', 'apenas danos materiais'],
      explanation: 'Acidente de trânsito envolvendo pessoas lesionadas, atropelamento ou ocupantes necessitando de socorro médico pré-hospitalar imediato.',
      triageQuestions: [
        'Quantas vítimas estão feridas e se estão conscientes e respirando?',
        'Há alguém preso às ferragens ou risco de incêndio/vazamento de combustível?',
        'O Corpo de Bombeiros (193) ou SAMU (192) já foi acionado?',
        'O causador do acidente permanece no local ou evadiu-se sem prestar socorro?'
      ],
      dispatchMask: 'SOLICITANTE INFORMA SINISTRO DE TRÂNSITO COM VÍTIMA ENVOLVENDO [TIPOS DE VEÍCULOS / PEDESTRE], COM [QUANTIDADE] PESSOA(S) FERIDA(S) NO LOCAL ([CONSCIENTE / INCONSCIENTE]). VIA [TOTALMENTE / PARCIALMENTE] INTERDITADA. SOLICITADO EMPENHO POLICIAL E APOIO MÉDICO.'
    },
    {
      id: 'nat-transito-sem-vitima',
      code: 'TRA-002 / DEM-002',
      officialNature: 'SINISTRO DE TRÂNSITO SEM VÍTIMAS (EXCLUSIVAMENTE DANOS MATERIAIS)',
      category: 'Trânsito',
      priority: 'Baixa',
      legalBase: 'Código de Trânsito Brasileiro (Lei nº 9.503/97)',
      agency: 'Polícia Militar / Órgão Municipal de Trânsito / Boletim Eletrônico',
      requiredGroups: [
        ['acidente', 'colisao', 'batida', 'bateu no meu carro', 'abalroamento', 'encostou no carro', 'retrovisor'],
        ['sem vitima', 'ninguem ferido', 'so danos', 'dano material', 'apenas danos', 'carro', 'veiculo', 'transito']
      ],
      boostKeywords: ['sem vitimas', 'apenas danos materiais', 'bateu na traseira'],
      excludeKeywords: ['ferido', 'sangrando', 'desacordado', 'atropelado'],
      explanation: 'Colisão viária restrita a danos materiais nos veículos, sem pessoas lesionadas.',
      triageQuestions: [
        'Confirma que absolutamente ninguém sofreu ferimentos ou mal-estar?',
        'Os veículos conseguem se locomover para liberar a faixa de rolamento?',
        'Há suspeita de embriaguez ao volante ou princípio de agressão entre os motoristas?',
        'Envolve veículo oficial do Estado/Município ou carga perigosa?'
      ],
      dispatchMask: 'SOLICITANTE INFORMA SINISTRO DE TRÂNSITO SEM VÍTIMAS ENVOLVENDO [VEÍCULOS], RESULTANDO APENAS EM DANOS MATERIAIS. OS VEÍCULOS [OBSTRUEM / NÃO OBSTRUEM] A VIA E [HÁ / NÃO HÁ] ALTERAÇÃO DE ÂNIMOS ENTRE OS CONDUTORES.'
    },
    {
      id: 'nat-lesao-comum',
      code: 'PES-001 / ART-129',
      officialNature: 'LESÃO CORPORAL / AGRESSÃO FÍSICA COM FERIMENTOS',
      category: 'Pessoas',
      priority: 'Alta',
      legalBase: 'Art. 129 do Código Penal',
      agency: 'Polícia Militar / SAMU ou SIATE se necessário',
      requiredGroups: [
        ['agredid', 'agredind', 'agressao', 'briga', 'espanc', 'soco', 'chute', 'facada', 'paulada', 'garrafada', 'ferido', 'sangrando', 'machucou', 'vias de fato']
      ],
      boostKeywords: ['briga em bar', 'vizinho agrediu', 'espancando um homem', 'ferimento na cabeca'],
      excludeKeywords: ['marido', 'esposa', 'companheiro', 'violencia domestica', 'acidente de transito'],
      explanation: 'Ofensa à integridade corporal ou à saúde de outrem fora do contexto de violência doméstica contra a mulher.',
      triageQuestions: [
        'A briga/agressão ainda está acontecendo neste momento?',
        'Há utilização de faca, garrafa quebrada, pedaço de madeira ou arma de fogo?',
        'A vítima apresenta sangramento intenso ou precisa de ambulância?',
        'Quantas pessoas estão envolvidas e quais as vestimentas do agressor?'
      ],
      dispatchMask: 'SOLICITANTE INFORMA OCORRÊNCIA DE LESÃO CORPORAL / AGRESSÃO FÍSICA EM QUE [DINÂMICA DO FATO]. A VÍTIMA ENCONTRA-SE [ESTADO DA VÍTIMA] E O AUTOR, TRAJANDO [VESTIMENTAS], [PERMANECE NO LOCAL / EVADIU-SE]. VIATURA SOLICITADA PARA ATENDIMENTO.'
    },
    {
      id: 'nat-ameaca-comum',
      code: 'PES-002 / DEM-003',
      officialNature: 'AMEAÇA (PROMESSA DE CAUSAR MAL INJUSTO E GRAVE)',
      category: 'Pessoas',
      priority: 'Média',
      legalBase: 'Art. 147 do Código Penal',
      agency: 'Polícia Militar',
      requiredGroups: [
        ['ameac', 'jurado de morte', 'disse que vai me matar', 'intimidando', 'veio tirar satisfacao']
      ],
      boostKeywords: ['vizinho', 'discussao', 'desentendimento', 'ameaca verbal'],
      excludeKeywords: ['marido', 'esposa', 'ex-marido', 'roubo', 'assalto'],
      explanation: 'Ameaça por palavra, escrito, gesto ou meio simbólico de causar mal injusto e grave a alguém.',
      triageQuestions: [
        'O autor da ameaça está presente no local agora?',
        'Ele está portando alguma arma ou objeto perigoso?',
        'Qual o motivo do conflito e quais as vestimentas do indivíduo?'
      ],
      dispatchMask: 'SOLICITANTE RELATA TER SIDO AMEAÇADO POR [IDENTIFICAÇÃO DO AUTOR], QUE PROFERIU AMEAÇAS DE [TIPO DE AMEAÇA]. O INDIVÍDUO [PERMANECE NO LOCAL / EVADIU-SE] E [PORTA / NÃO PORTA] ARMA. VIATURA SOLICITADA PARA AVERIGUAÇÃO.'
    },
    {
      id: 'nat-dano',
      code: 'PAT-004 / DEM-006',
      officialNature: 'DANO AO PATRIMÔNIO PÚBLICO OU PRIVADO (VANDALISMO / DEPREDAÇÃO)',
      category: 'Patrimônio',
      priority: 'Média',
      legalBase: 'Art. 163 do Código Penal',
      agency: 'Polícia Militar / Guarda Municipal',
      requiredGroups: [
        ['dano', 'quebr', 'depred', 'vandalismo', 'pedrada', 'vidraca', 'portao danificado', 'destruindo', 'chutando o portao', 'riscou o carro']
      ],
      boostKeywords: ['quebrando tudo', 'atirou pedra', 'danificou'],
      excludeKeywords: ['para roubar', 'levou objetos'],
      explanation: 'Destruição, inutilização ou deterioração de bem material público ou particular.',
      triageQuestions: [
        'O autor ainda está praticando o dano no local?',
        'O bem atingido é público (escola, praça, ônibus) ou propriedade privada?',
        'O indivíduo utiliza barra de ferro, pedras ou material inflamável?'
      ],
      dispatchMask: 'SOLICITANTE INFORMA DANO AO PATRIMÔNIO EM QUE INDIVÍDUO(S) TRAJANDO [VESTIMENTAS] DANIFICARAM [BEM ATINGIDO]. O AUTOR [PERMANECE NO LOCAL / EVADIU-SE]. VIATURA SOLICITADA PARA AVERIGUAÇÃO.'
    },
    {
      id: 'nat-invasao',
      code: 'PAT-005 / ART-150',
      officialNature: 'VIOLAÇÃO DE DOMICÍLIO (INVASÃO DE IMÓVEL OU QUINTAL)',
      category: 'Patrimônio',
      priority: 'Alta',
      legalBase: 'Art. 150 do Código Penal',
      agency: 'Polícia Militar',
      requiredGroups: [
        ['invadiu', 'invasao', 'entrou sem permissao', 'pulou o muro', 'dentro do meu quintal', 'recusa a sair', 'violacao de domicilio']
      ],
      boostKeywords: ['estranho no quintal', 'pulou a grade', 'escondido nos fundos'],
      excludeKeywords: [],
      explanation: 'Entrada ou permanência clandestina, astuciosa ou contra a vontade expressa de quem de direito em casa alheia ou suas dependências.',
      triageQuestions: [
        'O invasor ainda está dentro do terreno ou da residência?',
        'Ele aparenta estar armado ou tentando subtrair algum objeto?',
        'Quais as vestimentas e características físicas do indivíduo?'
      ],
      dispatchMask: 'SOLICITANTE INFORMA VIOLAÇÃO DE DOMICÍLIO, RELATANDO QUE UM INDIVÍDUO TRAJANDO [VESTIMENTAS] INVADIU [QUINTAL / RESIDÊNCIA] SEM AUTORIZAÇÃO E [PERMANECE NO LOCAL / EVADIU-SE]. VIATURA SOLICITADA PARA AVERIGUAÇÃO.'
    },
    {
      id: 'nat-disparo-arma',
      code: 'ORD-002 / ARMA-01',
      officialNature: 'DISPARO DE ARMA DE FOGO / PORTE ILEGAL DE ARMA DE FOGO',
      category: 'Ordem pública',
      priority: 'Crítica',
      legalBase: 'Arts. 14, 15 e 16 da Lei nº 10.826/2003 (Estatuto do Desarmamento)',
      agency: 'Polícia Militar (Empenho Imediato)',
      requiredGroups: [
        ['disparo de arma', 'tiro', 'tiros', 'ouvindo tiros', 'individuo armado', 'mostrando revolver', 'mostrando pistola', 'tiroteio', 'baleado']
      ],
      boostKeywords: ['ouvi disparos', 'armado na rua', 'baleado', 'pistola na cintura'],
      excludeKeywords: ['bombinha', 'fogos de artificio'],
      explanation: 'Situação de altíssimo risco envolvendo visualização de arma de fogo em via/local público ou audição de disparos.',
      triageQuestions: [
        'Há alguma pessoa caída ou ferida por disparo no local?',
        'O autor dos disparos foi visualizado (roupas, veículo, direção tomada)?',
        'Quantos disparos foram ouvidos e há quanto tempo?'
      ],
      dispatchMask: 'SOLICITANTE INFORMA [DISPAROS DE ARMA DE FOGO / INDIVÍDUO ARMADO] NA VIA PÚBLICA. RELATA QUE [HÁ / NÃO HÁ] VISUALIZAÇÃO DE VÍTIMAS FERIDAS E QUE O SUSPEITO [CARACTERÍSTICAS / VEÍCULO] TOMOU RUMO [DIREÇÃO]. VIATURA SOLICITADA COM PRIORIDADE MÁXIMA.'
    },
    {
      id: 'nat-desaparecimento',
      code: 'PES-003 / DEM-007',
      officialNature: 'PESSOA DESAPARECIDA / LOCALIZAÇÃO DE PESSOA',
      category: 'Pessoas',
      priority: 'Alta',
      legalBase: 'Lei nº 13.812/2019 (Política Nacional de Busca de Pessoas Desaparecidas)',
      agency: 'Polícia Militar / Polícia Civil',
      requiredGroups: [
        ['desaparecid', 'sumiu de casa', 'nao voltou para casa', 'paradeiro desconhecido', 'crianca perdida', 'idoso perdido', 'alzheimer']
      ],
      boostKeywords: ['crianca', 'idoso', 'saiu e nao voltou', 'desapareceu'],
      excludeKeywords: ['furtaram meu carro'],
      explanation: 'Relato de desaparecimento de pessoa sem localização conhecida, exigindo difusão imediata de características quando envolver vulneráveis.',
      triageQuestions: [
        'Qual o nome completo e a idade da pessoa desaparecida?',
        'Possui alguma condição de saúde (Alzheimer, autismo, depressão)?',
        'Quais roupas vestia quando foi vista pela última vez e em qual horário/local?'
      ],
      dispatchMask: 'SOLICITANTE INFORMA O DESAPARECIMENTO DE [NOME E IDADE], VISTO(A) PELA ÚLTIMA VEZ EM [LOCAL E HORÁRIO], TRAJANDO [VESTIMENTAS]. PESSOA [POSSUI / NÃO POSSUI] CONDIÇÃO ESPECIAL DE SAÚDE. SOLICITADA DIFUSÃO NA REDE E ORIENTAÇÃO.'
    },
    {
      id: 'nat-animal',
      code: 'OUT-001 / DEM-008',
      officialNature: 'ANIMAL SOLTO EM VIA PÚBLICA / OMISSÃO DE CAUTELA NA GUARDA DE ANIMAIS',
      category: 'Outros',
      priority: 'Média',
      legalBase: 'Art. 31 da Lei das Contravenções Penais (Decreto-Lei nº 3.688/41)',
      agency: 'Polícia Militar / Corpo de Bombeiros / Fiscalização Municipal',
      requiredGroups: [
        ['animal', 'cachorro', 'cao', 'pitbull', 'cavalo', 'boi', 'gado'],
        ['solto na rua', 'via publica', 'atacando', 'agressivo', 'mordeu', 'na pista', 'risco de acidente', 'sem coleira']
      ],
      boostKeywords: ['pitbull solto', 'cavalo na pista', 'atacou pedestre'],
      excludeKeywords: [],
      explanation: 'Presença de animal feroz solto sem cautela devida ou animal de grande porte oferecendo risco de colisão na via pública.',
      triageQuestions: [
        'O animal atacou ou feriu alguma pessoa no local?',
        'Trata-se de animal agressivo (ex.: cão de grande porte) ou animal na pista de rolamento?',
        'Sabe informar quem é o proprietário ou de qual residência o animal escapou?'
      ],
      dispatchMask: 'SOLICITANTE INFORMA PRESENÇA DE ANIMAL ([ESPÉCIE/PORTE]) SOLTO EM VIA PÚBLICA, GERANDO RISCO A [PEDESTRES / TRÂNSITO DE VEÍCULOS]. [HÁ / NÃO HÁ] VÍTIMAS FERIDAS NO LOCAL. VIATURA SOLICITADA PARA AVERIGUAÇÃO.'
    }
  ];

  // ==========================================================================
  // 3. BANCO DE PERGUNTAS E RESPOSTAS TEÓRICAS (MODO CHATBOT DÚVIDAS)
  // ==========================================================================
  const FAQ_TEORICO = [
    {
      keywords: ['diferenca', 'furto', 'roubo'],
      title: 'Diferença Operacional entre FURTO (Art. 155) e ROUBO (Art. 157)',
      answer: 'A diferença central está no **contato com emprego de violência ou grave ameaça contra a pessoa**:\n\n• **ROUBO (Art. 157 CP - Prioridade Crítica/Alta):** O autor aborda a vítima e utiliza arma de fogo, faca, força física (socos, empurrão, "gravata") ou grave ameaça verbal para tomar o bem.\n• **FURTO (Art. 155 CP):** O autor subtrai o bem **sem violência ou ameaça contra a pessoa** (ex.: leva um veículo estacionado, entra na casa vazia ou puxa um objeto sem agredir ou intimidar a vítima). Atenção: se o ladrão ainda estiver dentro do imóvel, classifique como **Furto em Andamento (Prioridade Alta)**.'
    },
    {
      keywords: ['prazo', '24 horas', 'desaparecimento', 'desaparecido'],
      title: 'Existe prazo de 24 horas para registrar Pessoa Desaparecida?',
      answer: '**NÃO existe prazo de espera de 24 horas.** De acordo com a Lei nº 13.812/2019, o registro e o início das buscas devem ser imediatos, especialmente quando envolver crianças, adolescentes, idosos ou pessoas com deficiência mental/intelectual.'
    },
    {
      keywords: ['diferenca', 'lesao', 'vias de fato'],
      title: 'Diferença entre LESÃO CORPORAL e VIAS DE FATO',
      answer: '• **LESÃO CORPORAL (Art. 129 CP):** A agressão física deixou marcas, ferimentos, sangramento, hematomas, cortes ou dor física constatável.\n• **VIAS DE FATO (Art. 21 LCP):** Agressão física leve que **não deixa vestígios nem ferimentos** na vítima (ex.: empurrão, puxão de roupa ou tapa leve sem lesão). *Observação: se for contra mulher no âmbito doméstico, aplica-se a Lei Maria da Penha em ambos os casos.*'
    },
    {
      keywords: ['acidente', 'quando enviar viatura', 'sem vitima', 'bateu'],
      title: 'Quando empenhar viatura em Acidente de Trânsito Sem Vítimas?',
      answer: 'Em acidentes **apenas com danos materiais**, o solicitante pode ser orientado a registrar o Boletim Eletrônico, **EXCETO** quando houver:\n1. Obstrução total/parcial grave da via sem possibilidade de remoção dos veículos;\n2. Suspeita de embriaguez ao volante de um dos condutores;\n3. Desentendimento grave/ameaça entre as partes no local;\n4. Envolvimento de viatura/veículo oficial ou dano ao patrimônio público (poste, semáforo).'
    }
  ];

  // ==========================================================================
  // 4. GERADOR AUTOMÁTICO DE REDAÇÃO TÉCNICA POLICIAL (PADRÃO COPOM)
  // ==========================================================================
  function formatarRelatoTecnico(relatoBruto) {
    return correctReport(relatoBruto);
  }

  // ==========================================================================
  // 5. FUNÇÃO PRINCIPAL DE ANÁLISE DO CÉREBRO (`analisarEntrada`)
  // ==========================================================================
  function analisarEntrada(textoEntrada, regrasCustomizadas, learnedQuestions=[]) {
    const raw = String(textoEntrada || '').trim();
    const normText = normalizar(raw);
    if (!normText || normText.length < 3) return null;

    const todasRegras = Array.isArray(regrasCustomizadas) && regrasCustomizadas.length
      ? [...regrasCustomizadas, ...REGRAS_BASE]
      : REGRAS_BASE;

    // 1. Verifica se é uma PERGUNTA TEÓRICA direta
    const ehPergunta = raw.includes('?') || /^(qual a diferenca|como funciona|quando usar|o que e|existe prazo|quando enviar)/i.test(normText);
    for (const faq of FAQ_TEORICO) {
      if (faq.keywords.every(k => normText.includes(normalizar(k)))) {
        return {
          tipo: 'faq',
          titulo: faq.title,
          resposta: faq.answer,
          termoOriginal: raw
        };
      }
    }

    // 2. Extração de Entidades e Contexto do Relato
    const contexto = {
      vitimaMulher: contemAlgum(normText, DICIONARIO.vitimaMulher),
      vinculoDomestico: contemAlgum(normText, DICIONARIO.vinculoDomestico),
      presencaMenores: contemAlgum(normText, DICIONARIO.presencaMenores),
      usoArmaFogo: contemAlgum(normText, DICIONARIO.usoArmaFogo),
      usoArmaBranca: contemAlgum(normText, DICIONARIO.usoArmaBranca),
      emAndamento: contemAlgum(normText, DICIONARIO.emAndamento),
      fatoConsumado: contemAlgum(normText, DICIONARIO.fatoConsumado),
      tagsDetectadas: []
    };

    if (contexto.vitimaMulher) contexto.tagsDetectadas.push('👩 Vítima Sexo Feminino');
    if (contexto.vinculoDomestico) contexto.tagsDetectadas.push('🏠 Âmbito Doméstico / Familiar');
    if (contexto.presencaMenores) contexto.tagsDetectadas.push('👶 Presença de Filhos / Menores (Agravante)');
    if (contexto.usoArmaFogo) contexto.tagsDetectadas.push('🔫 Menção a Arma de Fogo (Risco Crítico)');
    if (contexto.usoArmaBranca) contexto.tagsDetectadas.push('🔪 Menção a Arma Branca / Objeto');
    if (contexto.emAndamento) contexto.tagsDetectadas.push('🚨 Crime em Andamento (Flagrante)');
    else if (contexto.fatoConsumado) contexto.tagsDetectadas.push('🕒 Fato Pretérito / Consumado');

    // 3. Pontuação de todas as regras da matriz
    const candidatos = [];

    todasRegras.forEach(regra => {
      let score = 0;
      let gruposAtendidos = 0;
      let termosEncontrados = [];

      const grupos = regra.requiredGroups || [];
      grupos.forEach(grupo => {
        const matches = encontrarTermos(normText, grupo);
        if (matches.length > 0) {
          gruposAtendidos++;
          score += 30 + (matches.length * 6);
          termosEncontrados.push(...matches);
        }
      });

      // Se atendeu TODOS os grupos obrigatórios da natureza, ganha bônus alto de precisão
      if (grupos.length > 0 && gruposAtendidos === grupos.length) {
        score += 50;
      } else if (gruposAtendidos === 0) {
        return; // Ignora se não bateu nenhum grupo principal
      } else if (grupos.length > 1 && gruposAtendidos < grupos.length) {
        // Se bateu apenas metade dos grupos obrigatórios, reduz pontuação
        score -= 25;
      }

      // Palavras de reforço (Boost)
      const boosts = encontrarTermos(normText, regra.boostKeywords || []);
      score += boosts.length * 10;
      termosEncontrados.push(...boosts);

      // Palavras de exclusão (Penalidade)
      const excludes = encontrarTermos(normText, regra.excludeKeywords || []);
      score -= excludes.length * 45;

      // Bônus especial se houver mulher + vínculo doméstico para naturezas Maria da Penha
      if (regra.id.startsWith('nat-vd-') && contexto.vitimaMulher && contexto.vinculoDomestico) {
        score += 35;
      }

      if (score > 20) {
        candidatos.push({
          regra,
          score,
          confianca: Math.min(99, Math.max(45, Math.round(score))),
          termos: [...new Set(termosEncontrados)]
        });
      }
    });

    candidatos.sort((a, b) => b.score - a.score);

    if (!candidatos.length) {
      return {
        tipo: 'indefinido',
        termoOriginal: raw,
        contexto,
        mensagem: 'O relato não atingiu pontuação suficiente para cravar uma natureza específica automaticamente. Verifique os detalhes ou cadastre uma nova regra para este caso na aba "Cérebro 190".'
      };
    }

    const principal = {...candidatos[0],regra:withLearnedTriage(withLegalReferences(candidatos[0].regra),learnedQuestions)};
    const secundarias = candidatos.slice(1, 3);

    return applyTriage({
      tipo: 'classificacao',
      termoOriginal: raw,
      ehPergunta,
      principal: principal.regra,
      confianca: principal.confianca,
      termosDetectados: principal.termos,
      secundarias: secundarias.map(s => s.regra),
      contexto,
      relatoRevisado: formatarRelatoTecnico(raw, contexto, principal.regra)
    },raw);
  }

  // Expõe a API globalmente para o index.html
  global.CEREBRO_190 = {
    versao: '2.0-COPOM',
    regrasBase: REGRAS_BASE.map(withTriageQuestions).map(withLegalReferences),
    faqTeorico: FAQ_TEORICO,
    analisarEntrada: analisarEntrada,
    normalizar: normalizar
  };

})(globalThis);
export const CEREBRO_190 = globalThis.CEREBRO_190;
