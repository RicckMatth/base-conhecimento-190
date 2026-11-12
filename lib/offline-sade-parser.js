// Parser offline inspirado no HTML SADE/COPOM 190 enviado pelo usuário.
// Detecta pistas linguísticas. NÃO presume crime, despacho, diagnóstico ou autoria.
export const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[–—]/g,'-').replace(/[^\p{L}\p{N}\s-]/gu,' ').replace(/\s+/g,' ').trim();
const ROLE_DATA=[
 ['ex-marido','ex-marido|ex marido|ex esposo'],['ex-mulher','ex-mulher|ex mulher|ex esposa'],
 ['ex-companheiro','ex-companheiro|ex companheiro|ex namorado'],
 ['ex-companheira','ex-companheira|ex companheira|ex namorada'],
 ['marido','marido|esposo'],['esposa','esposa'],['companheiro','companheiro|namorado|convivente'],
 ['companheira','companheira|namorada'],['pai','pai|genitor'],['mãe','mae|genitora'],
 ['filho','filho|enteado'],['filha','filha|enteada'],['irmão','irmao'],['irmã','irma'],
 ['padrasto','padrasto'],['madrasta','madrasta'],['avô','avo'],['tio','tio'],['tia','tia'],
 ['amigo','amigo|colega|conhecido'],['amiga','amiga'],['vizinho','vizinho'],['vizinha','vizinha'],
 ['motorista','motorista|condutor'],['passageiro','passageiro'],['morador','morador'],['moradora','moradora'],
 ['indivíduo','individuo|cidadao|sujeito|suspeito|agressor|invasor|homem|rapaz'],
 ['indivíduos','individuos|suspeitos|assaltantes|homens']
];
const roleAliases=ROLE_DATA.flatMap(([label,aliases])=>aliases.split('|').map(alias=>({label,alias:norm(alias)}))).sort((a,b)=>b.alias.length-a.alias.length);
const actorGroup=roleAliases.map(x=>x.alias).filter((v,i,a)=>a.indexOf(v)===i).map(v=>v.replace(/[-]/g,'[- ]')).join('|');
const domestic=new Set(['ex-marido','ex-mulher','ex-companheiro','ex-companheira','marido','esposa','companheiro','companheira','pai','mãe','filho','filha','irmão','irmã','padrasto','madrasta']);
const female=new Set(['ex-mulher','ex-companheira','esposa','companheira','mãe','filha','irmã','madrasta','amiga','vizinha','moradora']);
const labelFrom=v=>roleAliases.find(x=>x.alias===norm(v))?.label||v;
export function parseRoles(text){
 const t=norm(text);
 const rolesSeen=[];
 for(const entry of roleAliases){
  const re=new RegExp('(?:^|\\b)'+entry.alias.replace(/[-]/g,'[- ]')+'\\b','g');
  for(const m of t.matchAll(re)){
   if(!rolesSeen.some(x=>Math.abs(x.pos-m.index)<3))rolesSeen.push({pos:m.index,label:entry.label});
  }
 }
 rolesSeen.sort((a,b)=>a.pos-b.pos);
 let victim=null,author=null,method='não determinado';
 // Paciente em voz passiva: "seu pai sofreu ameaças do amigo".
 const passive=new RegExp('\\b(?:o|a|seu|sua|um|uma)?\\s*('+actorGroup+')\\s+(?:sofreu|recebeu|foi|esta sendo|vem sendo)\\s+(?:(?:uma|varias|diversas|fortes|graves)\\s+){0,3}(?:ameacas?|agressao|agredid[oa]|ameacad[oa]|ferid[oa]|espancad[oa])\\s+(?:do|da|pelo|pela|por|por um|por uma)\\s+(?:o|a|um|uma)?\\s*('+actorGroup+')\\b');
 const p=t.match(passive);
 if(p){victim=labelFrom(p[1]);author=labelFrom(p[2]);method='voz passiva com alvo e agente';}
 if(!author||!victim){
  const active=new RegExp('\\b(?:o|a|seu|sua|um|uma)?\\s*('+actorGroup+')\\s+(?:\\w+\\s+){0,2}(?:ameacou|agrediu|espancou|esfaqueou|atacou|feriu|empurrou|roubou)\\s+(?:o|a|seu|sua|um|uma)?\\s*('+actorGroup+')\\b');
  const a=t.match(active);if(a&&a[1]!==a[2]){author??=labelFrom(a[1]);victim??=labelFrom(a[2]);method='voz ativa com agente e alvo';}
 }
 if(!victim){
  const p2=t.match(new RegExp('\\b(?:seu|sua|o|a)\\s+('+actorGroup+')\\s+(?:sofreu|recebeu|foi agredid[oa]|foi ameacad[oa])\\b'));
  if(p2){victim=labelFrom(p2[1]);method='vítima explicitamente referida';}
 }
 if(!author){
  const subject=t.match(new RegExp('\\b(?:o|a|seu|sua|um|uma)\\s+('+actorGroup+')\\s+(?:\\w+\\s+){0,2}(?:ameacou|agrediu|espancou|esfaqueou|atacou|tentou entrar|tentando entrar|arrombou)\\b'));
  if(subject){author=labelFrom(subject[1]);method='conduta expressamente atribuída';}
 }
 const third=Boolean(/\b(?:solicitante|comunicante)\s+(?:relata|informa|diz)\s+que\s+(?:seu|sua)\b/.test(t)&&victim);
 const witness=/\b(?:testemunha|vizinho liga|terceiro relata|popular informa)\b/.test(t);
 const direct=/\b(?:me agrediu|me ameacou|fui agredido|fui agredida|estou sendo agredido|estou sendo agredida)\b/.test(t);
 return {caller:third?'Familiar/comunicante (terceiro)':witness?'Testemunha/terceiro':direct?'Possível vítima direta':'Não identificado',
  callerType:third?'terceiro':witness?'testemunha':direct?'vitima_direta':'desconhecido',
  victim:victim||'Não identificada',author:author||'Não identificado',
  victimKnown:Boolean(victim),authorKnown:Boolean(author),
  woman: Boolean(victim&&female.has(victim)),domestic:Boolean(victim&&author&&victim!==author&&domestic.has(author)),
  method,mentions:[...new Set(rolesSeen.map(x=>x.label))].slice(0,8)};
}
// Afirmações negadas ou incertas não ativam sinais criminais.
export function detect(text,re){
 const chunks=String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().split(/[.!?;\n]|\s+(?:mas|porem|contudo|entretanto)\s+/);
 const found=[],denied=[],uncertain=[];
 for(const chunk of chunks){
  const input=norm(chunk);
  if(!input)continue;
  const matches=[...input.matchAll(new RegExp(re.source,re.flags.includes('g')?re.flags:re.flags+'g'))];
  for(const m of matches){
   const before=input.slice(Math.max(0,m.index-60),m.index);
   const local=before.split(/\b(?:e depois|em seguida|logo apos|entao|porem|contudo|mas)\b/).at(-1);
   // "Não houve agressão E ameaça" deve negar ambos os fatos; não cortar
   // o escopo na simples conjunção "e". Já "e depois" indica novo evento.
   if(/\b(?:nao sabe se|nao informou se|nao ha confirmacao de|talvez|possivelmente|aparentemente|pode ter)\b/.test(local))uncertain.push(m[0]);
   else if(/\b(?:nao|nunca|jamais|ninguem|nem|sem|nega|negou|ausencia de|inexistencia de)\b(?:\s+[a-z-]+){0,10}\s*$/.test(local))denied.push(m[0]);
   else found.push(m[0]);
  }
 }
 return {yes:found.length>0,no:denied.length>0,uncertain:uncertain.length>0,evidence:[...new Set(found)].slice(0,3)};
}
const patterns={
 threat:/\b(?:ameac(?:a|as|ou|ando|ado|ada)|promet(?:eu|endo)\s+(?:matar|agredir)|jurou\s+(?:matar|ferir)|vou te matar|vai te matar)\b/i,
 assault:/\b(?:agred(?:iu|ida|ido|indo)|agress(?:ao|oes)|violencia fisica|espanc(?:ou|ado|ando)|deu\s+(?:um\s+)?(?:soco|tapa|chute)|socou|chutou|esfaqueou|enforcou|empurrou|bateu\s+(?:nela|nele|na vitima))\b/i,
 injury:/\b(?:ferid[oa]s?|ferimentos?|sangr(?:ando|ou|amento)|cortes?|machucad[oa]s?|les(?:ao|oes)|fratur(?:a|ou|ado|ada)|desmaiou|traumatism[oa])\b/i,
 gun:/\b(?:arma de fogo|revolver|pistola|espingarda|fuzil|garrucha|municao|disparo de arma|tiros?|arma longa)\b/i,
 knife:/\b(?:facao|faca|canivete|punhal|machado|foice|estilete|arma branca|barra de ferro|porrete|pedaco de madeira)\b/i,
 armed:/\b(?:armad[oa]s?|portando uma arma|portava uma arma|apontou uma arma)\b/i,
 forced:/\b(?:invad(?:iu|iram|indo|ir)|arromb(?:ou|aram|ando|ar)|forc(?:ou|ando|ar|aram)\s+(?:a\s+|o\s+)?(?:porta|portao|entrada)|tent(?:ou|aram|ando)\s+(?:invadir|entrar|arrombar)|chut(?:ou|aram|ando)\s+(?:a\s+|o\s+)?(?:porta|portao)|abrir\s+(?:a\s+|o\s+)?(?:porta|portao)\s+(?:a\s+forca|forcado))\b/i,
 againstWill:/\b(?:contra (?:a|sua) vontade|sem autorizacao|sem permissao|impedido de entrar|nao deixou entrar)\b/i,
 entered:/\b(?:entrou\s+(?:na|em)\s+(?:casa|residencia|imovel)|dentro de casa|dentro da residencia)\b/i,
 outside:/\b(?:em frente (?:a|da) residencia|em frente (?:a|da) casa|em frente ao imovel|no portao|na calcada|na frente de casa)\b/i,
 gone:/\b(?:foi embora|saiu do local|fugiu|fugiram|evadiu|evadiram|se retirou)\b/i,
 mpu:/\b(?:medida protetiva|mpu|protetiva de urgencia)\b/i,
 mpuBroken:/\b(?:descumpr(?:iu|indo)|quebr(?:ou|ando)|desrespeit(?:ou|ando))\s+(?:a\s+|uma\s+)?(?:medida protetiva|mpu|ordem judicial)\b/i,
 dispute:/\b(?:discuss(?:ao|oes)|discut(?:iu|iram|indo)|desentendimento|desinteligencia|bate boca|briga(?:s| verbal| de casal| entre vizinhos)?)\b/i,
 stolen:/\b(?:furt(?:o|ou|aram|ad[oa]|ando|ar)|roub(?:o|ou|aram|ad[oa]|ando|ar)|assalt(?:o|ou|aram|ad[oa]|ando|ar)|subtra(?:iu|iram|cao)|lev(?:ou|aram)\s+(?:(?:o|a|um|uma|meu|minha)\s+)?(?:celular|carteira|bolsa|dinheiro)|passar o celular)\b/i,
 robbery:/\b(?:assalto|assalt(?:ou|aram|ad[oa]|ando)|roubo|roub(?:ou|aram|ad[oa]|ando)|rendeu|apontou\s+(?:uma\s+)?arma|passar o celular)\b/i,
 burglary:/\b(?:arromb(?:ou|ado|amento)|escalada|rompimento de obstaculo|quebrou\s+o\s+cadeado)\b/i,
 childTaken:/\b(?:peg(?:ou|ando)|lev(?:ou|ando)|saiu com|foi embora com)\s+(?:o\s+|a\s+|seu\s+|sua\s+)?(?:filho|filha|crianca|menor)\b/i,
 custody:/\b(?:sem (?:a )?(?:guarda|autorizacao)|descumprindo\s+(?:ordem|decisao)\s+de\s+guarda|retirou\s+da\s+guarda|subtraiu\s+(?:o\s+|a\s+)?(?:filho|filha|crianca))\b/i,
 noise:/\b(?:som alto|som excessivo|som automotivo|musica alta|volume muito alto|som no ultimo volume|perturbacao do sossego|algazarra|barulho excessivo|gritaria|festa com som alto|volume maximo)\b/i,
 crash:/\b(?:acidente de transito|colisao|colidiu|atropel(?:ou|amento)|capot(?:ou|amento)|bateu\s+o\s+carro|bateu\s+contra\s+(?:outro|um)\s+carro)\b/i,
 road:/\b(?:transito|avenida|rodovia|via publica|veiculo|motorista|dirigindo|conduzindo|condutor|carro|motociclista)\b/i,
 drunk:/\b(?:embriagad[oa]|bebad[oa]|alcoolizad[oa]|sob efeito de alcool|dirigindo alcoolizado|motorista bebado)\b/i,
 missing:/\b(?:desaparec(?:eu|ido|ida|imento)|pessoa desaparecida|sumiu sem noticias|nao voltou para casa|esta desaparecid[oa])\b/i,
 fire:/\b(?:incendio|pegando fogo|em chamas|casa queimando|fogo se alastrando)\b/i,
 fraud:/\b(?:estelionato|golpe|falso comprovante|fraude|pix falso|fraudulento)\b/i,
 animal:/\b(?:maltrat(?:ou|ando)|maus tratos|agrediu\s+(?:o|um)\s+(?:cao|gato|animal)|abandonou\s+(?:o|um)\s+animal)\b/i,
 sale:/\b(?:trafico de drogas|vend(?:eu|endo) drogas|comercializ(?:ou|ando) entorpecentes|venda de crack)\b/i
};
export function parseEvidence(text){
 const signals=Object.fromEntries(Object.entries(patterns).map(([key,re])=>[key,detect(text,re)]));
 const type=signals.gun.yes&&signals.knife.yes?'Arma de fogo e arma branca':signals.knife.yes?'Arma branca':signals.gun.yes?'Arma de fogo':signals.armed.yes?'Arma não especificada':'Não identificada';
 return {signals,weaponType:type,weaponEvidence:[...signals.gun.evidence,...signals.knife.evidence,...signals.armed.evidence].slice(0,4)};
}
