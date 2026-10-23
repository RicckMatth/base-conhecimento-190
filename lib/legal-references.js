export const LEGAL_REVIEW_DATE="2026-10-23";
export const LEGAL_SOURCES = {
  "CP": {
    "title": "Código Penal - Decreto-Lei nº 2.848/1940",
    "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm"
  },
  "MP": {
    "title": "Lei Maria da Penha - Lei nº 11.340/2006",
    "url": "https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2006/lei/l11340.htm"
  },
  "LCP": {
    "title": "Lei das Contravenções Penais - Decreto-Lei nº 3.688/1941",
    "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del3688.htm"
  },
  "CTB": {
    "title": "Código de Trânsito Brasileiro - Lei nº 9.503/1997",
    "url": "https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm"
  },
  "AMB": {
    "title": "Lei de Crimes Ambientais - Lei nº 9.605/1998",
    "url": "https://www.planalto.gov.br/ccivil_03/leis/l9605.htm"
  },
  "ARM": {
    "title": "Estatuto do Desarmamento - Lei nº 10.826/2003",
    "url": "https://www.planalto.gov.br/ccivil_03/leis/2003/l10.826.htm"
  },
  "DRO": {
    "title": "Lei de Drogas - Lei nº 11.343/2006",
    "url": "https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2006/lei/l11343.htm"
  },
  "RAC": {
    "title": "Lei nº 7.716/1989 - Crimes de racismo",
    "url": "https://www.planalto.gov.br/ccivil_03/leis/l7716compilado.htm"
  },
  "IDO": {
    "title": "Estatuto da Pessoa Idosa - Lei nº 10.741/2003",
    "url": "https://www.planalto.gov.br/ccivil_03/leis/2003/l10.741.htm"
  },
  "ECA": {
    "title": "Estatuto da Criança e do Adolescente - Lei nº 8.069/1990",
    "url": "https://www.planalto.gov.br/ccivil_03/leis/l8069.htm"
  },
  "PCD": {
    "title": "Lei Brasileira de Inclusão - Lei nº 13.146/2015",
    "url": "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13146.htm"
  },
  "ABU": {
    "title": "Lei de Abuso de Autoridade - Lei nº 13.869/2019",
    "url": "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2019/lei/l13869.htm"
  },
  "DES": {
    "title": "Política de Busca de Pessoas Desaparecidas - Lei nº 13.812/2019",
    "url": "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2019/lei/l13812.htm"
  },
  "STF": {
    "title": "STF - ADO 26 e MI 4733",
    "url": "https://www.stf.jus.br/arquivo/cms/publicacaoBOInternet/anexo/link_download/casos_relevantes/pt/ADO_26.pdf"
  }
};
export const LEGAL_REFERENCES = {
  "nat-vd-lesao": {
    "status": "cp",
    "note": "Confirmar lesão e contexto. O § 9º e o § 13 têm requisitos próprios; não aplicar ambos automaticamente. A Lei Maria da Penha descreve o contexto de proteção, não um crime único de agressão.",
    "references": [
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Art. 129, §§ 9º e 13",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "Conforme vínculo e razões da condição do sexo feminino.",
        "kind": "penal"
      },
      {
        "lawId": "MP",
        "law": "Lei Maria da Penha - Lei nº 11.340/2006",
        "article": "Arts. 5º e 7º, I",
        "url": "https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2006/lei/l11340.htm",
        "condition": "Contexto doméstico/familiar e violência física.",
        "kind": "protection"
      }
    ]
  },
  "nat-vd-ameaca": {
    "status": "cp",
    "note": "Ameaça exige promessa de mal injusto e grave. Conferir os requisitos específicos do § 1º; a aplicação da Lei Maria da Penha depende do contexto.",
    "references": [
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Art. 147, caput e § 1º",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "§ 1º quando presentes razões da condição do sexo feminino.",
        "kind": "penal"
      },
      {
        "lawId": "MP",
        "law": "Lei Maria da Penha - Lei nº 11.340/2006",
        "article": "Arts. 5º e 7º, II",
        "url": "https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2006/lei/l11340.htm",
        "condition": "Proteção em contexto doméstico/familiar.",
        "kind": "protection"
      }
    ]
  },
  "nat-vd-mpu": {
    "status": "special",
    "note": "O crime específico está na Lei Maria da Penha, não no Código Penal. Confirmar decisão protetiva e seu descumprimento.",
    "references": [
      {
        "lawId": "MP",
        "law": "Lei Maria da Penha - Lei nº 11.340/2006",
        "article": "Art. 24-A",
        "url": "https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2006/lei/l11340.htm",
        "condition": "",
        "kind": "penal"
      }
    ]
  },
  "nat-roubo-geral": {
    "status": "cp",
    "note": "Confirmar subtração e violência ou grave ameaça. O tipo de bem ou local não basta para definir qualificadoras ou causas de aumento.",
    "references": [
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Art. 157",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "",
        "kind": "penal"
      }
    ]
  },
  "catalogo-026": {
    "status": "cp",
    "note": "Confirmar subtração e violência ou grave ameaça. O tipo de bem ou local não basta para definir qualificadoras ou causas de aumento.",
    "references": [
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Art. 157",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "",
        "kind": "penal"
      }
    ]
  },
  "catalogo-027": {
    "status": "cp",
    "note": "Confirmar subtração e violência ou grave ameaça. O tipo de bem ou local não basta para definir qualificadoras ou causas de aumento.",
    "references": [
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Art. 157",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "",
        "kind": "penal"
      }
    ]
  },
  "catalogo-028": {
    "status": "cp",
    "note": "Confirmar subtração e violência ou grave ameaça. O tipo de bem ou local não basta para definir qualificadoras ou causas de aumento.",
    "references": [
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Art. 157",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "",
        "kind": "penal"
      }
    ]
  },
  "nat-furto-andamento": {
    "status": "cp",
    "note": "Confirmar subtração sem violência ou grave ameaça. O rompimento de obstáculo pode atrair o § 4º, I; mera entrada em imóvel não prova a qualificadora.",
    "references": [
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Art. 155, caput e § 4º, I",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "Qualificadora somente se comprovados seus elementos.",
        "kind": "penal"
      },
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Art. 14, II",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "Se houver tentativa, conforme início de execução e não consumação.",
        "kind": "penal"
      }
    ]
  },
  "nat-furto-consumado": {
    "status": "cp",
    "note": "Furto consumado não depende de suspeito permanecer no local. Qualificadoras exigem elementos próprios.",
    "references": [
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Art. 155",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "",
        "kind": "penal"
      }
    ]
  },
  "nat-perturbacao": {
    "status": "special",
    "note": "Referência na Lei das Contravenções Penais. Conferir as condutas previstas no artigo; não é artigo do Código Penal.",
    "references": [
      {
        "lawId": "LCP",
        "law": "Lei das Contravenções Penais - Decreto-Lei nº 3.688/1941",
        "article": "Art. 42",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del3688.htm",
        "condition": "",
        "kind": "penal"
      }
    ]
  },
  "nat-transito-vitima": {
    "status": "special",
    "note": "Lesão culposa na direção pode enquadrar-se no art. 303. A existência de sinistro com ferido, isoladamente, não comprova responsabilidade penal.",
    "references": [
      {
        "lawId": "CTB",
        "law": "Código de Trânsito Brasileiro - Lei nº 9.503/1997",
        "article": "Art. 303",
        "url": "https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm",
        "condition": "Se houver lesão culposa na direção de veículo automotor.",
        "kind": "penal"
      }
    ]
  },
  "nat-transito-sem-vitima": {
    "status": "service",
    "note": "Sinistro apenas com dano material não é, por si só, crime. Conferir responsabilidades e eventual infração administrativa.",
    "references": [
      {
        "lawId": "CTB",
        "law": "Código de Trânsito Brasileiro - Lei nº 9.503/1997",
        "article": "Art. 178",
        "url": "https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm",
        "condition": "Hipótese administrativa de não remoção do veículo quando necessária à segurança e fluidez.",
        "kind": "administrative"
      }
    ]
  },
  "nat-lesao-comum": {
    "status": "cp",
    "note": "Lesão envolve ofensa à integridade corporal ou à saúde. Ausência de marca aparente não exclui lesão; agressão sem lesão pode exigir exame de outra figura.",
    "references": [
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Art. 129",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "",
        "kind": "penal"
      },
      {
        "lawId": "LCP",
        "law": "Lei das Contravenções Penais - Decreto-Lei nº 3.688/1941",
        "article": "Art. 21",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del3688.htm",
        "condition": "Vias de fato, se presentes seus requisitos e não houver crime mais grave.",
        "kind": "penal"
      }
    ]
  },
  "nat-ameaca-comum": {
    "status": "cp",
    "note": "Confirmar promessa de mal injusto e grave; expressão genérica de conflito não basta.",
    "references": [
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Art. 147",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "",
        "kind": "penal"
      }
    ]
  },
  "nat-dano": {
    "status": "cp",
    "note": "Confirmar destruição, inutilização ou deterioração de coisa alheia e demais elementos. Nem todo prejuízo decorre de dano penal.",
    "references": [
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Art. 163",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "",
        "kind": "penal"
      }
    ]
  },
  "extra-dano": {
    "status": "cp",
    "note": "Confirmar destruição, inutilização ou deterioração de coisa alheia e demais elementos. Nem todo prejuízo decorre de dano penal.",
    "references": [
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Art. 163",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "",
        "kind": "penal"
      }
    ]
  },
  "nat-invasao": {
    "status": "cp",
    "note": "Verificar entrada ou permanência contra vontade em casa alheia ou dependências; disputa de posse não é automaticamente violação de domicílio.",
    "references": [
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Art. 150",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "",
        "kind": "penal"
      }
    ]
  },
  "nat-disparo-arma": {
    "status": "special",
    "note": "Separar posse irregular, porte ilegal, disparo e situações de arma de uso restrito/proibido. A mera menção a arma não confirma nenhuma dessas figuras.",
    "references": [
      {
        "lawId": "ARM",
        "law": "Estatuto do Desarmamento - Lei nº 10.826/2003",
        "article": "Arts. 12, 14, 15 e 16",
        "url": "https://www.planalto.gov.br/ccivil_03/leis/2003/l10.826.htm",
        "condition": "Artigos alternativos conforme conduta e características da arma.",
        "kind": "penal"
      }
    ]
  },
  "nat-desaparecimento": {
    "status": "service",
    "note": "Desaparecimento ou localização, por si só, não é crime. Se houver indício de violência, privação de liberdade ou outra conduta, examinar separadamente.",
    "references": [
      {
        "lawId": "DES",
        "law": "Política de Busca de Pessoas Desaparecidas - Lei nº 13.812/2019",
        "article": "Art. 1º",
        "url": "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2019/lei/l13812.htm",
        "condition": "Institui política nacional de busca; referência de proteção, não tipo penal.",
        "kind": "protection"
      }
    ]
  },
  "extra-desaparecimento": {
    "status": "service",
    "note": "Desaparecimento ou localização, por si só, não é crime. Se houver indício de violência, privação de liberdade ou outra conduta, examinar separadamente.",
    "references": [
      {
        "lawId": "DES",
        "law": "Política de Busca de Pessoas Desaparecidas - Lei nº 13.812/2019",
        "article": "Art. 1º",
        "url": "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2019/lei/l13812.htm",
        "condition": "Institui política nacional de busca; referência de proteção, não tipo penal.",
        "kind": "protection"
      }
    ]
  },
  "catalogo-021": {
    "status": "service",
    "note": "Desaparecimento ou localização, por si só, não é crime. Se houver indício de violência, privação de liberdade ou outra conduta, examinar separadamente.",
    "references": [
      {
        "lawId": "DES",
        "law": "Política de Busca de Pessoas Desaparecidas - Lei nº 13.812/2019",
        "article": "Art. 1º",
        "url": "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2019/lei/l13812.htm",
        "condition": "Institui política nacional de busca; referência de proteção, não tipo penal.",
        "kind": "protection"
      }
    ]
  },
  "nat-animal": {
    "status": "special",
    "note": "O art. 31 trata de animal perigoso e das hipóteses de seu parágrafo único. Não enquadrar automaticamente todo animal solto.",
    "references": [
      {
        "lawId": "LCP",
        "law": "Lei das Contravenções Penais - Decreto-Lei nº 3.688/1941",
        "article": "Art. 31",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del3688.htm",
        "condition": "",
        "kind": "penal"
      }
    ]
  },
  "catalogo-001": {
    "status": "cp",
    "note": "Confirmar morte e nexo com conduta. Feminicídio é figura autônoma e exige razões da condição do sexo feminino; não basta a vítima ser mulher.",
    "references": [
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Art. 121",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "",
        "kind": "penal"
      },
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Art. 121-A",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "Somente quando presentes os requisitos do feminicídio.",
        "kind": "penal"
      }
    ]
  },
  "catalogo-002": {
    "status": "cp",
    "note": "Tentativa exige início de execução, não consumação por circunstâncias alheias à vontade e elementos do homicídio. Intenção não se conclui só pela arma ou ferimento.",
    "references": [
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Art. 121 c/c art. 14, II",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "",
        "kind": "penal"
      }
    ]
  },
  "catalogo-003": {
    "status": "dependent",
    "note": "Ferimento por arma não define sozinho o crime. Distinguir lesão, tentativa de homicídio, acidente e demais circunstâncias; não presumir intenção de matar.",
    "references": [
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Art. 129",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "Se presentes os elementos da lesão.",
        "kind": "penal"
      },
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Art. 121 c/c art. 14, II",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "Se presentes os elementos da tentativa de homicídio.",
        "kind": "penal"
      }
    ]
  },
  "catalogo-004": {
    "status": "dependent",
    "note": "Ferimento por arma não define sozinho o crime. Distinguir lesão, tentativa de homicídio, acidente e demais circunstâncias; não presumir intenção de matar.",
    "references": [
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Art. 129",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "Se presentes os elementos da lesão.",
        "kind": "penal"
      },
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Art. 121 c/c art. 14, II",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "Se presentes os elementos da tentativa de homicídio.",
        "kind": "penal"
      }
    ]
  },
  "catalogo-005": {
    "status": "cp",
    "note": "Confirmar privação de liberdade. Exigência de resgate pode alterar a referência para extorsão mediante sequestro.",
    "references": [
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Art. 148",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "",
        "kind": "penal"
      },
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Art. 159",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "Se a privação visa obter vantagem como condição ou preço do resgate.",
        "kind": "penal"
      }
    ]
  },
  "catalogo-006": {
    "status": "dependent",
    "note": "Refém descreve situação operacional. A referência depende de privação de liberdade, finalidade e exigências; não existe um artigo único para toda situação com reféns.",
    "references": [
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Arts. 148 e 159",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "Alternativas conforme privação e finalidade de resgate.",
        "kind": "penal"
      }
    ]
  },
  "catalogo-007": {
    "status": "cp",
    "note": "Exige perseguição reiterada e os demais elementos legais. Um contato isolado não basta.",
    "references": [
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Art. 147-A",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "",
        "kind": "penal"
      }
    ]
  },
  "catalogo-008": {
    "status": "cp",
    "note": "Confirmar violência, grave ameaça ou redução da resistência para impor conduta não exigida por lei ou impedir conduta permitida.",
    "references": [
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Art. 146",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "",
        "kind": "penal"
      }
    ]
  },
  "catalogo-009": {
    "status": "cp",
    "note": "Briga coletiva não é automaticamente rixa. Confirmar participação e natureza do confronto; distinguir defesa própria e agressão unilateral.",
    "references": [
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Art. 137",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "",
        "kind": "penal"
      }
    ]
  },
  "catalogo-010": {
    "status": "service",
    "note": "Encontro de pessoa aparentemente sem vida não prova homicídio nem autoriza afirmar óbito sem avaliação competente. A causa precisa ser apurada.",
    "references": []
  },
  "catalogo-011": {
    "status": "special",
    "note": "Injúria racial está na Lei nº 7.716/1989, art. 2º-A. Distinguir da discriminação ou incitação do art. 20; não usar automaticamente art. 140 do CP para ofensa racial.",
    "references": [
      {
        "lawId": "RAC",
        "law": "Lei nº 7.716/1989 - Crimes de racismo",
        "article": "Arts. 2º-A e 20",
        "url": "https://www.planalto.gov.br/ccivil_03/leis/l7716compilado.htm",
        "condition": "Figuras distintas conforme a conduta.",
        "kind": "penal"
      }
    ]
  },
  "catalogo-012": {
    "status": "dependent",
    "note": "A ficha reúne situações jurídicas distintas. Religião e orientação sexual não têm um único artigo comum. Conferir conduta, contexto e jurisprudência.",
    "references": [
      {
        "lawId": "RAC",
        "law": "Lei nº 7.716/1989 - Crimes de racismo",
        "article": "Art. 20",
        "url": "https://www.planalto.gov.br/ccivil_03/leis/l7716compilado.htm",
        "condition": "Discriminação/preconceito religioso, conforme requisitos.",
        "kind": "penal"
      },
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Arts. 140, § 3º, e 208",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "Hipóteses específicas de injúria religiosa ou ofensa/perturbação de culto.",
        "kind": "penal"
      },
      {
        "lawId": "STF",
        "law": "STF - ADO 26 e MI 4733",
        "article": "ADO 26 e MI 4733",
        "url": "https://www.stf.jus.br/arquivo/cms/publicacaoBOInternet/anexo/link_download/casos_relevantes/pt/ADO_26.pdf",
        "condition": "Enquadramento da homofobia/transfobia na legislação de racismo nos termos das decisões.",
        "kind": "jurisprudence"
      }
    ]
  },
  "catalogo-013": {
    "status": "cp",
    "note": "Distinguir falsa imputação de fato definido como crime, imputação de fato ofensivo à reputação e ofensa à dignidade/decoro. Não escolher automaticamente entre os três.",
    "references": [
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Arts. 138, 139 e 140",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "",
        "kind": "penal"
      }
    ]
  },
  "catalogo-014": {
    "status": "cp",
    "note": "Humilhação isoladamente não permite concluir todos os elementos. Confirmar dano emocional e os demais requisitos.",
    "references": [
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Art. 147-B",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "",
        "kind": "penal"
      },
      {
        "lawId": "MP",
        "law": "Lei Maria da Penha - Lei nº 11.340/2006",
        "article": "Arts. 5º e 7º, II",
        "url": "https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2006/lei/l11340.htm",
        "condition": "Se presente contexto de violência doméstica/familiar.",
        "kind": "protection"
      }
    ]
  },
  "catalogo-015": {
    "status": "dependent",
    "note": "Violência patrimonial é uma forma de violência prevista na Lei Maria da Penha, não um tipo penal único. Dano, subtração ou retenção dependem dos fatos e regras aplicáveis.",
    "references": [
      {
        "lawId": "MP",
        "law": "Lei Maria da Penha - Lei nº 11.340/2006",
        "article": "Art. 7º, IV",
        "url": "https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2006/lei/l11340.htm",
        "condition": "Forma de violência patrimonial.",
        "kind": "protection"
      },
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Arts. 155, 163 e 168",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "Possíveis figuras; não aplicação cumulativa automática.",
        "kind": "penal"
      }
    ]
  },
  "catalogo-016": {
    "status": "cp",
    "note": "Confirmar ato libidinoso sem anuência e a finalidade exigida. Distinguir de estupro, estupro de vulnerável e assédio sexual.",
    "references": [
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Art. 215-A",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "",
        "kind": "penal"
      }
    ]
  },
  "catalogo-017": {
    "status": "dependent",
    "note": "Exploração sexual é descrição ampla. Idade, vulnerabilidade, favorecimento e submissão alteram a referência. Não tratar todo caso como o mesmo crime.",
    "references": [
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Arts. 228 e 218-B",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "Conforme favorecimento e idade/vulnerabilidade.",
        "kind": "penal"
      },
      {
        "lawId": "ECA",
        "law": "Estatuto da Criança e do Adolescente - Lei nº 8.069/1990",
        "article": "Art. 244-A",
        "url": "https://www.planalto.gov.br/ccivil_03/leis/l8069.htm",
        "condition": "Exploração de criança/adolescente, observados os requisitos e subsidiariedade.",
        "kind": "penal"
      }
    ]
  },
  "catalogo-018": {
    "status": "cp",
    "note": "Confirmar dever de cuidado/guarda, incapacidade de defesa e abandono; não confundir com pessoa simplesmente desacompanhada.",
    "references": [
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Art. 133",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "",
        "kind": "penal"
      }
    ]
  },
  "catalogo-019": {
    "status": "dependent",
    "note": "Deficiência não gera um único enquadramento. Agressão, maus-tratos e discriminação exigem condutas e requisitos distintos.",
    "references": [
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Arts. 129 e 136",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "Conforme lesão ou maus-tratos.",
        "kind": "penal"
      },
      {
        "lawId": "PCD",
        "law": "Lei Brasileira de Inclusão - Lei nº 13.146/2015",
        "article": "Art. 88",
        "url": "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13146.htm",
        "condition": "Se houver discriminação em razão da deficiência.",
        "kind": "penal"
      }
    ]
  },
  "catalogo-020": {
    "status": "service",
    "note": "Criança desacompanhada/perdida é situação de proteção, sem crime automático. Abandono ou outra violência requer elementos adicionais.",
    "references": [
      {
        "lawId": "ECA",
        "law": "Estatuto da Criança e do Adolescente - Lei nº 8.069/1990",
        "article": "Arts. 98 e 101",
        "url": "https://www.planalto.gov.br/ccivil_03/leis/l8069.htm",
        "condition": "Proteção e medidas cabíveis à autoridade competente.",
        "kind": "protection"
      }
    ]
  },
  "catalogo-022": {
    "status": "service",
    "note": "Desorientação não é crime. Não presumir intoxicação, deficiência ou abandono. Priorizar necessidade de cuidado e avaliação competente.",
    "references": []
  },
  "catalogo-023": {
    "status": "service",
    "note": "Crise ou autoagressão da própria pessoa não é crime por si. Art. 122 só deve ser examinado diante de conduta de terceiro de induzir, instigar ou auxiliar.",
    "references": [
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Art. 122",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "Somente se houver conduta de terceiro com os requisitos legais.",
        "kind": "penal"
      }
    ]
  },
  "catalogo-024": {
    "status": "dependent",
    "note": "Ambiente escolar não define tipo penal único. Ameaça, lesão e ataque à vida dependem da conduta; não presumir execução de ameaça.",
    "references": [
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Arts. 147, 129 e 121",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "Alternativas conforme fatos.",
        "kind": "penal"
      }
    ]
  },
  "catalogo-025": {
    "status": "cp",
    "note": "Confirmar caráter sistemático/repetitivo e demais elementos. Cyberbullying possui previsão no parágrafo único; observar subsidiariedade.",
    "references": [
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Art. 146-A, caput e parágrafo único",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "",
        "kind": "penal"
      }
    ]
  },
  "catalogo-029": {
    "status": "dependent",
    "note": "Subtração de carga pode ser furto ou roubo. Distinguir emprego de violência/grave ameaça e outros elementos.",
    "references": [
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Arts. 155 e 157",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "Alternativas conforme modo de subtração.",
        "kind": "penal"
      }
    ]
  },
  "catalogo-030": {
    "status": "cp",
    "note": "Confirmar origem criminosa e os elementos subjetivos/conduta da figura aplicável. Aparência ou preço, isoladamente, não comprovam receptação.",
    "references": [
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Art. 180",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "",
        "kind": "penal"
      }
    ]
  },
  "catalogo-031": {
    "status": "cp",
    "note": "Confirmar posse/detenção anterior legítima e apropriação. Mero desacordo ou atraso de devolução não basta.",
    "references": [
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Art. 168",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "",
        "kind": "penal"
      }
    ]
  },
  "catalogo-032": {
    "status": "dependent",
    "note": "Ocupação de terreno pode envolver questão possessória. O esbulho possessório penal exige os requisitos específicos; não decidir propriedade por relato.",
    "references": [
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Art. 161, § 1º, II",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "Invasão com violência/grave ameaça ou concurso de mais de duas pessoas para esbulho possessório.",
        "kind": "penal"
      }
    ]
  },
  "catalogo-033": {
    "status": "cp",
    "note": "Confirmar subtração de cabos ou infraestrutura. Usar texto atualizado do art. 155 para circunstâncias específicas, sem presumir qualificadora.",
    "references": [
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Art. 155",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "",
        "kind": "penal"
      }
    ]
  },
  "catalogo-034": {
    "status": "service",
    "note": "Veículo abandonado ou localizado não é um novo crime por si. Consultar registro e circunstâncias; não presumir receptação do responsável pelo local.",
    "references": []
  },
  "catalogo-035": {
    "status": "service",
    "note": "Veículo abandonado ou localizado não é um novo crime por si. Consultar registro e circunstâncias; não presumir receptação do responsável pelo local.",
    "references": []
  },
  "catalogo-036": {
    "status": "dependent",
    "note": "Direção perigosa é descrição genérica. Verificar manobra, risco e requisitos da infração administrativa ou crime de trânsito; não há um único artigo para qualquer condução ruim.",
    "references": [
      {
        "lawId": "CTB",
        "law": "Código de Trânsito Brasileiro - Lei nº 9.503/1997",
        "article": "Arts. 175 e 311",
        "url": "https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm",
        "condition": "Art. 175: hipótese administrativa; art. 311: velocidade incompatível em locais especificados e perigo de dano.",
        "kind": "mixed"
      }
    ]
  },
  "catalogo-037": {
    "status": "special",
    "note": "Sinais relatados não comprovam alteração psicomotora. Distinguir infração administrativa e crime conforme constatação e requisitos.",
    "references": [
      {
        "lawId": "CTB",
        "law": "Código de Trânsito Brasileiro - Lei nº 9.503/1997",
        "article": "Arts. 165 e 306",
        "url": "https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm",
        "condition": "Art. 165 administrativo; art. 306 penal.",
        "kind": "mixed"
      }
    ]
  },
  "catalogo-038": {
    "status": "special",
    "note": "Corrida/manobra não autorizada precisa ser analisada conforme contexto e risco. Distinguir art. 173 administrativo e art. 308 penal.",
    "references": [
      {
        "lawId": "CTB",
        "law": "Código de Trânsito Brasileiro - Lei nº 9.503/1997",
        "article": "Arts. 173 e 308",
        "url": "https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm",
        "condition": "Hipóteses administrativas/penais distintas.",
        "kind": "mixed"
      }
    ]
  },
  "catalogo-039": {
    "status": "service",
    "note": "Obstáculo ou bloqueio é inicialmente uma situação de risco. Não concluir crime sem causa e conduta identificadas.",
    "references": [
      {
        "lawId": "CTB",
        "law": "Código de Trânsito Brasileiro - Lei nº 9.503/1997",
        "article": "Art. 26, II",
        "url": "https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm",
        "condition": "Dever de não criar perigo/obstáculo e de não abandonar materiais na via.",
        "kind": "administrative"
      }
    ]
  },
  "catalogo-040": {
    "status": "service",
    "note": "Sinistro com carga perigosa ou pessoa presa exige socorro. Condição de risco, por si, não identifica crime; eventual lesão culposa depende de apuração.",
    "references": [
      {
        "lawId": "CTB",
        "law": "Código de Trânsito Brasileiro - Lei nº 9.503/1997",
        "article": "Art. 303",
        "url": "https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm",
        "condition": "Somente se presentes os elementos de lesão culposa na direção.",
        "kind": "penal"
      }
    ]
  },
  "catalogo-041": {
    "status": "service",
    "note": "Sinistro com carga perigosa ou pessoa presa exige socorro. Condição de risco, por si, não identifica crime; eventual lesão culposa depende de apuração.",
    "references": [
      {
        "lawId": "CTB",
        "law": "Código de Trânsito Brasileiro - Lei nº 9.503/1997",
        "article": "Art. 303",
        "url": "https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm",
        "condition": "Somente se presentes os elementos de lesão culposa na direção.",
        "kind": "penal"
      }
    ]
  },
  "catalogo-042": {
    "status": "special",
    "note": "Confirmar vítima e conduta do motorista. Saída do local, isoladamente, não equivale a omissão de socorro.",
    "references": [
      {
        "lawId": "CTB",
        "law": "Código de Trânsito Brasileiro - Lei nº 9.503/1997",
        "article": "Art. 304",
        "url": "https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm",
        "condition": "Omissão de socorro pelo condutor nas condições legais.",
        "kind": "penal"
      },
      {
        "lawId": "CTB",
        "law": "Código de Trânsito Brasileiro - Lei nº 9.503/1997",
        "article": "Art. 305",
        "url": "https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm",
        "condition": "Afastamento para fugir à responsabilidade penal ou civil, se presentes seus requisitos.",
        "kind": "penal"
      }
    ]
  },
  "catalogo-043": {
    "status": "special",
    "note": "Estacionamento irregular é, em regra, infração administrativa; não transformar em crime automaticamente.",
    "references": [
      {
        "lawId": "CTB",
        "law": "Código de Trânsito Brasileiro - Lei nº 9.503/1997",
        "article": "Art. 181",
        "url": "https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm",
        "condition": "Enquadramento administrativo conforme a forma de estacionamento.",
        "kind": "administrative"
      }
    ]
  },
  "catalogo-044": {
    "status": "special",
    "note": "Confirmar abuso, maus-tratos, ferimento ou mutilação. Para cão ou gato, conferir o § 1º-A.",
    "references": [
      {
        "lawId": "AMB",
        "law": "Lei de Crimes Ambientais - Lei nº 9.605/1998",
        "article": "Art. 32, caput e § 1º-A",
        "url": "https://www.planalto.gov.br/ccivil_03/leis/l9605.htm",
        "condition": "",
        "kind": "penal"
      }
    ]
  },
  "catalogo-045": {
    "status": "service",
    "note": "Presença de animal silvestre em área urbana não é crime por si. Captura/comércio ou maus-tratos dependem de conduta humana específica.",
    "references": []
  },
  "catalogo-046": {
    "status": "special",
    "note": "Confirmar espécie, atividade e ausência/desconformidade de autorização. Não inferir infração só pela presença de animal.",
    "references": [
      {
        "lawId": "AMB",
        "law": "Lei de Crimes Ambientais - Lei nº 9.605/1998",
        "article": "Art. 29, caput e § 1º, III",
        "url": "https://www.planalto.gov.br/ccivil_03/leis/l9605.htm",
        "condition": "Caça/captura e comércio, conforme a conduta.",
        "kind": "penal"
      }
    ]
  },
  "catalogo-047": {
    "status": "special",
    "note": "Confirmar espécie, atividade e ausência/desconformidade de autorização. Não inferir infração só pela presença de animal.",
    "references": [
      {
        "lawId": "AMB",
        "law": "Lei de Crimes Ambientais - Lei nº 9.605/1998",
        "article": "Art. 29, caput e § 1º, III",
        "url": "https://www.planalto.gov.br/ccivil_03/leis/l9605.htm",
        "condition": "Caça/captura e comércio, conforme a conduta.",
        "kind": "penal"
      }
    ]
  },
  "catalogo-048": {
    "status": "special",
    "note": "Nem todo corte de árvore é crime. Local protegido, espécie, autorização e conduta alteram o enquadramento.",
    "references": [
      {
        "lawId": "AMB",
        "law": "Lei de Crimes Ambientais - Lei nº 9.605/1998",
        "article": "Arts. 38, 39 e 50",
        "url": "https://www.planalto.gov.br/ccivil_03/leis/l9605.htm",
        "condition": "Alternativas conforme vegetação, proteção e conduta.",
        "kind": "penal"
      }
    ]
  },
  "catalogo-049": {
    "status": "special",
    "note": "Descarte irregular pode ter repercussão administrativa. O crime de poluição exige os níveis/resultados descritos na lei; não basta qualquer descarte.",
    "references": [
      {
        "lawId": "AMB",
        "law": "Lei de Crimes Ambientais - Lei nº 9.605/1998",
        "article": "Art. 54",
        "url": "https://www.planalto.gov.br/ccivil_03/leis/l9605.htm",
        "condition": "Se preenchidos seus requisitos de poluição.",
        "kind": "penal"
      }
    ]
  },
  "catalogo-050": {
    "status": "special",
    "note": "Confirmar causa e conduta. Incêndio em vegetação não comprova autoria nem intenção; há modalidade culposa prevista.",
    "references": [
      {
        "lawId": "AMB",
        "law": "Lei de Crimes Ambientais - Lei nº 9.605/1998",
        "article": "Art. 41",
        "url": "https://www.planalto.gov.br/ccivil_03/leis/l9605.htm",
        "condition": "",
        "kind": "penal"
      }
    ]
  },
  "catalogo-051": {
    "status": "special",
    "note": "Confirmar local, período, espécies e métodos. Nem toda pesca é irregular.",
    "references": [
      {
        "lawId": "AMB",
        "law": "Lei de Crimes Ambientais - Lei nº 9.605/1998",
        "article": "Arts. 34 e 35",
        "url": "https://www.planalto.gov.br/ccivil_03/leis/l9605.htm",
        "condition": "Condutas de pesca nas condições proibidas descritas nos artigos.",
        "kind": "penal"
      }
    ]
  },
  "catalogo-052": {
    "status": "service",
    "note": "Vazamento é situação de emergência. Referência penal apenas se houver conduta causadora e os elementos do tipo, não pelo cheiro de gás isolado.",
    "references": [
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Art. 252",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "Uso de gás tóxico ou asfixiante com exposição a perigo; não se aplica automaticamente a todo vazamento de gás combustível.",
        "kind": "penal"
      }
    ]
  },
  "catalogo-053": {
    "status": "dependent",
    "note": "Explosão pode ter causa acidental. O art. 251 exige os elementos de exposição a perigo e conduta previstos na lei.",
    "references": [
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Art. 251",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "",
        "kind": "penal"
      }
    ]
  },
  "catalogo-054": {
    "status": "dependent",
    "note": "Distinguir risco estrutural, desabamento ocorrido, conduta e perigo comum. Referências são alternativas e exigem apuração.",
    "references": [
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Art. 256",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "Se houver causa de desabamento/desmoronamento e perigo comum.",
        "kind": "penal"
      },
      {
        "lawId": "LCP",
        "law": "Lei das Contravenções Penais - Decreto-Lei nº 3.688/1941",
        "article": "Arts. 29 e 30",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del3688.htm",
        "condition": "Hipóteses subsidiárias/específicas de desabamento e perigo de desabamento.",
        "kind": "penal"
      }
    ]
  },
  "catalogo-055": {
    "status": "service",
    "note": "Alagamento, inundação ou deslizamento natural não é crime por si. Eventual causação criminosa requer fatos adicionais.",
    "references": [
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Arts. 254 e 256",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "Somente conduta causadora de inundação ou desabamento/desmoronamento com os requisitos legais.",
        "kind": "penal"
      }
    ]
  },
  "catalogo-056": {
    "status": "service",
    "note": "Alagamento, inundação ou deslizamento natural não é crime por si. Eventual causação criminosa requer fatos adicionais.",
    "references": [
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Arts. 254 e 256",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "Somente conduta causadora de inundação ou desabamento/desmoronamento com os requisitos legais.",
        "kind": "penal"
      }
    ]
  },
  "catalogo-057": {
    "status": "service",
    "note": "Situação de emergência ou necessidade de socorro, sem tipo penal único pelo título da ocorrência. Culpa, autoria, omissão e nexo causal exigem apuração específica.",
    "references": []
  },
  "catalogo-058": {
    "status": "service",
    "note": "Situação de emergência ou necessidade de socorro, sem tipo penal único pelo título da ocorrência. Culpa, autoria, omissão e nexo causal exigem apuração específica.",
    "references": []
  },
  "catalogo-059": {
    "status": "service",
    "note": "Situação de emergência ou necessidade de socorro, sem tipo penal único pelo título da ocorrência. Culpa, autoria, omissão e nexo causal exigem apuração específica.",
    "references": []
  },
  "catalogo-060": {
    "status": "service",
    "note": "Situação de emergência ou necessidade de socorro, sem tipo penal único pelo título da ocorrência. Culpa, autoria, omissão e nexo causal exigem apuração específica.",
    "references": []
  },
  "catalogo-061": {
    "status": "service",
    "note": "Situação de emergência ou necessidade de socorro, sem tipo penal único pelo título da ocorrência. Culpa, autoria, omissão e nexo causal exigem apuração específica.",
    "references": []
  },
  "catalogo-062": {
    "status": "special",
    "note": "Confirmar conduta concreta e elementos do tráfico. Não presumir droga ou tráfico por aparência ou local.",
    "references": [
      {
        "lawId": "DRO",
        "law": "Lei de Drogas - Lei nº 11.343/2006",
        "article": "Art. 33",
        "url": "https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2006/lei/l11343.htm",
        "condition": "",
        "kind": "penal"
      }
    ]
  },
  "catalogo-063": {
    "status": "service",
    "note": "Material suspeito localizado não comprova sua composição, finalidade ou autoria. Não atribuir tráfico nem porte para uso automaticamente.",
    "references": []
  },
  "catalogo-064": {
    "status": "service",
    "note": "Objeto explosivo ou arma encontrada exige identificação e atendimento competente. A localização isolada não prova posse/porte ilegal nem autoria.",
    "references": [
      {
        "lawId": "ARM",
        "law": "Estatuto do Desarmamento - Lei nº 10.826/2003",
        "article": "Arts. 12, 14 e 16",
        "url": "https://www.planalto.gov.br/ccivil_03/leis/2003/l10.826.htm",
        "condition": "Somente após identificação e presença dos elementos de conduta; art. 16 também contém hipóteses sobre artefatos explosivos.",
        "kind": "penal"
      }
    ]
  },
  "catalogo-065": {
    "status": "service",
    "note": "Objeto explosivo ou arma encontrada exige identificação e atendimento competente. A localização isolada não prova posse/porte ilegal nem autoria.",
    "references": [
      {
        "lawId": "ARM",
        "law": "Estatuto do Desarmamento - Lei nº 10.826/2003",
        "article": "Arts. 12, 14 e 16",
        "url": "https://www.planalto.gov.br/ccivil_03/leis/2003/l10.826.htm",
        "condition": "Somente após identificação e presença dos elementos de conduta; art. 16 também contém hipóteses sobre artefatos explosivos.",
        "kind": "penal"
      }
    ]
  },
  "catalogo-066": {
    "status": "dependent",
    "note": "Tumulto é descrição ampla; distinguir evento pacífico, rixa, agressão e conduta em evento. Não tipificar aglomeração automaticamente.",
    "references": [
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Art. 137",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "Somente se configurada rixa.",
        "kind": "penal"
      },
      {
        "lawId": "LCP",
        "law": "Lei das Contravenções Penais - Decreto-Lei nº 3.688/1941",
        "article": "Art. 40",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del3688.htm",
        "condition": "Hipóteses de tumulto/conduta inconveniente em atos e eventos especificados.",
        "kind": "penal"
      }
    ]
  },
  "catalogo-067": {
    "status": "dependent",
    "note": "Fuga sem violência do custodiado não deve ser automaticamente tratada como art. 352. O art. 351 se refere à conduta de promover/facilitar fuga.",
    "references": [
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Art. 352",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "Evasão mediante violência contra pessoa.",
        "kind": "penal"
      },
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Art. 351",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "Promoção ou facilitação de fuga, por quem pratique essa conduta.",
        "kind": "penal"
      }
    ]
  },
  "catalogo-068": {
    "status": "dependent",
    "note": "Nem todo descumprimento judicial configura desobediência. Identificar ordem legal, destinatário, ciência, regime de sanções e eventual tipo específico.",
    "references": [
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Art. 330",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "Se presentes os requisitos de desobediência e cabimento.",
        "kind": "penal"
      },
      {
        "lawId": "MP",
        "law": "Lei Maria da Penha - Lei nº 11.340/2006",
        "article": "Art. 24-A",
        "url": "https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2006/lei/l11340.htm",
        "condition": "Se a ordem descumprida for medida protetiva desta lei.",
        "kind": "penal"
      }
    ]
  },
  "catalogo-069": {
    "status": "dependent",
    "note": "Lesão e abuso de autoridade não são equivalentes automáticos. Conferir conduta, função e finalidade específica exigida na lei; não presumir crime pelo relato genérico.",
    "references": [
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Art. 129",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "Se configurada lesão.",
        "kind": "penal"
      },
      {
        "lawId": "ABU",
        "law": "Lei de Abuso de Autoridade - Lei nº 13.869/2019",
        "article": "Arts. 1º e 13",
        "url": "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2019/lei/l13869.htm",
        "condition": "Art. 1º define requisitos gerais; art. 13 contempla constrangimento de preso/detento nas hipóteses descritas.",
        "kind": "penal"
      }
    ]
  },
  "catalogo-070": {
    "status": "service",
    "note": "Perda/extravio não é furto automaticamente e não tem artigo penal único. Subtração ou uso indevido requer fatos adicionais.",
    "references": []
  },
  "catalogo-071": {
    "status": "service",
    "note": "Encontrar documento/objeto não é crime. A apropriação de coisa achada é hipótese distinta e exige os elementos previstos na lei.",
    "references": [
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Art. 169, parágrafo único, II",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "Apropriação de coisa achada; observar dever/prazo de restituição ou entrega.",
        "kind": "penal"
      }
    ]
  },
  "catalogo-072": {
    "status": "service",
    "note": "Conflito de vizinhança ou desacordo comercial pode ser questão civil/administrativa. Ameaça, fraude ou agressão exigem conduta concreta para referência penal.",
    "references": []
  },
  "catalogo-073": {
    "status": "service",
    "note": "Conflito de vizinhança ou desacordo comercial pode ser questão civil/administrativa. Ameaça, fraude ou agressão exigem conduta concreta para referência penal.",
    "references": []
  },
  "catalogo-074": {
    "status": "service",
    "note": "Pedido de apoio é categoria operacional, não tipo penal. A base jurídica depende da finalidade, órgão e fatos concretos.",
    "references": []
  },
  "extra-golpe-pix": {
    "status": "cp",
    "note": "PIX é meio de pagamento, não tipo penal. Verificar fraude e distinguir transferência equivocada, extorsão e desacordo comercial.",
    "references": [
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Art. 171, caput e § 2º-A",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "Fraude eletrônica somente quando presentes os requisitos específicos.",
        "kind": "penal"
      }
    ]
  },
  "extra-incendio-residencia": {
    "status": "dependent",
    "note": "Princípio de incêndio é emergência, não prova de crime. Confirmar causação e perigo comum antes da referência penal.",
    "references": [
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Art. 250",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "Se a conduta e o perigo previstos no artigo forem demonstrados.",
        "kind": "penal"
      }
    ]
  },
  "extra-afogamento": {
    "status": "service",
    "note": "Afogamento é situação de emergência e não possui tipo penal único. Não presumir homicídio, culpa ou omissão por seu registro.",
    "references": []
  },
  "extra-maus-tratos": {
    "status": "dependent",
    "note": "Distinguir maus-tratos, abandono e lesão conforme dever de cuidado e conduta. ECA estabelece proteção, não substitui a identificação do ato.",
    "references": [
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Arts. 136, 133 e 129",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "Alternativas conforme fatos.",
        "kind": "penal"
      },
      {
        "lawId": "ECA",
        "law": "Estatuto da Criança e do Adolescente - Lei nº 8.069/1990",
        "article": "Arts. 5º e 13",
        "url": "https://www.planalto.gov.br/ccivil_03/leis/l8069.htm",
        "condition": "Proteção e comunicação de suspeita/confirmação de violência, conforme a lei.",
        "kind": "protection"
      }
    ]
  },
  "extra-idoso": {
    "status": "special",
    "note": "Abandono e exposição a perigo da pessoa idosa têm figuras próprias. Lesão corporal pode exigir referência ao CP conforme os fatos.",
    "references": [
      {
        "lawId": "IDO",
        "law": "Estatuto da Pessoa Idosa - Lei nº 10.741/2003",
        "article": "Arts. 98 e 99",
        "url": "https://www.planalto.gov.br/ccivil_03/leis/2003/l10.741.htm",
        "condition": "",
        "kind": "penal"
      },
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Art. 129",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "Se houver lesão e seus requisitos.",
        "kind": "penal"
      }
    ]
  },
  "extra-extorsao": {
    "status": "cp",
    "note": "Confirmar constrangimento com violência/grave ameaça visando vantagem econômica indevida. Não confundir cobrança ou fraude sem coação.",
    "references": [
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Art. 158",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "",
        "kind": "penal"
      }
    ]
  },
  "extra-violencia-sexual": {
    "status": "dependent",
    "note": "A ficha reúne condutas distintas. Confirmar coerção, ato, consentimento, idade/vulnerabilidade e eventual hierarquia; não escolher artigo só pela expressão abuso.",
    "references": [
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Arts. 213, 215-A, 216-A e 217-A",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "Alternativas: estupro, importunação, assédio e estupro de vulnerável.",
        "kind": "penal"
      }
    ]
  },
  "extra-crime-digital": {
    "status": "dependent",
    "note": "Invasão de conta não equivale automaticamente à invasão de dispositivo. Fraude eletrônica exige seus próprios elementos.",
    "references": [
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Art. 154-A",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "Se houver invasão de dispositivo nos termos legais.",
        "kind": "penal"
      },
      {
        "lawId": "CP",
        "law": "Código Penal - Decreto-Lei nº 2.848/1940",
        "article": "Art. 171, § 2º-A",
        "url": "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm",
        "condition": "Se configurada fraude eletrônica.",
        "kind": "penal"
      }
    ]
  }
};

export function legalFor(rule={}){return LEGAL_REFERENCES[rule.id]||null;}
export function withLegalReferences(rule){
 const legal=legalFor(rule);
 if(!legal)return rule;
 const legalBase=legal.references.length?legal.references.map(r=>`${r.article} - ${r.law}`).join('; '):'Sem artigo penal específico pelo título da ocorrência.';
 return {...rule,legalBase,legal:{...legal,reviewedAt:LEGAL_REVIEW_DATE}};
}
