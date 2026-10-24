import {LEGAL_SOURCES} from '../legal-references.js';
export const SOURCES={...LEGAL_SOURCES,CC:{title:'Código Civil — Lei nº 10.406/2002',url:'https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm'},CPP:{title:'Código de Processo Penal — Decreto-Lei nº 3.689/1941',url:'https://www.planalto.gov.br/ccivil_03/decreto-lei/del3689.htm'},CF:{title:'Constituição Federal de 1988',url:'https://www.planalto.gov.br/ccivil_03/constituicao/constituicaocompilado.htm'},AA:{title:'Lei de Abuso de Autoridade — Lei nº 13.869/2019',url:'https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2019/lei/l13869.htm'},JEC:{title:'Juizados Especiais — Lei nº 9.099/1995',url:'https://www.planalto.gov.br/ccivil_03/leis/l9099.htm'}};
export function sourceFor(code){const s=SOURCES[code];if(!s)throw Error('Norma não cadastrada.');return s;}
export const ALTERNATIVE_SOURCES={
 CP:'https://www2.camara.leg.br/legin/fed/declei/1940-1949/decreto-lei-2848-7-dezembro-1940-412868-normaatualizada-pe.html',
 CC:'https://www2.camara.leg.br/legin/fed/lei/2002/lei-10406-10-janeiro-2002-432893-normaatualizada-pl.html',
 MP:'https://www2.camara.leg.br/legin/fed/lei/2006/lei-11340-7-agosto-2006-545133-normaatualizada-pl.html'
};
