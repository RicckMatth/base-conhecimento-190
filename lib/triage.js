// Structured local triage. Only explicit, non-ambiguous statements hide questions.
// A detector represents one information need: composite questions are avoided.
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const Q={};
function q(id,text,yes=[],no=[]){Q[id]={id,text,yes,no};return id;}
q('address','Qual é o endereço exato do fato, incluindo número ou cruzamento?',[/\b(?:rua|avenida|av\.?|travessa|rodovia|estrada|alameda)\s+[a-z0-9 ]{2,65}\s+(?:numero\s*|n[º°o.]?\s*|,\s*)?\d{1,6}\b/,/\b(?:endereco|local do fato)\s*[:=-]\s*\S.{8,}/,/\b(?:cruzamento|esquina)\s+(?:da|entre|de)\s+.{6,}/]);
q('landmark','Qual ponto de referência facilita localizar o atendimento?',[/\b(?:em frente (?:ao|a)|ao lado (?:do|da)|proximo (?:ao|a)|ponto de referencia\s*[:=-])\s+\S.{3,}/]);
q('time','Quando o fato aconteceu ou começou?',[/\b(?:as|desde as|por volta das)\s+\d{1,2}(?::\d{2}|h(?:\d{2})?)?\b/,/\bha\s+(?:\d+|um|uma|dois|duas|tres|dez|vinte)\s+(?:minutos?|horas?|dias?)\b/,/\b(?:hoje|ontem|anteontem|nesta manha|ontem a noite)\b/,/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/]);
q('ongoing','O fato está acontecendo agora ou já terminou?',[/\b(?:em andamento|neste momento|esta acontecendo agora|ocorrendo agora|agredindo agora|agora mesmo)\b/],[/\b(?:ja terminou|fato encerrado|ocorrencia encerrada|nao esta mais acontecendo|cessou|ja acabou)\b/]);
q('injured','Há pessoas feridas ou com necessidade de socorro?',[/\b(?:ha|tem|existem)\s+(?:\d+|uma|duas|tres|pessoas?|vitimas?)?\s*(?:pessoas?\s+|vitimas?\s+)?(?:ferid[oa]s?|machucad[oa]s?)\b/,/\b(?:vitima|mulher|homem|crianca|pessoa|condutor|motorista)\s+(?:(?:esta|ficou|foi)\s+)?(?:ferid[oa]|balead[oa]|sangrando|machucad[oa])\b/],[/\b(?:sem feridos|sem vitimas|ninguem (?:se feriu|ficou ferido)|nao (?:ha|houve|tem|existem) (?:pessoas? |vitimas? )?ferid[oa]s?)\b/]);
q('weapons','Há arma de fogo, faca ou outro objeto usado para ameaçar ou agredir?',[/\b(?:armad[oa]s?|com (?:uma? )?(?:arma|faca|pistola|revolver|facao)|port[a-z]* (?:uma? )?(?:arma|faca)|apontou (?:uma? |a )?arma)\b/],[/\b(?:desarmad[oa]s?|sem armas?|nao esta armad[oa]|nao (?:porta|portava|tem|tinha|ha|houve) (?:nenhuma? )?(?:armas?|faca))\b/]);
q('suspectHere','O suspeito ainda está no local ou já saiu?',[/\b(?:autor|agressor|suspeito|homem|marido)\s+(?:ainda )?(?:esta|permanece|continua|se encontra)\s+(?:no local|na casa|na residencia|por perto|nas proximidades)\b/],[/\b(?:autor|agressor|suspeito|homem|marido)\s+(?:ja )?(?:fugiu|evadiu(?:-se)?|saiu|foi embora|nao esta mais no local)\b/]);
q('description','Quais características físicas ou roupas do suspeito foram observadas?',[/\b(?:suspeito|autor|agressor|homem|mulher)\s+(?:trajando|vestindo|usa|usava|de (?:camiseta|camisa|blusa|calca|bermuda|jaqueta))\b/,/\b(?:camiseta|camisa|blusa|calca|bermuda|jaqueta)\s+(?:preta|branca|azul|vermelha|verde|cinza|amarela)\b/]);
q('escape','Qual direção ou destino de fuga foi observado?',[/\b(?:fugiu|evadiu|seguiu|saiu)\s+(?:a pe\s+|de moto\s+|de carro\s+)?(?:em direcao|sentido|rumo|para a|para o)\s+\S.{2,}/,/\b(?:direcao de fuga|sentido de fuga)\s*[:=-]\s*\S.{2,}/]);
q('vehicle','Há veículo envolvido? Qual descrição foi observada?',[/\b(?:carro|moto|veiculo|caminhao|onibus|automovel)\s+(?:preto|branco|azul|vermelho|prata|cinza|verde|marca|modelo)\b/],[/\b(?:sem veiculo|nao (?:ha|houve) veiculo|fugiu a pe|saiu a pe)\b/]);
q('plate','A placa do veículo envolvido foi informada?',[/\b[a-z]{3}[- ]?\d[a-z0-9]\d{2}\b/]);
q('witness','Há testemunha que presenciou o fato?',[/\b(?:ha|tem|existem)\s+(?:uma?|duas?|\d+)?\s*testemunhas?\b/,/\b(?:testemunha|vizinho|vizinha)\s+(?:presenciou|viu|assistiu)\b/],[/\b(?:sem testemunhas|nao (?:ha|houve|tem) testemunhas|ninguem presenciou)\b/]);
q('images','Existem câmeras ou imagens do fato já disponíveis?',[/\b(?:ha|tem|existem)\s+(?:cameras|imagens|filmagens|gravacao)\b/,/\b(?:camera|cameras)\s+(?:registrou|registraram|filmou|filmaram)\b/],[/\b(?:sem (?:cameras|imagens)|nao (?:ha|tem|existem) (?:cameras|imagens))\b/]);
q('safe','A vítima está em local seguro e afastada do possível agressor?',[/\b(?:vitima|mulher|crianca|pessoa)\s+(?:ja )?(?:esta|ficou|foi colocada|se encontra)\s+(?:em seguranca|em local seguro|abrigada|longe do agressor)\b/],[/\b(?:vitima|mulher|crianca)\s+(?:ainda )?(?:esta em risco|nao esta em seguranca|esta junto do agressor)\b/]);
q('vulnerable','Há crianças, idosos ou outras pessoas vulneráveis expostas ao fato?',[/\b(?:ha|tem|com|presenca de)\s+(?:\d+|uma?|duas?)?\s*(?:criancas?|idos[oa]s?|bebes?|pessoas? com deficiencia)\b/],[/\b(?:sem criancas|nao (?:ha|tem|existem) (?:criancas|idosos|vulneraveis))\b/]);
q('relationship','Qual é o vínculo informado entre vítima e suspeito?',[/\b(?:marido|esposa|ex-marido|ex-companheiro|companheiro|namorado|ex-namorado|padrasto|madrasta|vizinho|vizinha)\b/]);
q('protection','A vítima informou existência de medida protetiva vigente?',[/\b(?:possui|tem|existe|ha|com)\s+(?:uma? )?(?:medida protetiva|mpu)\s*(?:vigente|ativa|em vigor)?\b/,/\bmedida protetiva\s+(?:vigente|ativa|em vigor)\b/],[/\b(?:sem medida protetiva|nao (?:possui|tem|existe|ha) (?:uma? )?medida protetiva)\b/]);
q('threat','Qual ameaça ou conduta concreta foi relatada?',[/\b(?:ameacou|disse que ia|disse que vai|prometeu)\s+(?:a |o )?(?:matar|atirar|agredir|queimar|machucar)\b/]);
q('repeated','Houve episódios anteriores ou repetição da conduta?',[/\b(?:ja aconteceu antes|segunda vez|terceira vez|todos os dias|repetidas vezes|episodios anteriores)\b/],[/\b(?:primeira vez|nunca aconteceu antes|sem episodios anteriores)\b/]);
q('taken','Qual bem ou valor foi levado ou atingido?',[/\b(?:levou|levaram|roubou|roubaram|furtou|furtaram|subtraiu|subtrairam)\s+(?:(?:o|a|meu|minha|um|uma|seu|sua)\s+){0,2}(?:celular|carro|moto|bolsa|carteira|dinheiro|carga|bicicleta|computador|televisao)\b/]);
q('entry','Como ocorreu a entrada ou o acesso ao local?',[/\b(?:arrombou|arrombaram|pulou o muro|pularam o muro|entrou pela janela|entraram pela janela|forcou o portao|porta arrombada)\b/]);
q('value','Qual valor aproximado foi informado?',[/\br\$\s*\d/,/\b(?:valor|prejuizo|transferiu|transferi|pagou|paguei)\s+(?:de )?(?:r\$\s*)?\d/]);
q('payment','Qual meio de pagamento ou transferência foi utilizado?',[/\b(?:pix|boleto|cartao de credito|cartao de debito|transferencia bancaria|deposito bancario)\b/]);
q('platform','Qual aplicativo, site ou canal foi usado no contato?',[/\b(?:whatsapp|instagram|facebook|telegram|e-mail|email|sms|site\s+\S+\.com)\b/]);
q('accountControl','A vítima ainda tem acesso à conta afetada?',[/\b(?:ainda (?:tenho|tem) acesso|conta recuperada|recuperei (?:a |minha )?conta)\b/],[/\b(?:perdi (?:o )?acesso|nao (?:tenho|tem|consigo) (?:mais )?acesso|sem acesso a conta)\b/]);
q('evidence','Há mensagens, comprovantes ou registros já preservados?',[/\b(?:tenho|tem|possui|salvou|guardou|preservou)\s+(?:as |os )?(?:mensagens|comprovantes|prints|registros)\b/]);
q('lane','Qual é a via e o sentido do trânsito afetado?',[/\b(?:sentido|direcao)\s+(?:centro|bairro|norte|sul|leste|oeste|curitiba|colombo)\b/,/\b(?:via|rodovia|pista)\s+.{2,35}\s+sentido\s+\S+/]);
q('blocked','A via está bloqueada ou há passagem para veículos?',[/\b(?:via|pista|rua|faixa)\s+(?:esta )?(?:totalmente |parcialmente )?(?:bloqueada|interditada|obstruida)\b/],[/\b(?:via livre|pista livre|transito liberado|sem bloqueio|via desobstruida)\b/]);
q('trapped','Há pessoa presa em veículo, estrutura ou área de risco?',[/\b(?:pres[oa]s? nas ferragens|pessoas? presas?|vitima presa|pessoa retida|pessoa ilhada)\b/],[/\b(?:ninguem preso|sem pessoas presas|nao ha pessoas presas|todos (?:sairam|foram retirados))\b/]);
q('vehiclesCount','Quantos veículos estão envolvidos?',[/\b(?:dois|tres|quatro|cinco|\d+)\s+(?:veiculos|carros|motos|caminhoes)\b/,/\bapenas um veiculo\b/]);
q('driverSigns','Quais sinais ou manobras concretas do condutor foram observados?',[/\b(?:zigue-zague|zigue zague|contramao|fala arrastada|odor de alcool|avancou o sinal)\b/]);
q('fireArea','O fogo ou a fumaça atingem qual parte do local?',[/\b(?:fogo|fumaca|chamas)\s+(?:no|na|do|da|saindo do|saindo da)\s+(?:telhado|quarto|cozinha|apartamento|predio|mata|motor|garagem)\b/]);
q('hazard','Há gás, combustível ou outro material perigoso informado?',[/\b(?:botijao|gas|gasolina|combustivel|produto quimico|carga perigosa)\b/],[/\b(?:sem material perigoso|nao ha material perigoso)\b/]);
q('responders','Algum serviço de emergência já foi acionado?',[/\b(?:samu|bombeiros|siate|defesa civil|ambulancia)\s+(?:ja )?(?:acionad[oa]s?|a caminho|no local|foi chamado|foram chamados)\b/],[/\b(?:nenhum servico foi acionado|ainda nao (?:chamou|acionou) (?:o |os )?(?:samu|bombeiros|socorro))\b/]);
q('peopleCount','Quantas pessoas estão envolvidas ou expostas?',[/\b(?:uma|duas|tres|quatro|cinco|\d+)\s+(?:pessoas|vitimas|moradores|ocupantes|feridos)\b/]);
q('access','Há alguma dificuldade de acesso ao local para as equipes?',[/\b(?:acesso bloqueado|portao trancado|estrada de terra|sem acesso|acesso pela|entrada pela)\b/],[/\b(?:acesso livre|acesso liberado|sem dificuldade de acesso)\b/]);
q('lastSeen','Qual foi o último local onde a pessoa desaparecida foi vista?',[/\b(?:vist[oa] pela ultima vez|ultimo local|ultimo avistamento)\s*(?:foi|na|no|em|:)?\s*\S.{5,}/]);
q('lastTime','Quando ocorreu o último contato ou avistamento da pessoa?',[/\b(?:ultimo contato|ultima vez|ultimo avistamento)\s+.{0,35}(?:as\s+\d|ontem|hoje|\d{1,2}h)/]);
q('age','Qual é a idade aproximada da pessoa?',[/\b(?:vitima|crianca|pessoa desaparecida|desaparecid[oa]|idos[oa])\s+(?:tem |de |com )?\d{1,3}\s+anos\b/,/\bidade (?:da vitima|da pessoa|do desaparecido)\s*[:=-]?\s*\d{1,3}/]);
q('clothes','Quais roupas e características da pessoa procurada foram informadas?',[/\b(?:vestia|trajava|usava|vestindo|trajando)\s+(?:uma? |a )?(?:camisa|camiseta|blusa|calca|bermuda|jaqueta|vestido)\b/]);
q('healthNeed','Há condição de saúde ou necessidade de apoio relevante para localizar e proteger a pessoa?',[/\b(?:possui|tem|com)\s+(?:alzheimer|diabetes|autismo|deficiencia|demencia)\b/],[/\b(?:sem condicao de saude relevante|nao possui condicao de saude informada)\b/]);
q('animal','Qual animal ou espécie foi informado?',[/\b(?:cachorro|cadela|cao|gato|cavalo|boi|cobra|onca|passaro|ave silvestre)\b/]);
q('animalRisk','O animal está solto ou contido?',[/\b(?:animal|cachorro|cao|cavalo|cobra)\s+(?:esta )?(?:solto|solta|na pista|na rua)\b/],[/\b(?:animal contido|cachorro preso|animal na gaiola|animal cercado)\b/]);
q('environmentAct','Qual conduta ou alteração ambiental foi observada diretamente?',[/\b(?:cortando arvores|derrubando arvores|despejando esgoto|jogando lixo|queimando a mata|cacando animais|pescando com rede)\b/]);
q('area','Qual é a extensão aproximada da área afetada?',[/\b\d+\s+(?:metros|hectares|quarteiroes|casas)\b/]);
q('school','Qual escola ou unidade de ensino está envolvida?',[/\b(?:escola|colegio|creche)\s+(?:municipal |estadual |particular )?[a-z]{3,}(?:\s+[a-z]{3,})?/]);
q('specificThreat','A ameaça menciona algum local, horário ou ação específica?',[/\b(?:ameaca|mensagem|autor)\s+.{0,45}(?:as \d|amanha|hoje|vai atacar|vai invadir)\b/]);
q('restrained','Como está ocorrendo a restrição de liberdade da vítima?',[/\b(?:trancad[oa]|amarrad[oa]|impedid[oa] de sair|mantid[oa] pres[oa]|sob vigilancia armada)\b/]);
q('demand','Foi feita alguma exigência pelo suspeito?',[/\b(?:exigiu|exigindo|pediu resgate|exige resgate|obriga a pagar|chantageando)\b/],[/\b(?:sem exigencia|nao houve exigencia|nao pediu resgate)\b/]);
q('discrimination','Qual fala ou comportamento discriminatório foi relatado?',[/\b(?:disse|falou|gritou|escreveu|chamou)\s*[:"“]/]);
q('noise','Qual é a origem e o tipo de ruído informado?',[/\b(?:som alto|musica alta|festa|latidos|maquinas|obra|gritaria)\b/]);
q('duration','Há quanto tempo a perturbação ou situação persiste?',[/\b(?:desde as\s+\d|ha \d+ (?:minutos|horas)|durante toda a noite|a noite toda)\b/]);
q('order','Qual ordem ou decisão foi informada e qual conduta a estaria descumprindo?',[/\b(?:ordem|decisao|medida)\s+(?:determina|proibe|fixa|estabelece)\s+\S.{4,}/]);
q('document','Qual documento ou objeto foi perdido ou encontrado?',[/\b(?:rg|cpf|cnh|carteira de identidade|passaporte|cartao bancario|documento do carro)\b/]);
q('service','Qual órgão ou serviço solicita apoio?',[/\b(?:conselho tutelar|samu|bombeiros|defesa civil|guarda municipal)\b/]);
q('support','Qual é a finalidade concreta do apoio solicitado?',[/\bapoio para\s+\S.{5,}/]);

const common=['address','landmark','time','ongoing'];
const category={
 'Proteção':['safe','injured','suspectHere','weapons','vulnerable','relationship','witness'],
 'Pessoas':['injured','safe','peopleCount','suspectHere','weapons','description','witness'],
 'Patrimônio':['injured','suspectHere','weapons','taken','description','escape','vehicle','witness','images'],
 'Trânsito':['lane','injured','blocked','trapped','vehiclesCount','vehicle','plate','responders','driverSigns'],
 'Ordem pública':['injured','peopleCount','weapons','suspectHere','description','vehicle','witness'],
 'Emergência':['injured','peopleCount','trapped','hazard','access','responders'],
 'Meio ambiente':['animal','environmentAct','area','injured','access','images'],
 'Atendimento':['safe','witness','evidence','service'],
 'Outros':['animal','animalRisk','injured','blocked','responders']
};
// Profiles replace category defaults when a generic category would ask irrelevant questions.
const profiles=[
 [/^(?!localizacao).*desaparec/,['lastSeen','lastTime','age','clothes','healthNeed','safe','responders','witness']],
 [/localizacao de pessoa|desorientad|crianca desacompanhada|crianca.*perdida/,['safe','age','clothes','healthNeed','injured','responders']],
 [/pix|estelionat|fraude|golpe|invasao de conta|crime.*digital/,['payment','value','platform','threat','accountControl','evidence','safe']],
 [/extorsao|chantag/,['threat','demand','payment','value','platform','safe','suspectHere','evidence']],
 [/sequestro|carcere|refens/,['restrained','peopleCount','safe','weapons','suspectHere','demand','injured','description','vehicle']],
 [/incendio|queimada|explosao/,['fireArea','trapped','injured','peopleCount','hazard','access','responders','area']],
 [/afogamento/,['lastSeen','lastTime','peopleCount','age','injured','responders','access']],
 [/vazamento|intoxicacao|substancia|carga perigosa/,['hazard','peopleCount','injured','trapped','access','responders','area']],
 [/desabamento|deslizamento|inundacao|alagamento|fiacao|elevador/,['trapped','peopleCount','injured','access','responders','area']],
 [/violencia.*domestica|contra a mulher|violencia psicologica|violencia patrimonial|medida protetiva/,['safe','relationship','injured','weapons','suspectHere','vulnerable','protection','threat','repeated','description']],
 [/sexual|importunacao/,['safe','injured','suspectHere','weapons','age','relationship','vulnerable','responders']],
 [/escolar/,['school','specificThreat','ongoing','injured','weapons','suspectHere','vulnerable','responders']],
 [/bullying|intimidacao sistematica/,['safe','repeated','threat','platform','age','school','evidence']],
 [/autoagressao|crise com risco/,['safe','injured','weapons','peopleCount','access','responders']],
 [/animal|fauna|caca|pesca/,['animal','animalRisk','environmentAct','injured','blocked','images','responders']],
 [/desmatamento|vegetacao|poluicao|descarte/,['environmentAct','area','hazard','peopleCount','images','access']],
 [/discriminacao|racial/,['discrimination','threat','safe','suspectHere','witness','evidence','repeated']],
 [/sossego|perturbacao/,['noise','duration','ongoing','threat','suspectHere','witness','vulnerable']],
 [/ordem judicial/,['order','threat','safe','suspectHere','evidence','witness']],
 [/documentos|extravio|objeto encontrado|documento.*encontrado/,['document','taken','witness','evidence']],
 [/apoio a outro servico/,['service','support','injured','weapons','safe','access']],
 [/dano.*patrimonio|vandalismo|cabos|invasao.*imovel|arrombamento|violacao de domicilio/,['injured','suspectHere','weapons','entry','description','escape','witness','images']],
 [/veiculo.*(?:abandonado|subtraido)|localizacao de veiculo/,['vehicle','plate','suspectHere','injured','access','images']],
 [/trafico de drogas|comercio de drogas|material.*droga/,['suspectHere','description','weapons','vehicle','witness','images']],
 [/arma localizada|arma.*abandonada|objeto.*explosivo/,['weapons','peopleCount','access','suspectHere','responders','witness']]
];
export function questionsFor(rule={}){
 const title=norm(rule.officialNature||rule.title),profile=profiles.find(([re])=>re.test(title));
 const ids=[...new Set([...common,...(profile?.[1]||category[rule.category]||category.Pessoas)])];
 const questions=ids.map(id=>Q[id]);
 // Preserve unknown administrator-authored questions rather than invent a detector.
 if(!rule.id||!(/^(nat-|extra-|catalogo-)/.test(rule.id))) {
  for(const [i,text] of (rule.triageQuestions||[]).entries())if(!questions.some(q=>norm(q.text)===norm(text)))questions.push({id:'custom-'+i,text,yes:[],no:[]});
 }
 return questions;
}
export function withTriageQuestions(rule){return {...rule,triageQuestions:questionsFor(rule).map(q=>q.text)};}
const uncertain=/\b(?:nao (?:sabe|sei|informou|confirmou|soube)|nao foi informad[oa]|nao informad[oa]|sem informac|desconhec|talvez|possivelmente|pode ser|nao tem certeza|nao tenho certeza|nao se sabe|nao confirmad[oa]|sem saber|perguntou se|pergunta se|quer saber se|aparentemente|parece que)\b/;
export function evaluateTriage(rule,text){
 const clauses=(String(text||'').match(/[^.!?;\n]+[.!?;\n]?/g)||[]).map(norm).filter(c=>!c.includes('?')&&!uncertain.test(c));
 const pending=[],answered=[];
 for(const question of questionsFor(rule)){
  const evidence=[];
  for(const clause of clauses){
   const negative=question.no.some(re=>re.test(clause));
   // A negative answer can contain the affirmative wording ("não há feridos").
   const affirmative=question.no.reduce((value,re)=>value.replace(new RegExp(re.source,'g'),' '),clause);
   const positive=question.yes.some(re=>re.test(affirmative));
   if(negative)evidence.push({value:'no',text:clause.trim()});
   if(positive)evidence.push({value:'yes',text:clause.trim()});
  }
  const conflict=new Set(evidence.map(e=>e.value)).size>1;
  if(evidence.length&&!conflict)answered.push({id:question.id,question:question.text,evidence:evidence[0].text});
  else pending.push({id:question.id,question:question.text,reason:conflict?'conflicting':'missing'});
 }
 return {pending,answered,total:pending.length+answered.length};
}
export function applyTriage(result,text){
 if(result?.tipo!=='classificacao'||!result.principal)return result;
 const triage=evaluateTriage(result.principal,text);
 return {...result,principal:{...result.principal,triageQuestions:triage.pending.map(q=>q.question)},triage};
}
