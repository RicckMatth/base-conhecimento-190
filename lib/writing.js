// Deterministic PT-BR correction: no dispatch statements or inferred facts.
const corrections={
 vitima:'vítima',vitimas:'vítimas',vitíma:'vítima',vitímas:'vítimas',policia:'polícia',policias:'polícias',polícial:'policial',veiculo:'veículo',veiculos:'veículos',transito:'trânsito',ocorrencia:'ocorrência',ocorrencias:'ocorrências',residencia:'residência',residencias:'residências',individuo:'indivíduo',individuos:'indivíduos',suspeíto:'suspeito',endereco:'endereço',enderecos:'endereços',numero:'número',numeros:'números',referencia:'referência',referencias:'referências',proximo:'próximo',proxima:'próxima',proximos:'próximos',proximas:'próximas',ameaca:'ameaça',ameacas:'ameaças',ameacou:'ameaçou',ameacando:'ameaçando',ameassa:'ameaça',ameassou:'ameaçou',agressao:'agressão',agressoes:'agressões',agresao:'agressão',agredio:'agrediu',agredindo:'agredindo',agredida:'agredida',familia:'família',familias:'famílias',domestica:'doméstica',domestico:'doméstico',violencia:'violência',violencias:'violências',nao:'não',ninguem:'ninguém',tambem:'também',ja:'já',apos:'após',ate:'até',ha:'há',porem:'porém',possivel:'possível',possiveis:'possíveis',informacao:'informação',informacoes:'informações',situacao:'situação',situacoes:'situações',descricao:'descrição',descricoes:'descrições',direcao:'direção',direcoes:'direções',caracteristicas:'características',caracteristica:'característica',ambulancia:'ambulância',emergencia:'emergência',emergencias:'emergências',incendio:'incêndio',incendios:'incêndios',edificio:'edifício',predio:'prédio',predios:'prédios',gas:'gás',faisca:'faísca',explosao:'explosão',explosoes:'explosões',destruicao:'destruição',sangramento:'sangramento',lesao:'lesão',lesoes:'lesões',cabeca:'cabeça',braco:'braço',bracos:'braços',crianca:'criança',criancas:'crianças',deficiencia:'deficiência',fisica:'física',fisico:'físico',fisicos:'físicos',fisicas:'físicas',psicologica:'psicológica',psicologico:'psicológico',saude:'saúde',horario:'horário',horarios:'horários',periodo:'período',manhã:'manhã',manha:'manhã',onibus:'ônibus',caminhao:'caminhão',caminhoes:'caminhões',motocicleta:'motocicleta',eletrico:'elétrico',eletrica:'elétrica',eletricos:'elétricos',eletricas:'elétricas',comercio:'comércio',comercios:'comércios',estabelecimeto:'estabelecimento',estabelicimento:'estabelecimento',estacionameto:'estacionamento',estacionado:'estacionado',patrimonio:'patrimônio',publico:'público',publica:'pública',publicos:'públicos',publicas:'públicas',documentacao:'documentação',protecao:'proteção',urgencia:'urgência',urgente:'urgente',comunicacao:'comunicação',orientacao:'orientação',acao:'ação',acoes:'ações',intencao:'intenção',autorizacao:'autorização',localizacao:'localização',aproximacao:'aproximação',atencao:'atenção',necessario:'necessário',necessaria:'necessária',responsavel:'responsável',responsaveis:'responsáveis',testemuna:'testemunha',testemunhas:'testemunhas',solicitamte:'solicitante',solisitante:'solicitante',solicitnte:'solicitante',solicintante:'solicitante',infroma:'informa',infoma:'informa',informaçao:'informação',relatou:'relatou',subtracao:'subtração',subtraçao:'subtração',transferencia:'transferência',bancaria:'bancária',bancario:'bancário',celuar:'celular',celula:'celula',celulár:'celular',pistóla:'pistola',revolver:'revólver',facao:'facão',portao:'portão',portoes:'portões',arvore:'árvore',arvores:'árvores',agua:'água',aguas:'águas',alagamento:'alagamento',substancia:'substância',quimico:'químico',quimica:'química',imovel:'imóvel',imoveis:'imóveis',movel:'móvel',moveis:'móveis',area:'área',areas:'áreas',propria:'própria',proprio:'próprio',feminino:'feminino',masculino:'masculino',usuario:'usuário',usuarios:'usuários',vc:'você',vcs:'vocês',estao:'estão'
};
export function correctReport(input){
 let text=String(input||'').normalize('NFC').replace(/\r\n?/g,'\n').trim();
 if(!text)return '';
 // Preserve quoted speech, URLs and e-mail contents during spelling replacement.
 const protectedParts=[];
 text=text.replace(/https?:\/\/\S+|\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b|"[^"\n]*"|“[^”\n]*”/giu,m=>{protectedParts.push(m);return `\uE000${protectedParts.length-1}\uE001`;});
 text=text.replace(/\p{L}+/gu,word=>corrections[word.toLocaleLowerCase('pt-BR')]||word);
 text=text.replace(/\b(o|um|uma|do|da|com|meu|minha)\s+bebe\b/gi,'$1 bebê').replace(/\b(os|as|uns|umas|dos|das)\s+bebes\b/gi,'$1 bebês');
 text=text.replace(/\b(?:q)\b/gi,'que')
  .replace(/\bn\s+(?=(?:sabe|sei|tem|tenho|est[aá]|foi|houve|consegue|informou)\b)/gi,'não ')
  .replace(/\b(?:est[aá]|ta|t[aá])\s+(?=(?:sendo|agredind[oa]|ameaçand[oa]|ferid[oa]|sangrando|armad[oa]|no local|na rua|na residência|acontecendo|em andamento)\b)/gi,'está ')
  .replace(/\b(?:ele|ela|o suspeito|a vítima|o autor)\s+est[aã]o\b/gi,m=>m.replace(/est[aã]o$/i,'está'))
  .replace(/\b(eles|elas|os suspeitos|as vítimas|os autores)\s+est[aá](?=\s|[.,!?;:]|$)/gi,'$1 estão')
  .replace(/\b(eles|elas|os suspeitos|as vítimas|os autores)\s+tem\b/gi,'$1 têm')
  .replace(/\b(eles|elas)\s+nao\b/gi,'$1 não')
  .replace(/\bnao\s+ha\b/gi,'não há')
  .replace(/\b(ocorreu|aconteceu|começou)\s+a\s+(?=\d+\s+(?:minutos?|horas?|dias?)\b)/gi,'$1 há ')
  .replace(/\b(as|às)\s+(\d{1,2}:\d{2}|\d{1,2}h(?:\d{2})?)\b/gi,'às $2')
  .replace(/\bem\s+frente\s+(o|a)\s+/gi,(_,article)=>article.toLowerCase()==='o'?'em frente ao ':'em frente à ')
  .replace(/[\t ]+/g,' ').replace(/ +\n/g,'\n').replace(/\n +/g,'\n')
  .replace(/\s+([,;!?])/g,'$1').replace(/,{2,}/g,',')
  .replace(/([,;:])(?=\p{L})/gu,'$1 ').trim();
 text=text.replace(/\uE000(\d+)\uE001/g,(_,i)=>protectedParts[Number(i)]);
 if(!/[.!?…]$/.test(text))text+='.';
 return text.toLocaleUpperCase('pt-BR');
}
export function validateRewrite(original,proposed){
 const candidate=String(proposed||'').trim();
 if(/```|^\s*(?:relato corrigido|texto corrigido|aqui esta)\s*:/i.test(candidate))throw new Error('REWRITE_INVALID');
 if(!candidate||candidate.length>Math.max(1000,String(original).length*2.5))throw new Error('REWRITE_INVALID');
 const numbers=v=>String(v).match(/\d+(?:[.,:/-]\d+)*/g)||[];
 if(JSON.stringify(numbers(original))!==JSON.stringify(numbers(candidate)))throw new Error('REWRITE_FACTS_CHANGED');
 const norm=v=>String(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const absent=/\b(nao (?:sabe|sei|soube|informou|confirmou|se sabe)(?: se)?|nao|nunca|ninguem|sem|desconhecido|desconhecida|talvez|possivelmente|aparentemente|parece que)\b/g;
 const marks=v=>norm(v).match(absent)||[];
 if(JSON.stringify(marks(original))!==JSON.stringify(marks(candidate)))throw new Error('REWRITE_UNCERTAINTY_CHANGED');
 const dispatch=/\b(?:viatura (?:policial )?solicitada|equipe acionada|prioridade maxima|autor preso|suspeito preso|obito confirmado)\b/;
 if(dispatch.test(norm(candidate))&&!dispatch.test(norm(original)))throw new Error('REWRITE_FACTS_CHANGED');
 return correctReport(candidate);
}
