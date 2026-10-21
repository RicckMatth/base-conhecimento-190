// Catálogo editorial de apoio. CAT-* são códigos internos, não códigos oficiais do COPOM.
export const CATALOGUE_RULES = [
  {
    "id": "catalogo-001",
    "code": "CAT-001",
    "officialNature": "HOMICÍDIO COMUNICADO",
    "category": "Pessoas",
    "priority": "Alta",
    "requiredGroups": [
      [
        "homicidio",
        "assassinato",
        "assassinaram"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Não presumir óbito nem autoria; registrar a origem da informação.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Há confirmação por equipe competente ou somente relato de terceiros?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-002",
    "code": "CAT-002",
    "officialNature": "TENTATIVA DE HOMICÍDIO",
    "category": "Pessoas",
    "priority": "Crítica",
    "requiredGroups": [
      [
        "tentou matar",
        "tentativa de homicidio"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Descrever conduta e risco atual sem concluir intenção jurídica.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "A vítima está acessível ao socorro e o autor permanece próximo?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-003",
    "code": "CAT-003",
    "officialNature": "PESSOA FERIDA POR ARMA DE FOGO",
    "category": "Pessoas",
    "priority": "Crítica",
    "requiredGroups": [
      [
        "baleado",
        "baleada",
        "ferido por tiro"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Priorizar informação sobre socorro e segurança; não presumir circunstâncias do disparo.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Qual local da vítima e há risco ativo no entorno?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-004",
    "code": "CAT-004",
    "officialNature": "PESSOA FERIDA POR ARMA BRANCA",
    "category": "Pessoas",
    "priority": "Crítica",
    "requiredGroups": [
      [
        "esfaqueado",
        "esfaqueada",
        "ferido por faca"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Distinguir lesão observada de informação indireta.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Há feridos e o autor ainda está com o objeto?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-005",
    "code": "CAT-005",
    "officialNature": "SEQUESTRO OU CÁRCERE PRIVADO",
    "category": "Pessoas",
    "priority": "Crítica",
    "requiredGroups": [
      [
        "sequestro",
        "carcere privado",
        "mantida presa",
        "mantido preso"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Não confundir ausência de contato com privação de liberdade confirmada.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Onde a pessoa está retida e como a restrição foi informada?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-006",
    "code": "CAT-006",
    "officialNature": "SITUAÇÃO COM REFÉNS",
    "category": "Pessoas",
    "priority": "Crítica",
    "requiredGroups": [
      [
        "refem",
        "refens"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Preservar localização e descrição do fato para equipe especializada.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Há contato com pessoas no interior e risco imediato informado?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-007",
    "code": "CAT-007",
    "officialNature": "PERSEGUIÇÃO REITERADA",
    "category": "Pessoas",
    "priority": "Alta",
    "requiredGroups": [
      [
        "stalking",
        "perseguicao reiterada",
        "me segue todos os dias"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Distinguir episódio isolado de perseguição repetida.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "A conduta se repete e o suspeito está próximo agora?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-008",
    "code": "CAT-008",
    "officialNature": "CONSTRANGIMENTO MEDIANTE COAÇÃO",
    "category": "Pessoas",
    "priority": "Alta",
    "requiredGroups": [
      [
        "constrangimento ilegal",
        "obrigando a fazer",
        "coagindo"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Registrar fatos sem concluir enquadramento penal.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Qual ação está sendo exigida e qual ameaça foi empregada?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-009",
    "code": "CAT-009",
    "officialNature": "RIXA OU BRIGA COLETIVA",
    "category": "Pessoas",
    "priority": "Alta",
    "requiredGroups": [
      [
        "briga generalizada",
        "rixa",
        "briga coletiva"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Identificar situação atual sem atribuir papéis não confirmados.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Quantas pessoas participam e há armas ou feridos?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-010",
    "code": "CAT-010",
    "officialNature": "ENCONTRO DE PESSOA APARENTEMENTE SEM VIDA",
    "category": "Pessoas",
    "priority": "Alta",
    "requiredGroups": [
      [
        "corpo encontrado",
        "cadaver",
        "pessoa aparentemente morta"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Não declarar óbito por análise textual.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Qual a localização e existe avaliação de equipe de saúde?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-011",
    "code": "CAT-011",
    "officialNature": "DISCRIMINAÇÃO OU OFENSA RACIAL",
    "category": "Pessoas",
    "priority": "Alta",
    "requiredGroups": [
      [
        "racismo",
        "injuria racial",
        "ofensa racial"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Registrar o relato com fidelidade e acolhimento, sem repetir ofensas desnecessariamente.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Quais palavras ou condutas foram relatadas e há ameaça atual?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-012",
    "code": "CAT-012",
    "officialNature": "DISCRIMINAÇÃO POR RELIGIÃO OU ORIENTAÇÃO SEXUAL",
    "category": "Pessoas",
    "priority": "Alta",
    "requiredGroups": [
      [
        "intolerancia religiosa",
        "homofobia",
        "transfobia"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Não deduzir identidade ou condição pessoal; registrar somente o informado.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Qual conduta ocorreu e a pessoa permanece exposta?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-013",
    "code": "CAT-013",
    "officialNature": "CALÚNIA, DIFAMAÇÃO OU INJÚRIA COMUNICADA",
    "category": "Pessoas",
    "priority": "Média",
    "requiredGroups": [
      [
        "calunia",
        "difamacao",
        "injuria"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Distinguir ofensa, falsa atribuição e ameaça sem decidir tipificação.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Qual conteúdo foi comunicado e houve ameaça associada?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-014",
    "code": "CAT-014",
    "officialNature": "VIOLÊNCIA PSICOLÓGICA CONTRA MULHER",
    "category": "Proteção",
    "priority": "Alta",
    "requiredGroups": [
      [
        "violencia psicologica",
        "controla minhas amizades",
        "me humilha todos os dias"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Acolher o relato; não exigir sinais de agressão física.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Existe ameaça, isolamento ou impedimento de pedir ajuda?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-015",
    "code": "CAT-015",
    "officialNature": "VIOLÊNCIA PATRIMONIAL EM CONTEXTO DOMÉSTICO",
    "category": "Proteção",
    "priority": "Alta",
    "requiredGroups": [
      [
        "violencia patrimonial",
        "reteve meus documentos",
        "destruiu meus documentos"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Registrar vínculo informado e restrições descritas.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Há retenção de recursos ou documentos e risco atual?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-016",
    "code": "CAT-016",
    "officialNature": "IMPORTUNAÇÃO SEXUAL COMUNICADA",
    "category": "Proteção",
    "priority": "Alta",
    "requiredGroups": [
      [
        "importunacao sexual",
        "se masturbando na frente",
        "apalpou sem consentimento"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Evitar perguntas invasivas; registrar somente informação necessária à proteção.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "A vítima está segura e o suspeito permanece no local?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-017",
    "code": "CAT-017",
    "officialNature": "EXPLORAÇÃO SEXUAL COMUNICADA",
    "category": "Proteção",
    "priority": "Alta",
    "requiredGroups": [
      [
        "exploracao sexual",
        "explorando sexualmente"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Não solicitar imagens ou detalhes íntimos.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Existe pessoa em risco atual e onde pode ser localizada?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-018",
    "code": "CAT-018",
    "officialNature": "ABANDONO DE PESSOA INCAPAZ",
    "category": "Proteção",
    "priority": "Alta",
    "requiredGroups": [
      [
        "abandono de incapaz",
        "incapaz abandonado"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Avaliar vulnerabilidade relatada sem presumir incapacidade por aparência.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "A pessoa consegue se proteger e há responsável acessível?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-019",
    "code": "CAT-019",
    "officialNature": "VIOLÊNCIA CONTRA PESSOA COM DEFICIÊNCIA",
    "category": "Proteção",
    "priority": "Alta",
    "requiredGroups": [
      [
        "pessoa com deficiencia agredida",
        "maus tratos a deficiente"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Não presumir capacidade ou incapacidade; adaptar acolhimento ao relato.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Quais necessidades de comunicação e apoio foram informadas?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-020",
    "code": "CAT-020",
    "officialNature": "CRIANÇA DESACOMPANHADA OU PERDIDA",
    "category": "Proteção",
    "priority": "Alta",
    "requiredGroups": [
      [
        "crianca perdida",
        "crianca sozinha",
        "crianca desacompanhada"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Não divulgar dados da criança; encaminhar conforme rede de proteção.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Qual localização, idade aproximada e condição atual?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-021",
    "code": "CAT-021",
    "officialNature": "LOCALIZAÇÃO DE PESSOA DESAPARECIDA",
    "category": "Proteção",
    "priority": "Média",
    "requiredGroups": [
      [
        "desaparecido localizado",
        "desaparecida localizada",
        "encontrei meu familiar"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Distinguir localização de novo desaparecimento.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Há registro anterior e a pessoa está em segurança?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-022",
    "code": "CAT-022",
    "officialNature": "PESSOA DESORIENTADA EM VIA PÚBLICA",
    "category": "Proteção",
    "priority": "Alta",
    "requiredGroups": [
      [
        "pessoa desorientada",
        "idoso perdido",
        "idosa perdida"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Não presumir intoxicação ou diagnóstico.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "A pessoa consegue informar contato e necessita socorro?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-023",
    "code": "CAT-023",
    "officialNature": "PESSOA EM CRISE COM RISCO DE AUTOAGRESSÃO",
    "category": "Proteção",
    "priority": "Crítica",
    "requiredGroups": [
      [
        "tentando se matar",
        "risco de suicidio",
        "quer se matar",
        "autoagressao"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Priorizar acolhimento e serviço competente; não produzir instruções clínicas.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Qual a localização e existe perigo imediato ou ferimento?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-024",
    "code": "CAT-024",
    "officialNature": "VIOLÊNCIA EM AMBIENTE ESCOLAR",
    "category": "Proteção",
    "priority": "Crítica",
    "requiredGroups": [
      [
        "ataque na escola",
        "ameaca de ataque escolar",
        "violencia escolar"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Distinguir ameaça comunicada de ataque em curso.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "A ameaça é atual, qual unidade e há pessoas feridas?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-025",
    "code": "CAT-025",
    "officialNature": "INTIMIDAÇÃO SISTEMÁTICA COMUNICADA",
    "category": "Proteção",
    "priority": "Média",
    "requiredGroups": [
      [
        "bullying",
        "cyberbullying"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Registrar contexto e eventual risco imediato sem minimizar a violência.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Há repetição, ameaça ou exposição de dados?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-026",
    "code": "CAT-026",
    "officialNature": "ROUBO DE VEÍCULO COMUNICADO",
    "category": "Patrimônio",
    "priority": "Alta",
    "requiredGroups": [
      [
        "roubaram meu carro",
        "roubo de veiculo",
        "levaram a moto armados"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Distinguir subtração com violência ou ameaça de furto.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Qual veículo, direção de saída e houve feridos?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-027",
    "code": "CAT-027",
    "officialNature": "ROUBO A ESTABELECIMENTO COMUNICADO",
    "category": "Patrimônio",
    "priority": "Alta",
    "requiredGroups": [
      [
        "assalto ao comercio",
        "assalto a loja",
        "roubo a estabelecimento"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Não inferir armas quando não informadas.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "O fato está em curso e há pessoas no interior?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-028",
    "code": "CAT-028",
    "officialNature": "ROUBO A TRANSPORTE COLETIVO COMUNICADO",
    "category": "Patrimônio",
    "priority": "Alta",
    "requiredGroups": [
      [
        "assalto no onibus",
        "roubo em coletivo"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Registrar deslocamento informado sem estimar rota.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Qual linha, sentido e localização atual?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-029",
    "code": "CAT-029",
    "officialNature": "SUBTRAÇÃO DE CARGA COMUNICADA",
    "category": "Patrimônio",
    "priority": "Alta",
    "requiredGroups": [
      [
        "roubo de carga",
        "furto de carga"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Distinguir subtração, ameaça e eventual privação de liberdade.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Há motorista retido e qual a localização conhecida?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-030",
    "code": "CAT-030",
    "officialNature": "RECEPTAÇÃO SUSPEITA",
    "category": "Patrimônio",
    "priority": "Média",
    "requiredGroups": [
      [
        "receptacao",
        "vendendo produto roubado"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Preço ou aparência isolados não comprovam origem ilícita.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Qual evidência relaciona o objeto a uma subtração?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-031",
    "code": "CAT-031",
    "officialNature": "APROPRIAÇÃO INDÉBITA COMUNICADA",
    "category": "Patrimônio",
    "priority": "Média",
    "requiredGroups": [
      [
        "apropriacao indebita",
        "nao devolveu objeto emprestado"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Não confundir disputa contratual com crime automaticamente.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Como o bem foi entregue e qual a recusa relatada?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-032",
    "code": "CAT-032",
    "officialNature": "INVASÃO OU OCUPAÇÃO DE TERRENO COMUNICADA",
    "category": "Patrimônio",
    "priority": "Média",
    "requiredGroups": [
      [
        "invasao de terreno",
        "ocupacao de terreno"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Não decidir posse ou propriedade; registrar documentos apenas como informação.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Há violência, ameaça ou pessoas em risco no local?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-033",
    "code": "CAT-033",
    "officialNature": "FURTO DE CABOS OU INFRAESTRUTURA",
    "category": "Patrimônio",
    "priority": "Alta",
    "requiredGroups": [
      [
        "furto de cabos",
        "roubando fios",
        "cortando fios do poste"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Distinguir manutenção autorizada de subtração mediante fatos observados.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Há risco elétrico e qual serviço foi afetado?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-034",
    "code": "CAT-034",
    "officialNature": "VEÍCULO ABANDONADO COMUNICADO",
    "category": "Patrimônio",
    "priority": "Média",
    "requiredGroups": [
      [
        "veiculo abandonado",
        "carro abandonado"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Abandono aparente não prova origem criminosa.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Há ocupantes, risco ou indícios objetivos de subtração?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-035",
    "code": "CAT-035",
    "officialNature": "LOCALIZAÇÃO DE VEÍCULO SUBTRAÍDO",
    "category": "Patrimônio",
    "priority": "Média",
    "requiredGroups": [
      [
        "carro roubado localizado",
        "veiculo furtado encontrado"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Não orientar aproximação nem recuperação por conta própria.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Onde está o veículo e há confirmação do registro?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-036",
    "code": "CAT-036",
    "officialNature": "CONDUÇÃO PERIGOSA COMUNICADA",
    "category": "Trânsito",
    "priority": "Alta",
    "requiredGroups": [
      [
        "direcao perigosa",
        "conducao perigosa",
        "dirigindo na contramao"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Registrar manobras observadas sem presumir intenção.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Qual via, sentido e descrição do veículo?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-037",
    "code": "CAT-037",
    "officialNature": "CONDUTOR COM SINAIS DE ALTERAÇÃO",
    "category": "Trânsito",
    "priority": "Alta",
    "requiredGroups": [
      [
        "motorista embriagado",
        "dirigindo bebado",
        "condutor embriagado"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "A suspeita não substitui constatação competente.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Quais sinais foram observados e o veículo está em movimento?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-038",
    "code": "CAT-038",
    "officialNature": "DISPUTA DE CORRIDA EM VIA PÚBLICA",
    "category": "Trânsito",
    "priority": "Alta",
    "requiredGroups": [
      [
        "racha na rua",
        "corrida ilegal",
        "disputa de racha"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Distinguir ruído de disputa observada.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Qual trecho e há circulação de pedestres?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-039",
    "code": "CAT-039",
    "officialNature": "OBSTRUÇÃO OU PERIGO NA PISTA",
    "category": "Trânsito",
    "priority": "Alta",
    "requiredGroups": [
      [
        "arvore na pista",
        "objeto na pista",
        "oleo na pista",
        "via bloqueada"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Registrar risco e necessidade de órgão responsável pela via.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Qual faixa, sentido e dimensão aproximada do bloqueio?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-040",
    "code": "CAT-040",
    "officialNature": "SINISTRO COM CARGA PERIGOSA",
    "category": "Trânsito",
    "priority": "Crítica",
    "requiredGroups": [
      [
        "acidente com produto quimico",
        "caminhao tanque tombou"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Não orientar aproximação ou contato com a carga.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Há vazamento, identificação visível à distância ou feridos?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-041",
    "code": "CAT-041",
    "officialNature": "SINISTRO COM PESSOA PRESA NO VEÍCULO",
    "category": "Trânsito",
    "priority": "Crítica",
    "requiredGroups": [
      [
        "presa nas ferragens",
        "preso nas ferragens"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Não inferir estado clínico; encaminhar necessidade de resgate.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Qual localização e quantas pessoas estão presas?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-042",
    "code": "CAT-042",
    "officialNature": "OMISSÃO DE SOCORRO EM SINISTRO COMUNICADA",
    "category": "Trânsito",
    "priority": "Alta",
    "requiredGroups": [
      [
        "atropelou e fugiu",
        "bateu e fugiu"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Priorizar localização das vítimas e informações já conhecidas.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Há feridos e quais dados do veículo foram observados?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-043",
    "code": "CAT-043",
    "officialNature": "ESTACIONAMENTO IRREGULAR COMUNICADO",
    "category": "Trânsito",
    "priority": "Média",
    "requiredGroups": [
      [
        "estacionamento irregular",
        "bloqueando garagem"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Distinguir demanda de fiscalização de ocorrência com ameaça.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Há risco ou impedimento de acesso essencial?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-044",
    "code": "CAT-044",
    "officialNature": "MAUS-TRATOS A ANIMAL",
    "category": "Meio ambiente",
    "priority": "Alta",
    "requiredGroups": [
      [
        "maus tratos a animal",
        "batendo no cachorro",
        "maltratando cachorro",
        "maltratando gato"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Registrar sinais e contexto, sem presumir autoria.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "O animal está em risco atual e qual conduta foi observada?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-045",
    "code": "CAT-045",
    "officialNature": "ANIMAL SILVESTRE EM ÁREA URBANA",
    "category": "Meio ambiente",
    "priority": "Alta",
    "requiredGroups": [
      [
        "cobra dentro de casa",
        "animal silvestre na rua",
        "onca na cidade"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Não orientar captura ou aproximação.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Qual espécie aparente e há contato com pessoas?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-046",
    "code": "CAT-046",
    "officialNature": "CAÇA OU CAPTURA DE FAUNA COMUNICADA",
    "category": "Meio ambiente",
    "priority": "Média",
    "requiredGroups": [
      [
        "caca ilegal",
        "cacando animais",
        "captura ilegal"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Registrar local e conduta sem presumir autorização inexistente.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Qual atividade foi observada e há armas?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-047",
    "code": "CAT-047",
    "officialNature": "COMÉRCIO DE FAUNA COMUNICADO",
    "category": "Meio ambiente",
    "priority": "Média",
    "requiredGroups": [
      [
        "trafico de animais",
        "vendendo animais silvestres"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Não orientar negociação ou investigação por conta própria.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Qual local e quais animais foram informados?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-048",
    "code": "CAT-048",
    "officialNature": "DESMATAMENTO OU CORTE DE VEGETAÇÃO COMUNICADO",
    "category": "Meio ambiente",
    "priority": "Média",
    "requiredGroups": [
      [
        "desmatamento",
        "corte ilegal de arvores"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Autorização ambiental deve ser verificada pelo órgão competente.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Qual área e a atividade está em andamento?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-049",
    "code": "CAT-049",
    "officialNature": "POLUIÇÃO OU DESCARTE IRREGULAR",
    "category": "Meio ambiente",
    "priority": "Média",
    "requiredGroups": [
      [
        "despejo de esgoto",
        "descarte irregular",
        "poluicao do rio"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Não solicitar coleta nem contato com substâncias.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Qual material aparente e há pessoas expostas?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-050",
    "code": "CAT-050",
    "officialNature": "INCÊNDIO EM VEGETAÇÃO",
    "category": "Meio ambiente",
    "priority": "Alta",
    "requiredGroups": [
      [
        "incendio florestal",
        "mata pegando fogo",
        "queimada"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Distinguir foco em vegetação de incêndio estrutural.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Há risco a casas, pessoas ou vias próximas?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-051",
    "code": "CAT-051",
    "officialNature": "PESCA POSSIVELMENTE IRREGULAR",
    "category": "Meio ambiente",
    "priority": "Média",
    "requiredGroups": [
      [
        "pesca ilegal",
        "pesca predatoria"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Não concluir irregularidade sem verificação competente.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Qual local e atividade foram observados?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-052",
    "code": "CAT-052",
    "officialNature": "VAZAMENTO DE GÁS COMUNICADO",
    "category": "Emergência",
    "priority": "Crítica",
    "requiredGroups": [
      [
        "vazamento de gas",
        "cheiro forte de gas"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Encaminhar ao serviço competente sem instruções técnicas de intervenção.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Qual local e existem pessoas expostas ou fogo?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-053",
    "code": "CAT-053",
    "officialNature": "EXPLOSÃO COMUNICADA",
    "category": "Emergência",
    "priority": "Crítica",
    "requiredGroups": [
      [
        "explosao",
        "botijao explodiu"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Não presumir causa da explosão.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Há feridos, incêndio ou risco ainda presente?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-054",
    "code": "CAT-054",
    "officialNature": "DESABAMENTO OU RISCO ESTRUTURAL",
    "category": "Emergência",
    "priority": "Crítica",
    "requiredGroups": [
      [
        "desabamento",
        "predio desabou",
        "risco de desabar"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Registrar acesso conhecido; não orientar entrada na área.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Há pessoas atingidas ou no interior?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-055",
    "code": "CAT-055",
    "officialNature": "ALAGAMENTO OU INUNDAÇÃO",
    "category": "Emergência",
    "priority": "Alta",
    "requiredGroups": [
      [
        "alagamento",
        "enchente",
        "inundacao"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Não orientar travessia de área inundada.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Há pessoas isoladas, correnteza ou risco imediato?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-056",
    "code": "CAT-056",
    "officialNature": "DESLIZAMENTO DE TERRA",
    "category": "Emergência",
    "priority": "Crítica",
    "requiredGroups": [
      [
        "deslizamento",
        "desmoronamento de terra"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Acionar avaliação competente sem instruções de resgate improvisado.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Há imóveis atingidos e pessoas desaparecidas?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-057",
    "code": "CAT-057",
    "officialNature": "FIAÇÃO ENERGIZADA CAÍDA",
    "category": "Emergência",
    "priority": "Crítica",
    "requiredGroups": [
      [
        "fio caido",
        "cabo eletrico caido",
        "poste energizado"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Não orientar contato com cabos ou aproximação.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Qual local e há pessoas atingidas?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-058",
    "code": "CAT-058",
    "officialNature": "PESSOA PRESA EM ELEVADOR",
    "category": "Emergência",
    "priority": "Alta",
    "requiredGroups": [
      [
        "presa no elevador",
        "preso no elevador"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Não orientar abertura ou saída improvisada.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Qual prédio, quantidade de pessoas e há mal-estar?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-059",
    "code": "CAT-059",
    "officialNature": "PESSOA INCONSCIENTE COMUNICADA",
    "category": "Emergência",
    "priority": "Crítica",
    "requiredGroups": [
      [
        "pessoa inconsciente",
        "pessoa desmaiada",
        "nao responde"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Não fornecer diagnóstico; transferir orientações clínicas ao serviço competente.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Qual localização e há serviço de saúde em contato?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-060",
    "code": "CAT-060",
    "officialNature": "INTOXICAÇÃO OU EXPOSIÇÃO A SUBSTÂNCIA",
    "category": "Emergência",
    "priority": "Crítica",
    "requiredGroups": [
      [
        "intoxicacao",
        "envenenamento",
        "inalou produto"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Não orientar tratamento caseiro ou manuseio de produto.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Qual substância foi informada e há pessoas expostas?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-061",
    "code": "CAT-061",
    "officialNature": "ACIDENTE DE TRABALHO COMUNICADO",
    "category": "Emergência",
    "priority": "Alta",
    "requiredGroups": [
      [
        "acidente de trabalho",
        "preso em maquina"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Distinguir necessidade imediata de socorro de apuração posterior.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Há feridos, aprisionamento ou risco ativo?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-062",
    "code": "CAT-062",
    "officialNature": "COMÉRCIO DE DROGAS SUSPEITO",
    "category": "Ordem pública",
    "priority": "Alta",
    "requiredGroups": [
      [
        "trafico de drogas",
        "vendendo drogas"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Não inferir tráfico por aparência, local ou condição social.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Qual conduta concreta foi observada e há risco atual?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-063",
    "code": "CAT-063",
    "officialNature": "MATERIAL SUSPEITO DE SER DROGA LOCALIZADO",
    "category": "Ordem pública",
    "priority": "Média",
    "requiredGroups": [
      [
        "encontrei drogas",
        "pacote de droga encontrado"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Não orientar toque, transporte ou identificação por experimentação.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Onde está o material e há pessoas próximas?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-064",
    "code": "CAT-064",
    "officialNature": "OBJETO SUSPEITO DE SER EXPLOSIVO",
    "category": "Ordem pública",
    "priority": "Crítica",
    "requiredGroups": [
      [
        "suspeita de bomba",
        "objeto explosivo",
        "ameaca de bomba"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Não orientar manuseio ou inspeção do objeto.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Qual localização e como a suspeita foi comunicada?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-065",
    "code": "CAT-065",
    "officialNature": "ARMA LOCALIZADA",
    "category": "Ordem pública",
    "priority": "Alta",
    "requiredGroups": [
      [
        "encontrei uma arma",
        "arma abandonada"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Não orientar manuseio ou transporte.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Onde está o objeto e está acessível a terceiros?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-066",
    "code": "CAT-066",
    "officialNature": "TUMULTO EM EVENTO",
    "category": "Ordem pública",
    "priority": "Alta",
    "requiredGroups": [
      [
        "tumulto",
        "confusao em evento"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Distinguir aglomeração pacífica de risco concreto.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Há feridos, esmagamento ou bloqueio de saídas?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-067",
    "code": "CAT-067",
    "officialNature": "FUGA DE CUSTÓDIA COMUNICADA",
    "category": "Ordem pública",
    "priority": "Alta",
    "requiredGroups": [
      [
        "fuga de preso",
        "fuga de detento"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Registrar fonte e dados conhecidos sem incentivar perseguição.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Qual unidade, horário e direção informada?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-068",
    "code": "CAT-068",
    "officialNature": "DESCUMPRIMENTO DE ORDEM JUDICIAL COMUNICADO",
    "category": "Ordem pública",
    "priority": "Média",
    "requiredGroups": [
      [
        "descumprimento de ordem judicial"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Não decidir alcance ou validade da ordem por relato.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Qual ordem foi informada e existe ameaça atual?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-069",
    "code": "CAT-069",
    "officialNature": "DENÚNCIA DE VIOLÊNCIA PRATICADA POR AGENTE PÚBLICO",
    "category": "Ordem pública",
    "priority": "Alta",
    "requiredGroups": [
      [
        "violencia policial",
        "abuso de autoridade"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Registrar de forma imparcial e encaminhar ao canal competente.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Há vítima em risco atual e necessidade de socorro?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-070",
    "code": "CAT-070",
    "officialNature": "EXTRAVIO DE DOCUMENTOS OU OBJETOS",
    "category": "Atendimento",
    "priority": "Média",
    "requiredGroups": [
      [
        "perdi meus documentos",
        "perda de documentos",
        "extravio"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Distinguir extravio de furto e indicar canal conforme disponibilidade local.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Houve perda ou indício de subtração por terceiro?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-071",
    "code": "CAT-071",
    "officialNature": "DOCUMENTO OU OBJETO ENCONTRADO",
    "category": "Atendimento",
    "priority": "Média",
    "requiredGroups": [
      [
        "documento encontrado",
        "carteira encontrada"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Não divulgar documentos nem dados de terceiros.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Qual local e tipo de objeto, sem expor dados pessoais?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-072",
    "code": "CAT-072",
    "officialNature": "CONFLITO DE VIZINHANÇA COMUNICADO",
    "category": "Atendimento",
    "priority": "Média",
    "requiredGroups": [
      [
        "conflito de vizinhos",
        "briga de vizinhos"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Distinguir desacordo civil de violência relatada.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Há ameaça, agressão ou dano em curso?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-073",
    "code": "CAT-073",
    "officialNature": "DESACORDO COMERCIAL COMUNICADO",
    "category": "Atendimento",
    "priority": "Média",
    "requiredGroups": [
      [
        "desacordo comercial",
        "produto nao entregue",
        "cobranca indevida"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Não tratar inadimplemento como crime automaticamente.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Houve ameaça, fraude informada ou apenas divergência contratual?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  },
  {
    "id": "catalogo-074",
    "code": "CAT-074",
    "officialNature": "PEDIDO DE APOIO A OUTRO SERVIÇO",
    "category": "Atendimento",
    "priority": "Alta",
    "requiredGroups": [
      [
        "apoio ao samu",
        "apoio ao conselho tutelar",
        "apoio aos bombeiros"
      ]
    ],
    "boostKeywords": [],
    "excludeKeywords": [],
    "legalBase": "Enquadramento e código oficial dependem de validação institucional.",
    "agency": "Conferir competência e fluxo de atendimento local.",
    "explanation": "Confirmar solicitação e competência pelo fluxo institucional.",
    "triageQuestions": [
      "Qual é o local e a referência de acesso?",
      "Qual serviço solicita, finalidade e risco informado?",
      "O fato está acontecendo agora? Há risco imediato ou necessidade de socorro?"
    ],
    "dispatchMask": "SOLICITANTE RELATA [FATO OBSERVADO OU INFORMADO]. LOCAL [CONFIRMAR]. HORÁRIO [INFORMADO]. SITUAÇÃO ATUAL [CONFIRMAR]. RISCOS E ENVOLVIDOS [SOMENTE DADOS INFORMADOS]. PROVIDÊNCIAS [REGISTRAR APENAS AS REALIZADAS].",
    "status": "orientativa",
    "codeType": "interno"
  }
];
