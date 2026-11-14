// Critérios transcritos da "Ficha de Monitoria e Auditoria de Qualidade – Atendimento 190"
// e regras consolidadas da "Ficha de Acompanhamento Individual do Operador – 190".
export const QUALITY_BLOCKS=Object.freeze([
 {id:'opening',name:'Abertura e identificação da necessidade',max:10,items:[
  {id:'1.1',label:'Prontidão e Abertura',points:5,description:'Atendeu em até 3–5 segundos, identificou-se corretamente usando a fraseologia padrão (“Polícia Militar, emergência...”) e direcionou o atendimento com clareza.'},
  {id:'1.2',label:'Identificação da Necessidade',points:5,description:'Identificou imediatamente o tipo/natureza da ocorrência (e se está em andamento) e iniciou o registro no sistema de forma adequada.'}
 ]},
 {id:'collection',name:'Coleta de dados, análise de risco e informações complementares',max:45,items:[
  {id:'2.1',label:'Localização Completa',points:15,description:'Solicitou imediatamente endereço completo (logradouro, numeral, bairro, telefone e ponto de referência). Se ausente no SADE, aplicou a regra dos 20s (cruzamento/mapa auxiliar e registro para atualização).'},
  {id:'2.2',label:'Registro do Fato e Vítimas',points:8,description:'Entendeu e registrou corretamente a dinâmica do fato e identificou a existência de vítimas e seu estado de saúde.'},
  {id:'2.3',label:'Verificação de Autor',points:7,description:'Verificou se o autor permanece no local ou sentido de fuga, coletando características físicas, vestimentas e veículos (placa, cor, modelo).'},
  {id:'2.4',label:'Análise de Risco e Urgência',points:10,description:'Verificou presença de risco imediato (armas de fogo/branca, disparos, reféns, envolvidos), avaliou corretamente o nível de risco e demonstrou senso de urgência.'},
  {id:'2.5',label:'Coleta Complementar',points:5,description:'Coletou informações adicionais relevantes e adaptou as perguntas conforme a especificidade da ocorrência (sem excessos investigativos).'}
 ]},
 {id:'communication',name:'Comunicação, empatia e gestão da ligação',max:25,items:[
  {id:'3.1',label:'Comunicação Profissional',points:9,description:'Manteve comunicação clara, objetiva e dicção nítida, com tom de voz profissional e postura respeitosa (sem ironia, rispidez ou elevação de voz).'},
  {id:'3.2',label:'Empatia e Controle',points:9,description:'Demonstrou respeito e empatia (contenção verbal em casos de pânico) e manteve o controle da ligação, conduzindo bem e evitando conversas desnecessárias sem interromper de forma rude.'},
  {id:'3.3',label:'Gestão da Ligação',points:7,description:'Informou pausas quando necessário, manteve o cliente orientado durante a linha e gerenciou o tempo da chamada dentro da meta operacional.'}
 ]},
 {id:'closing',name:'Processos no sistema e encerramento técnico',max:20,items:[
  {id:'4.1',label:'Fluxo e Registro no Sistema',points:12,description:'Seguiu corretamente o fluxo (POP), digitou concomitantemente no CAD/SADE com redação clara, classificou corretamente a prioridade e passou orientações corretas durante o atendimento.'},
  {id:'4.2',label:'Encerramento Técnico',points:8,description:'Confirmou o endereço registrado, transmitiu orientações finais de autoproteção/segurança ao cidadão e liberou a linha de forma ágil.'}
 ]}
]);
export const QUALITY_CRITICAL=Object.freeze([
 {id:'geo',label:'Erro Geográfico Fatal',description:'Registrar endereço/bairro errado inviabilizando o envio da viatura.'},
 {id:'vital',label:'Omissão de Risco Vital',description:'Ignorar ou não perguntar sobre armas, feridos graves ou violência ativa.'},
 {id:'priority',label:'Classificação Crítica Incorreta',description:'Classificar crime grave/emergência como ocorrência simples.'},
 {id:'rudeness',label:'Descortesia Grave',description:'Agir com ironia, grosseria, insulto ou discutir com o solicitante.'},
 {id:'disconnect',label:'Desconexão Proposital',description:'Desligar na cara do cidadão antes de concluir o protocolo.'},
 {id:'refusal',label:'Omissão de Socorro Administrativo',description:'Recusar registro legítimo por julgamento pessoal.'}
]);
export const QUALITY_MANAGEMENT=[
 ['praise','Manutenção na escala / elogio'],
 ['feedback','Feedback corretivo em sala'],
 ['training','Trilha de reciclagem técnica']
];
const ids=QUALITY_BLOCKS.flatMap(b=>b.items);
export const QUALITY_POINTS=Object.freeze(Object.fromEntries(ids.map(x=>[x.id,x.points])));
export const QUALITY_MAX=ids.reduce((sum,x)=>sum+x.points,0);
export const QUALITY_ROLES=['manager','coordinator','dev'];
export const QUALITY_STATUS=['draft','published'];
export const QUALITY_ACKNOWLEDGE='Declaro ciência do recebimento da avaliação e da nota apresentada. A assinatura registra o recebimento e não implica concordância.';
const error=(message,status=400)=>Object.assign(new Error(message),{status});
export function canAuditQuality(actor){return Boolean(actor&&(actor.role==='admin'||QUALITY_ROLES.includes(actor.operational_role)));}
export function qualityClass(score){
 if(score>=90)return {id:'excellent',label:'Excelente (Padrão Ouro)'};
 if(score>=75)return {id:'adequate',label:'Adequado (Operacional)'};
 return {id:'below',label:'Abaixo do Padrão (Reciclagem)'};
}
export function qualityScore(ratings={},critical=[],{complete=true}={}){
 if(!ratings||typeof ratings!=='object'||Array.isArray(ratings))throw error('Os critérios da avaliação estão inválidos.');
 const allowed=new Set(['yes','no','na']);
 for(const [id,value] of Object.entries(ratings))if(!(id in QUALITY_POINTS)||!allowed.has(value))throw error('Critério inválido: '+id);
 const flags=Array.isArray(critical)?critical:[];
 if(flags.length>QUALITY_CRITICAL.length||flags.some(id=>!QUALITY_CRITICAL.some(x=>x.id===id))||new Set(flags).size!==flags.length)throw error('Penalidade crítica inválida.');
 if(complete&&ids.some(x=>!ratings[x.id]))throw error('Marque Sim, Não ou N/A para todos os 12 critérios.');
 let awarded=0,available=0;
 const blocks=QUALITY_BLOCKS.map(block=>{
  let earned=0,possible=0;
  for(const item of block.items){
   if(ratings[item.id]!=='na'){possible+=item.points;if(ratings[item.id]==='yes')earned+=item.points;}
  }
  awarded+=earned;available+=possible;
  return {id:block.id,name:block.name,max:block.max,earned,possible};
 });
 if(complete&&!available)throw error('Ao menos um critério precisa ser aplicável; todos N/A não geram nota.');
 const raw=available?Math.round(awarded/available*100):null;
 const score=flags.length?0:raw;
 return {score,raw,available,awarded,blocks,critical:flags.length>0,class:score===null?null:qualityClass(score)};
}
export function qualityDate(value){
 return typeof value==='string'&&/^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/.test(value)&&
  !Number.isNaN(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
}
export function qualityMonth(value){return typeof value==='string'&&/^(20\d{2})-(0[1-9]|1[0-2])$/.test(value);}
export function qualityText(v,max=2400){return typeof v==='string'?v.trim().slice(0,max):'';}
export function qualityManagement(v){if(v&&!QUALITY_MANAGEMENT.some(x=>x[0]===v))throw error('Providência gerencial inválida.');return v||null;}
export function qualityDuration(v){if(!Number.isInteger(v)||v<0||v>72000)throw error('Duração inválida. Informe a duração total em segundos.');return v;}
export function qualitySignature(value,displayName){
 const supplied=qualityText(value?.name,120);
 const same=(a,b)=>a.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').replace(/\s+/g,' ').trim()===b.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').replace(/\s+/g,' ').trim();
 if(!supplied||!displayName||!same(supplied,displayName)||value?.agreed!==true)throw error('Para registrar ciência, informe exatamente o nome da conta autenticada e confirme a declaração.');
 const image=value.image==null||value.image===''?null:String(value.image);
 if(image&&(!/^data:image\/png;base64,[a-z0-9+/=]{100,120000}$/i.test(image)||image.length>120023))throw error('Assinatura desenhada inválida ou muito grande.');
 return {name:displayName,image};
}
export function qualitySummary(monitors=[]){
 const published=monitors.filter(m=>m.status==='published');
 const scores=published.map(m=>m.score);
 const avg=scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length*10)/10:null;
 const meanDuration=published.length?Math.round(published.reduce((a,b)=>a+Number(b.duration_seconds||0),0)/published.length):null;
 return {count:published.length,average:avg,tmaSeconds:meanDuration,class:avg===null?null:qualityClass(avg),
  criticalCount:published.filter(m=>Array.isArray(m.critical)&&m.critical.length>0).length};
}
