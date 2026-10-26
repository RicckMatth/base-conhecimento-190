# Triagem contextual: elementos penais e perguntas de esclarecimento

Base auditada: main `9a4beb27fa5f5839e01d3327defcc87d6ff25cdb`.
Branch: `feature/triagem-penal-contextual`.

## Problema e alteração

Uma resposta local pode sugerir uma natureza por coincidência de termos sem esclarecer os elementos da conduta. Além disso, antes desta alteração as perguntas do Gemini só eram apresentadas quando a IA conseguia associar o texto a uma ficha. Sem natureza reconhecida, as perguntas desapareciam. O exemplo fictício de discussão entre um casal, saída de um dos pais com filho comum e tentativa frustrada de abrir a porta do carro já seguia para a IA no main auditado; a deficiência principal era a falta de uma avaliação estruturada e de perguntas independentes da natureza.

A API agora distingue perguntas gerais de relatos. Mantém FAQ local e hipóteses locais fortes, com aviso explícito de que natureza operacional não comprova crime. Submete relatos sem resposta local, com associação frágil (por exemplo, correspondência de um único grupo de termos), ou em contexto familiar com criança, à complementação do Gemini. Emergências operacionais locais mantêm o caminho rápido. O critério heurístico não é um teste jurídico de tipicidade nem uma probabilidade de acerto.

A saída de análise do Gemini passa a ter esquema e validação adicional de tamanho, tópicos permitidos, natureza existente e estrutura. Estados:

- `informacao_insuficiente`: faltam elementos para avaliar a conduta;
- `sem_indicios_relatados`: avaliação limitada aos fatos informados;
- `indicios_relatados`: hipótese assistiva acompanhada de trechos literais;
- `hipotese_local`: hipótese operacional da base, sem conclusão penal.

Trechos ausentes, negados ou incertos não sustentam o estado positivo. Em contexto familiar, perguntas essenciais ainda pendentes impedem o estado negativo. Esses controles são conservadores e podem manter perguntas quando uma resposta estiver redigida de forma que os detectores não reconheçam.

Perguntas são estruturadas e filtradas pelos detectores existentes. O roteiro familiar inclui agressão à mulher, agressão à criança, ameaça, segurança e paradeiro da criança, condições de guarda/convivência, medida protetiva e eventual contato ou risco com veículo. Perguntas de mulher e veículo só são impostas se esse contexto existir. A IA pode selecionar outros tópicos canônicos, incluindo coação e conduta concreta. Não são gerados detectores livres pela IA.

Falta de feridos não responde se houve agressão. Informação desconhecida não equivale a uma negativa. Contradições continuam exigindo esclarecimento.

Perguntas de esclarecimento aparecem mesmo sem natureza reconhecida. Elas não são aprendidas sob uma natureza presumida. Em avaliações insuficientes ou sem indícios, `feedbackNature` permanece nulo e não há perguntas elegíveis para aprendizado. O mecanismo de like/dislike existente foi preservado. Esta alteração não integra a branch independente de Controle de Qualidade.

## Limite operacional e jurídico

Não foi implementada a recomendação automática de não abrir ocorrência. Ausência de informação não comprova inexistência de crime, e proteção/socorro podem ser necessários sem infração penal identificada. O alerta vermelho informa a limitação, orienta esclarecer os fatos e preserva a decisão institucional. Uma proteção adicional descarta respostas geradas com algumas formulações categóricas de inexistência de crime ou recusa automática de registro. Não é possível garantir segurança semântica apenas com expressões regulares: a avaliação continua assistiva e sujeita a erro da IA.

Referências consultadas em 26/10/2026 para fundamentar o cuidado com o exemplo, sem concluir enquadramento concreto:

- Código Penal, art. 249 e § 1º: condições da guarda e restrições ao poder familiar precisam ser verificadas. https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm
- Lei 11.340/2006, arts. 5º e 7º: formas de violência não se limitam à lesão física. https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2006/lei/l11340.htm

O Gemini não ganhou navegação externa. Continua instruído a citar números de artigos somente quando disponíveis nas referências do contexto. Não foi homologada toda a base jurídica nesta entrega.

## Interface e falhas

Alerta vermelho com sombra animada suave, sem piscar texto, respeitando `prefers-reduced-motion`. Cabeçalho e aviso acessíveis, contraste adaptado aos temas e perguntas legíveis no celular. Indícios positivos e hipóteses locais também exibem ressalvas, sem cor verde de confirmação.

Timeout, falta de configuração, quota e falhas do Gemini retornam uma análise não conclusiva com perguntas locais de esclarecimento. Não são transformados em ausência de crime. O operador pode atualizar o relato e analisar novamente. A edição, limpeza ou escolha de exemplo cancela a requisição da página e descarta resposta obsoleta. Essa análise tem estado de carregamento independente das demais operações da página. Não foi implementado cancelamento distribuído do processamento já iniciado no servidor nesta entrega.

Limites preservados: Gemini 22 segundos, função 30 segundos; a página encerra a espera em 40 segundos. Nenhuma espera ilimitada nem repetição automática da chamada externa.

## Privacidade e compatibilidade

Não foram adicionados logs de relatos, cache de respostas, persistência de trechos de evidência ou armazenamento de novos dados pessoais. Trechos exibidos existem apenas na resposta transitória. Os tópicos para aprendizado são canônicos; o fluxo de envio do relato ao provedor já existente permanece sujeito às políticas institucionais. Autenticação, permissões, orçamento de IA e validação de origem continuam no servidor.

Não houve alteração no banco, migração, gravação de ocorrência, preenchimento do SADE ou alteração da extensão. A correção da ponte da extensão está em outra branch (Projeto 02) e não está implicitamente integrada aqui. Não foi feito merge nem deploy nesta entrega.

## Arquivos

- `lib/narrative-review.js`: decisão de complementação, avaliação, validação e falhas seguras;
- `lib/gemini.js`: esquema, instruções, perguntas e avaliação estruturada;
- `lib/triage.js`: tópicos estáveis e detectores conservadores;
- `app/api/[[...path]]/route.js`: integração na análise e no chat;
- `app/narrative-assessment.jsx`, `app/page.jsx`, `app/analysis-feedback.jsx`, `app/globals.css`: alerta, perguntas, feedback e cancelamento;
- `tests/narrative-review.test.mjs`, `tests/narrative-assessment-ui.test.mjs`: regressões e renderização real do componente com React.

## Verificação

62 testes automatizados aprovados, incluindo os 48 anteriores. Build de produção aprovado. Os novos testes usam relatos fictícios e provedor simulado; verificam os três estados do Gemini, caminho local, perguntas sem natureza, filtros por contexto, negações, incertezas, contradições, trechos inventados, estrutura inválida, excesso de tamanho, quota, timeout, configuração ausente, proteção contra recusa de registro, renderização React e escape contra XSS.

Responsividade, tema e cancelamento possuem verificações de estrutura/código; não representam uma homologação visual em dispositivos reais. Não foi feita chamada autenticada ao Gemini real nem medição de precisão penal em corpus homologado. Antes da publicação recomenda-se avaliação institucional com casos anonimizados, inclusive versões com agressão explícita, ameaça, risco à criança, decisão judicial, negativas e fatos não penais. Não há garantia de exatidão jurídica de 100%.
