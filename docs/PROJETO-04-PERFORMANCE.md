# Projeto 04 — performance, consultas e dados

## 1. Auditoria e escopo efetivo
Base: main 0958ed1a422b310af493bdb45982612903bf75ce. Next 15, React 19, pg com pool de duas conexões, motor local, Gemini, catálogo, documentação Tiptap, administração e aprendizado por votos. A main não contém a biblioteca jurídica/pgvector nem curadoria do Projeto 03; esta branch não os incorpora implicitamente. Nenhuma consulta foi executada no banco de produção.

Gargalos confirmados: análise consultava custom_rules, até 800 fichas com corpo completo e todas as perguntas elegíveis em cada pedido; reconstruía enriquecimento por procura linear; recuperação de contexto normalizava novamente títulos/resumos a cada chamada; consultas learned eram repetidas entre catálogo/regras/análise; cold start repetia DDL/seed por instância; inicialização da UI aguardava catálogo e regras; documentação baixava todos os corpos HTML para pesquisar no navegador.

Login/sessões: token_hash já tem PK; users.username e knowledge.code já têm UNIQUE. Não foram criados índices duplicados. Sessões/autorização continuam consultadas por pedido e nunca entram no cache. Administração preserva transações e revisão otimista anteriores. Não há índice vetorial a otimizar nesta main.

## 2. Medições antes/depois
Ambiente: Node local, PGlite (PostgreSQL em WASM) isolado, documentos e relatos fictícios. Scripts e resultados JSON acompanham o código. São benchmarks de função/SQL; não representam RTT da Vercel, p95 HTTP, produção ou chamada Gemini real.

| Cenário | Antes | Depois | Condição |
|---|---:|---:|---|
| Contexto, 100 fichas, mediana | 0,632 ms | 0,011 ms | índice aquecido |
| Contexto, 1.000 fichas, mediana | 6,901 ms | 0,028 ms | índice aquecido |
| Contexto, 10.000 fichas, mediana | 58,786 ms | 0,116 ms | índice aquecido |
| Contexto, 10.000 fichas, p95 | 74,533 ms | 0,225 ms | 40 amostras pareadas |
| SELECT catálogo ordenado, 10.000 registros | 7,953 ms | 0,770 ms | EXPLAIN ANALYZE, índice title |
| Motor local, 6.000 perguntas, mediana | 0,620 ms | 0,567 ms | 120 classificações, índice por natureza |
| Motor local, 6.000 perguntas, p95 | 2,283 ms | 1,958 ms | mesmos resultados antes/depois |
| Lista de 10.000 documentos, mediana SQL | 258,477 ms | 6,459 ms | todos os corpos vs 51 metadados |
| Lista de documentos, p95 SQL | 351,309 ms | 26,091 ms | 10 amostras; p95 é o maior valor nesta amostra |
| Payload da lista sintética | 35.397.789 bytes | 6.460 bytes | inclui uma linha extra para detectar próxima página |

A construção inicial do índice de contexto custou 121,142 ms com 10 mil fichas neste ensaio, maior que uma consulta original isolada. O ganho vem da reutilização em leituras posteriores. Metadados sintéticos ocupam 1.410.337 bytes serializados, frente a 21.510.337 com corpos; cinco candidatos ocupam 10.770 bytes. Os números não são consumo real de heap do serviço; snapshots de heap do benchmark estão no JSON, mas não constituem comparação de memória controlada por GC.

Consultas do caminho de dados, sem sessão, preparo de esquema ou quota: antes 3 por análise; agora FAQ conhecida 0, classificação local com cache aquecido 1 (revisão), fallback com até cinco corpos 2. Primeira carga exige 6 consultas (revisão antes/depois e três conjuntos), uma troca explícita de custo frio por leituras quentes menores. Requests concorrentes partilham a carga em andamento; três leitores frios exigiram até 8 consultas no teste, em vez de três recargas independentes. Não são contagens completas de todos os endpoints.

## 3. Modificações
- Índice invertido em memória para os mesmos tokens/pesos, com desempate pela ordem original. Só arrays de catálogo imutáveis reutilizam o índice; arrays mutáveis são reconstruídos para evitar resultado obsoleto após edição. WeakMap vinculado a arrays de catálogo; consultas e históricos não são armazenados. Testes com 2.000 fichas comparam igualdade de resultados.
- Snapshot compartilhado por instância contém metadados, regras e perguntas não individualizadas. Corpos são obtidos somente para até cinco candidatos após falha local. Mapas por código e natureza evitam buscas lineares repetidas. FAQs estáticas são respondidas antes de ler esses conjuntos.
- Cache consulta revisão no PostgreSQL em toda leitura. Triggers transacionais em knowledge/custom_rules/learned_triage_questions/triage_question_votes/triage_feedback/users invalidam inclusive escritas por instâncias antigas ou SQL externo. Rollback não altera a revisão. TTL de cinco minutos é proteção adicional, não o mecanismo primário. Mudança durante recarga obriga repetir; três conflitos seguidos falham, sem publicar snapshot inconsistente. Dados carregados são congelados. Não há cache de sessão, usuário, relato, consulta ou resposta da IA.
- Esquema de runtime versionado: preparação transacional com advisory lock, marcador versão 4 e seed idempotente. Instâncias novas verificam o marcador e evitam repetir todo DDL/seed quando já aplicado. Se futuras alterações de schema forem feitas, a versão deve ser elevada; não excluir tabelas manualmente mantendo o marcador.
- Índice knowledge(title) adicionado por benefício observado no plano. Pg mantém max=2; statement_timeout 15 s, query_timeout 17 s e conexão 8 s. Função API maxDuration 45 s; Gemini mantém limite 22 s, zero retries. Isso não substitui o cancelamento de transporte implementado separadamente no Projeto 02.
- UI abre após sessão e carrega catálogo/regras em segundo plano. Endpoint /entries?view=summary fornece metadados; /entries/detail fornece corpo individual. Endpoint /entries original continua completo por compatibilidade; a tela do catálogo atual ainda usa esse caminho.
- Documentação usa listagem paginada de metadados, pesquisa no servidor, debounce de 250 ms, cancelamento de listagem obsoleta, descarte de detalhe obsoleto e corpo sob demanda. O endpoint antigo sem view=summary permanece compatível. As permissões de rascunhos são verificadas também no detalhe. Módulo Tiptap continua lazy.
- Server-Timing nas respostas de análise mede db, classify, retrieve, context, provider, gemini e total conforme o caminho. Total cobre o trecho instrumentado de análise, não login/middleware/rede/browser. Contadores de duração/erros por fase e hits/misses/queries do loader em /api/admin/performance, autenticado e restrito a admin. Contadores são apenas desta instância, reiniciam no cold start e não são métricas da frota. Nenhum nome de métrica ou label aceita texto de usuário; não há logs de relatos, credenciais ou respostas.

## 4. Migrações e reversão
lib/performance-schema.js é aplicado por prepare() dentro da migração transacional do runtime. migrations/004-performance-up.sql permite revisar o schema/trigger/índice; migrations/004-performance-down.sql remove os componentes novos sem apagar dados de negócio. Fazer rollback de código antes de retirar os triggers, para não manter instâncias novas com cache sem invalidação. Nenhum up/down foi executado em produção. Migração online grande deve ser planejada: CREATE INDEX comum pode bloquear escritas durante aplicação; o teste de 10 mil linhas não comprova duração em produção. Para grandes tabelas, executar CREATE INDEX CONCURRENTLY em janela própria antes do rollout.

## 5. Testes e reprodução
- npm test: 47 testes aprovados (regressões existentes e quatro testes novos de equivalência, PostgreSQL/cache e métricas).
- npm run build: aprovado.
- node scripts/benchmark-before.mjs: baseline original preservado em scripts/fixtures/assistant-before.mjs, planos EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON).
- node scripts/benchmark-after.mjs: comparação pareada e custo de criação do índice.
- node scripts/benchmark-local.mjs: classificação equivalente com índices de perguntas.
- node scripts/benchmark-documents.mjs: SQL e payload de documentação sintética.
- Evidências: performance-before.json, performance-after.json, performance-local.json, performance-documents.json.

## 6. Limitações e próximos passos
Não foram medidos p95 da API HTTP em Vercel, login em provedor real, tempo percebido em navegador autenticado, concorrência de conexões na frota, tráfego de rede ou latência externa real do Gemini. Server-Timing e endpoint técnico fornecem instrumentação para a homologação posterior; não provam esses ganhos antecipadamente.

Busca jurídica e pgvector não existem na main auditada, portanto não há benchmark jurídico legítimo desta entrega. No Projeto 01, medir FTS/pgvector com corpus aprovado antes de definir HNSW/IVFFlat. Documentação ainda usa pesquisa por substring em conteúdo sem tags, sem FTS/trigram novo; a redução comprovada é listagem/payload, não escalabilidade ilimitada de pesquisa arbitrária. Catálogo legado ainda entrega corpos e renderiza a lista antiga (até 800); o caminho de análise recupera até 10 mil metadados e 200 regras personalizadas. Além desses limites, adotar recuperação SQL com recall medido, em vez de truncar silenciosamente.

A revisão global pode ser ponto de contenção em escrita intensa. Verificar pg_stat_statements, buffer hit ratio, pooler do provedor, conexões totais por instância e uso de CPU antes de expandir cache ou pool. Cache distribuído não foi adicionado sem necessidade medida. Métricas por instância não devem ser usadas como SLO global. Testes no navegador autenticado e carga HTTP controlada com contas/dados fictícios permanecem necessários antes de publicação.

Branch própria do Projeto 04; sem merge na main, sem integração automática com Projetos 01/02/03 e sem deploy em produção.
