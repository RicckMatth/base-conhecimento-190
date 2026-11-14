// Triagem local: aplica regras conservadoras ao parser do HTML SADE v5,
// associa APENAS naturezas ativas, escolhe cinco perguntas ainda pendentes.
import {parseRoles,correctRoles,parseEvidence,detect,norm} from './offline-sade-parser.js';
import {essentialSondagem} from './gemini-response.js';
import {isQuestion} from './assistant.js';
import {supplementalCases} from './offline-case-extensions.js';

const codeOf=id=>'NAT-'+String(id).padStart(4,'0');
const stop=new Set('para pelos pelas pelas mais casa pessoa individuo mulher homem vitima crime como sobre desde local de da do das dos em no na nos nas com por sem que ou ate ele ela um uma as os essa esse esse seu sua seus suas ser estar foi pode apenas nao pela contra entre esta desta sendo relatar'.split(' '));
const has=(s,k)=>Boolean(s[k]?.yes);
const pct=n=>Math.max(1,Math.min(95,Math.round(n)));
function rankNature(text,entries,roles,facts){
 const s=facts.signals;
 const activeEntries=new Map(entries.filter(x=>x&&typeof x.code==='string').map(x=>[x.code,x]));
 const suggestions=new Map();
 const add=(id,score,reason)=>{
  const code=codeOf(id),entry=activeEntries.get(code);
  if(!entry||/\b(?:desativado|teste)\b/i.test(norm(entry.title)))return;
  const previous=suggestions.get(code);
  if(previous&&previous.proximity>=score)return;
  suggestions.set(code,{code,title:entry.title,proximity:pct(score),reason,method:'regra contextual'});
 };
 const threatened=has(s,'threat'),assault=has(s,'assault'),injured=has(s,'injury');
 const gun=has(s,'gun'),knife=has(s,'knife'),armed=gun||knife||has(s,'armed');
 const domestic=roles.domestic,woman=domestic&&roles.woman;
 const forced=has(s,'forced')&&(has(s,'againstWill')||/arromb|forc|invadiu|invadir|chutando/.test(s.forced.evidence.join(' ')));
 if(threatened)add(woman?19:5,79,'Ameaça expressa no relato; o conteúdo, o alvo e o contexto ainda precisam ser confirmados.');
 if(assault){
  if(injured){add(domestic?4:9,82,'Agressão e possível lesão relatadas; confirmar ferimentos, gravidade e vínculo.');
   if(woman)add(22,72,'Agressão/possível lesão contra mulher com vínculo doméstico; hipótese dependente de confirmação.');
  }else if(s.injury.no&&!s.injury.uncertain)add(woman?49:11,73,'Agressão física relatada com negativa explícita de ferimentos; confirmar consequências antes de selecionar vias de fato.');
 }
 if(forced)add(12,has(s,'againstWill')?81:67,'Possível ingresso/tentativa de entrada contra a vontade do morador; confirmar se houve acesso e oposição.');
 if(has(s,'mpuBroken')&&has(s,'mpu'))add(24,82,'Possível descumprimento de medida protetiva; confirmar vigência, ciência e conduta exata.');
 // Armas são sinais de risco, não prova de porte ilegal.
 if(has(s,'stolen')){
  const withViolence=has(s,'robbery')||threatened||assault;
  if(withViolence){
   add(16,83,'Subtração associada a possível violência ou grave ameaça.');
   // A menção de arma em qualquer trecho não comprova seu emprego na subtração.
  }else add(has(s,'burglary')?7:10,76,'Subtração mencionada sem violência confirmada contra pessoa.');
 }
 // Pegar o próprio filho ou sair do local com ele, isoladamente, não indica subtração de incapaz.
 if(has(s,'childTaken')&&has(s,'custody'))add(133,47,'Conflito de guarda informado; verificar quem detém a guarda e eventual ordem aplicável.');
 if(has(s,'dispute')&&!threatened&&!assault&&!forced&&!has(s,'stolen'))
  add(23,68,'Discussão ou desentendimento relatado, sem elementos suficientes para afirmar ilícito.');
 if(has(s,'noise'))add(2,83,'Som alto, gritaria ou perturbação do sossego relatados.');
 if(has(s,'crash')&&has(s,'road')){
  add(6,injured?38:73,injured?'Sinistro com possível vítima; confirmar serviços e natureza do atendimento.':'Sinistro viário relatado; confirmar vítimas e condições.');
  if(injured)add(129,79,'Sinistro de trânsito com possível vítima ferida, sujeito a confirmação.');
 }
 if(has(s,'drunk')&&has(s,'road')&&/\b(?:dirigindo|conduzindo|motorista|condutor)\b/.test(norm(text)))
  add(45,65,'Condutor possivelmente alcoolizado; não é diagnóstico ou confirmação de capacidade alterada.');
 if(has(s,'missing')&&!has(s,'gone'))add(39,73,'Desaparecimento mencionado; último avistamento e risco ainda a esclarecer.');
 if(has(s,'fire'))add(71,83,'Incêndio ou chamas relatados, sujeitos a conferência sobre local e extensão.');
 if(has(s,'fraud'))add(28,75,'Indício textual de fraude; confirmar o meio, prejuízo e circunstâncias relatadas.');
 if(has(s,'animal'))add(58,70,'Possíveis maus-tratos contra animal relatados; confirmar a conduta observada.');
 if(has(s,'sale'))add(30,73,'Comércio de drogas mencionado; não inferir tráfico apenas de consumo.');
 // Cobertura semântica adicional para ocorrências comuns que não tinham regras:
 // danos, disparos, extravio, desaparecimento, morte, violência sexual etc.
 for(const match of supplementalCases(text,[...activeEntries.values()])){
  const previous=suggestions.get(match.code);
  if(!previous||previous.proximity<match.proximity)suggestions.set(match.code,match);
 }
 // Cobertura adicional do catálogo (769 fichas) por nome com correspondência lexical
 // bem delimitada, sem inventar naturezas como fez o protótipo original.
 const words=new Set(norm(text).split(' ')),generic=/\b(?:abuso|teste|desativado|eleitoral|reuniao|palestra|visita|lei|artigo|crime militar|ilegal|qualificado|majorado|agravado|culposo|doloso)\b/;
 for(const entry of activeEntries.values()){
  if(suggestions.has(entry.code))continue;
  const title=norm(entry.title||'');
  if(title.length<12||title.length>85||generic.test(title))continue;
  const terms=[...new Set(title.split(' ').filter(w=>w.length>=5&&!stop.has(w)))];
  if(terms.length<2||terms.length>6)continue;
  const matches=terms.filter(w=>words.has(w)&&detect(text,new RegExp('\\b'+w+'\\b','i')).yes);
  if(matches.length<2||matches.length/terms.length<.85)continue;
  suggestions.set(entry.code,{code:entry.code,title:entry.title,proximity:pct(36+matches.length*6),
   reason:'Termos específicos da natureza aparecem no relato; confirmar os elementos do fato.',method:'correspondência textual'});
 }
 const clean=[...suggestions.values()].filter(entry=>{
  const title=norm(entry.title);
  if(/\b(?:arma de fogo|disparo|municao)\b/.test(title)&&knife&&!gun)return false;
  if(/\b(?:transito|veiculo automotor|embarcacao|aeronave|colisao|atropelamento)\b/.test(title)&&!has(s,'road'))return false;
  if(/\b(?:contra mulher|sexo feminino|violencia domestica)\b/.test(title)&&!woman)return false;
  if(/\b(?:abuso de autoridade|abuso -)\b/.test(title)&&!/\b(?:policial|servidor publico|agente publico)\b/.test(norm(text)))return false;
  if(/\b(?:lesao corporal)\b/.test(title)&&!injured)return false;
  if(/\b(?:furto|roubo)\b/.test(title)&&!has(s,'stolen'))return false;
  if(/\b(?:descumprir decisao|medida protetiva)\b/.test(title)&&!has(s,'mpuBroken'))return false;
  if(/\b(?:homicidio|morte confirmada|obito)\b/.test(title)&&!/\b(?:morreu|obito confirmado|morte confirmada|matou|assassinou|homicidio|morto|morta|sem vida)\b/.test(norm(text)))return false;
  return true;
 });
 return clean.sort((a,b)=>b.proximity-a.proximity||a.code.localeCompare(b.code)).slice(0,3);
}
const priority={
 threat:['threat','ongoing','injured','weapons','safe','suspectHere','vulnerable'],
 dispute:['threat','injured','vulnerable','relationship','ongoing','safe'],
 forced:['entry','safe','ongoing','injured','weapons','suspectHere'],
 stolen:['taken','weapons','injured','ongoing','suspectHere'],
 crash:['injured','trapped','blocked','lane','responders'],
 fire:['injured','trapped','fireArea','hazard','responders'],
 missing:['lastSeen','lastTime','age','clothes','healthNeed'],
 noise:['noise','duration','ongoing','address','witness'],
 default:['ongoing','injured','weapons','safe','vulnerable','address','time']
};
function fiveQuestions(text,nature,s){
 const order=['missing','fire','crash','stolen','forced','threat','dispute','noise'];
 const topic=order.find(k=>has(s,k))||'default';
 return essentialSondagem({text,nature,isOccurrence:true,suggestedTopics:priority[topic]});
}
function description(roles,facts,ranks){
 const sig=facts.signals;
 const names={
  threat:'ameaça',assault:'agressão física',injury:'possíveis ferimentos',gun:'arma de fogo',knife:'arma branca',
  armed:'arma não especificada',forced:'tentativa de entrada/forçamento',dispute:'desentendimento',
  stolen:'subtração patrimonial',childTaken:'saída com filho/criança',noise:'perturbação sonora',
  crash:'sinistro de trânsito',missing:'desaparecimento',fire:'incêndio',fraud:'fraude',animal:'maus-tratos a animal'
 };
 const factsText=Object.entries(sig).filter(([k,v])=>v.yes&&names[k]).map(([k])=>names[k]).slice(0,7).join(', ');
 const events=factsText?'O texto contém referência a: '+factsText+'. ':'Não foram reconhecidos elementos específicos suficientes para classificação. ';
 const people=(roles.victimKnown?'Possível pessoa atingida: '+roles.victim+'. ':'A pessoa atingida não foi identificada com segurança. ')+(roles.authorKnown?'Possível autor mencionado: '+roles.author+'.':'A autoria não foi atribuída de forma segura.');
 const cases=ranks.length?'Hipóteses para conferência: '+ranks.map(r=>r.title+' ('+r.code+')').join('; ')+'. Não constituem confirmação de crime.':'Sem natureza sustentada por evidências suficientes; não é possível afirmar que houve crime.';
 return events+people+'\n\n'+cases+'\n\nConfirme as cinco perguntas de sondagem abaixo. Negativas, lacunas e contradições não são substituídas por afirmações. A decisão operacional depende do protocolo institucional.';
}
export function analyzeOfflineReport({text='',entries=[],roleOverrides}={}){
 const original=String(text||'').trim().slice(0,8000);
 if(original.length<3)return {tipo:'indefinido',source:'local',mensagem:'Relato insuficiente para análise.'};
 const roles=correctRoles(parseRoles(original),roleOverrides),facts=parseEvidence(original),ranks=rankNature(original,entries,roles,facts.signals?facts:{signals:{}});
 const nature=ranks.length?entries.find(e=>e.code===ranks[0].code):null;
 const questions=fiveQuestions(original,nature,facts.signals);
 return {
  tipo:'local-triage',source:'local',responseType:'relato',titulo:'Triagem estruturada • Motor local',
  resposta:description(roles,facts,ranks),originalReport:original,
  insufficientData:!ranks.length||ranks[0].proximity<72||(!roles.victimKnown&&!roles.authorKnown),
  natureSuggestions:ranks,analysisQuestions:questions,
  roleAnalysis:{caller:roles.caller,victim:roles.victim,author:roles.author,instrument:facts.weaponType,
   scene:has(facts.signals,'forced')?'Possível tentativa de acesso ao imóvel':has(facts.signals,'gone')?'Saída do local mencionada':'Situação atual a confirmar',
   method:roles.method,domestic:roles.domestic,manualOverrides:roles.manualOverrides||null},
  riskSignals:Object.entries(facts.signals).filter(([key,value])=>value.yes&&['gun','knife','armed','injury','fire','forced'].includes(key)).map(([key])=>key),
  unconfirmedEvidence:Object.entries(facts.signals).filter(([,value])=>value.uncertain||(value.yes&&value.no)).map(([kind,value])=>({kind,conflicting:value.yes&&value.no})),
  situationStatus:!ranks.length?'desconhecida':ranks.every(r=>['NAT-0023','NAT-0036','NAT-0026','NAT-0006'].includes(r.code))?'sem_indicio_criminal_confirmado':'hipoteses_para_conferencia',
  evidence:Object.entries(facts.signals).filter(([,s])=>s.yes).map(([kind,s])=>({kind,terms:s.evidence})),
  references:ranks.map(x=>({code:x.code,title:x.title})),
  analysisMethod:'Reconhecimento local determinístico com leitura de papéis, negações, contexto e catálogo ativo.',
  disclaimer:'As porcentagens são índices heurísticos de correspondência textual, não probabilidades de crime, acerto ou prioridade operacional.'
 };
}
export function answerOffline({text,entries=[]}={}){
 const input=String(text||'').trim();
 if(isQuestion(input)&&!/\b(?:solicitante|comunicante|ocorrencia|relato|viatura|vitima|agressor|suspeito)\b/i.test(norm(input))){
  return {tipo:'faq',source:'local',titulo:'Consulta à Base 190',resposta:'A análise local reconhece fatos e sugere naturezas do catálogo, mas não decide enquadramento jurídico ou despacho. Descreva a situação e o que foi efetivamente informado para obter a triagem estruturada. Para definições ou procedimentos específicos, consulte a ficha da natureza e o protocolo institucional.'};
 }
 return analyzeOfflineReport({text:input,entries});
}
