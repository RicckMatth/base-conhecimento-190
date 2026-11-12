// Cobertura complementar conservadora de relatos operacionais.
// Só sugere códigos realmente presentes nas 769 naturezas do catálogo.
// Negativas/hipóteses não são tratadas como fatos confirmados.
import {detect,norm} from './offline-sade-parser.js';

const codeOf=n=>'NAT-'+String(n).padStart(4,'0');
const yes=(text,re)=>detect(text,re).yes;
const word=s=>norm(s);
export function supplementalCases(text,entries=[]){
 const byCode=new Map((Array.isArray(entries)?entries:[]).filter(e=>e?.code).map(e=>[e.code,e]));
 const results=new Map();
 const add=(id,proximity,reason)=>{
  const code=codeOf(id),e=byCode.get(code);
  if(!e||/\b(?:desativado|teste)\b/.test(word(e.title)))return;
  const previous=results.get(code);
  if(!previous||previous.proximity<proximity)results.set(code,{code,title:e.title,proximity,reason,method:'evidência contextual'});
 };
 const t=norm(text);
 const road=/\b(?:transito|carro|veiculo|moto|avenida|rodovia|motorista|condutor|pedestre|ciclista)\b/.test(t);
 const shot=yes(text,/\b(?:disparos? de arma de fogo|disparos? de revolver|disparou (?:a|uma|sua) arma|tiros? (?:de arma de fogo|ouvidos?|disparados?|no local)|tiroteio)\b/i);
 const dead=yes(text,/\b(?:encontraram? (?:o|um|uma)? ?(?:corpo|cadaver)|corpo sem vida|cadaver|obito confirmado|morte confirmada|pessoa morta|homem morto|mulher morta|faleceu|morreu)\b/i);
 const killing=yes(text,/\b(?:assassin(?:ou|aram|ado|ada)|homicidio|matou (?:a|o|um|uma|seu|sua) \w+|foi morto por|foi morta por)\b/i);
 const forcedCaptivity=yes(text,/\b(?:sequestr(?:ou|aram|ado|ada|o)|carcere privado|manteve (?:a|o|uma|um) ?(?:vitima|pessoa|homem|mulher) refem|fechou (?:a|o) ?(?:vitima|pessoa) contra a vontade|manteve trancad[oa] contra a vontade|prendeu (?:a|o) ?(?:vitima|pessoa) em (?:um|uma) ?(?:quarto|casa))\b/i);
 const rape=yes(text,/\b(?:estupro|estupr(?:ou|ada|ado)|violencia sexual|obrigou (?:a|o) ?(?:vitima|mulher|homem|pessoa) a (?:ter|manter) relacao sexual|forcou relacao sexual)\b/i);
 const vulnerable=yes(text,/\b(?:crianca|menor de 14|idade inferior a 14|vulneravel|menina de (?:[0-9]|1[0-3]) anos|menino de (?:[0-9]|1[0-3]) anos)\b/i);
 const sexualHarassment=yes(text,/\b(?:importunacao sexual|passou a mao (?:no|na|em) ?(?:corpo|seio|bunda|vitima|pessoa|mulher|homem) sem consentimento|tocou (?:a|o) ?(?:vitima|pessoa|mulher|homem) sem consentimento|se masturbou na frente (?:da|do) vitima)\b/i);
 const damage=yes(text,/\b(?:danific(?:ou|aram|ando)|destr(?:uiu|uiram)|quebr(?:ou|aram) (?:o|a|um|uma|meu|minha|seu|sua) ?(?:portao|janela|vidro|porta|celular|veiculo|carro|moto|retrovisor|patrimonio)|depred(?:ou|aram)|vandalismo|dano ao patrimonio)\b/i);
 const docLoss=yes(text,/\b(?:perd(?:eu|i|eram)|perda|extravi(?:ou|ei|aram)|extravio|sumiu)\s+(?:(?:de|do|da|dos|das|o|a|os|as|meu|minha|seus|seu|sua)\s+)?(?:documentos?|rg|cnh|habilitacao|identidade|carteira de identidade|cpf)\b/i);
 const firingAlarm=yes(text,/\b(?:alarme dispar(?:ou|ando)|disparo do alarme|alarme tocando|sistema de alarme acionado)\b/i);
 const reckless=yes(text,/\b(?:direcao perigosa|dirigindo em zigue zague|fazendo racha|disputando racha|cavalo de pau|manobra perigosa|corrida ilegal)\b/i);
 const drugPersonal=yes(text,/\b(?:uso de drogas|consumindo (?:drogas|maconha|cocaina)|fumando maconha|portando drogas para consumo pessoal|drogas para consumo pessoal)\b/i);
 const drugSale=yes(text,/\b(?:trafico de drogas|vendendo drogas|venda de drogas|comercio de drogas|comercializando entorpecentes)\b/i);
 const receipt=yes(text,/\b(?:receptacao|comprou (?:um|uma|o|a) ?(?:celular|veiculo|carro|moto|produto) sabendo (?:ser|que era) (?:roubado|furtado)|recebeu mercadoria sabendo (?:ser|que era) roubada)\b/i);
 const vehicleHit=yes(text,/\b(?:atropelamento|atropel(?:ou|aram|ado|ada)|colisao com pedestre)\b/i);
 const fight=yes(text,/\b(?:rixa|briga generalizada|varias pessoas brigando entre si|troca de socos entre varias pessoas)\b/i);
 if(shot)add(27,77,'Disparos de arma de fogo relatados. Confirmar se foram vistos ou apenas ouvidos, localização, feridos e risco atual.');
 if(dead)add(35,75,'Pessoa sem vida/óbito relatado; a causa e eventual crime não podem ser presumidos.');
 if(dead&&killing)add(149,60,'A redação menciona possível morte provocada por terceiro. Confirmar os fatos e a origem da informação; não presumir tipificação.');
 if(forcedCaptivity)add(81,76,'Relato de restrição de liberdade ou sequestro; confirmar vontade da pessoa, duração e localização.');
 if(rape)add(vulnerable?72:79,vulnerable?69:70,'Violência sexual explicitamente relatada; confirmar vítima, idade e circunstâncias, sem inferir diagnóstico ou tipificação.');
 if(sexualHarassment)add(73,71,'Contato ou conduta sexual sem consentimento relatados; confirmar atos observados e contexto.');
 if(damage)add(17,72,'Dano material relatado. Confirmar intencionalidade, responsável, propriedade e circunstâncias.');
 if(docLoss)add(36,79,'Extravio ou perda de documento informado, sem subtração necessariamente constatada.');
 if(firingAlarm)add(26,78,'Acionamento de alarme relatado, sem confirmação de invasão ou outro delito.');
 if(reckless&&road)add(34,72,'Condução perigosa relatada; confirmar manobra, risco e localização.');
 if(drugPersonal&&!drugSale)add(32,68,'Uso/posse para consumo pessoal mencionado; quantidade, autoria e natureza devem ser conferidas.');
 if(receipt)add(75,65,'Posse ou aquisição de produto supostamente ilícito; confirmar procedência e ciência.');
 if(vehicleHit&&road)add(82,70,'Atropelamento relatado; confirmar feridos, urgência, localização e socorro.');
 if(fight)add(31,65,'Briga recíproca entre múltiplos envolvidos; verificar dinâmica e se houve lesões.');
 return [...results.values()];
}
