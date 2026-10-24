# CIJ 190 — desenvolvimento de biblioteca jurídica

## Auditoria inicial
Referência: main 0958ed1a422b310af493bdb45982612903bf75ce. Next.js 15, React 19, PostgreSQL via pg, Gemini via AI SDK, Tiptap. A API central autentica sessões, verifica origem de escritas e exige troca de senha provisória. Administradores gerenciam conteúdo. Preservados: catálogo de 100 naturezas, motor local prioritário, triagem, correção de escrita, extensão/eventos base190, aprendizado por avaliação, documentação e histórico. Não foram renomeados cookies, eventos, rotas antigas, repositório ou domínio.

## Implementação
- Marca pública CIJ 190 e metadados; biblioteca carregada sob demanda.
- Cadastro de fontes oficiais, importação com limite de tamanho, timeout e sem redirecionamentos arbitrários. Importação alternativa HTML explicitamente sem procedência confirmada.
- Originais imutáveis, hash SHA-256, texto capturado, ocorrências de artigos e subdivisões, trilha de conferência, versões, diferenças e deduplicação.
- Migração 001 transacional, idempotente e protegida por advisory lock; nenhuma migração jurídica automática durante requisições/build.
- PostgreSQL FTS em português e GIN, busca de artigo/norma e expansão lexical de conceitos. Não é busca vetorial e não apresenta expansão lexical como embeddings.
- Apenas versões aprovadas de normas disponíveis entram na busca. Contexto Gemini limitado a cinco artigos; blocos históricos detectados excluídos do RAG. IDs de fontes inexistentes rejeitados. Isso não comprova automaticamente que toda afirmação da IA é sustentada pela fonte.
- Leitura, referência copiável, favoritos e recentes por usuário. Administração: captura, comparação, decisão justificada e invalidação. API de disponibilidade e associações editoriais/verificadas com natureza.
- Workflow semanal de obtenção de fontes gera artefatos, sem escrever banco nem publicar legislação. Só será agendado pelo GitHub quando estiver na branch padrão; atualmente é desenvolvimento.

## Ambiente de desenvolvimento
1. Criar PostgreSQL isolado e configurar o esquema original da aplicação com uma conta de teste. Não reutilizar banco de produção em previews.
2. Configurar DATABASE_URL desse banco; executar `CIJ_ALLOW_MIGRATION=yes node scripts/migrate-legal.mjs`.
3. Configurar `CIJ_LEGAL_ENABLED=true` somente nesse ambiente e iniciar a aplicação.
4. Administrador abre Biblioteca Jurídica, seleciona norma e importa. HTML alternativo só após obtenção do documento oficial.
5. Conferir original, completude, numerações repetidas e redações históricas. Justificar aprovação. Testar consulta e RAG com casos fictícios.
6. Manter GEMINI_API_KEY apenas no servidor. Nenhuma chave nova é exigida.

## Evidências e limites desta entrega
49 testes passaram; build de produção passou. Novos testes cobrem extração, subdivisões, histórico, mudanças, referências exatas, expansão lexical e rejeição de IDs inventados. A captura real de CP, CC e MP retornou HTTP 503 em 24/10/2026. O relatório de captura está em docs/source-check.json. Nenhum acervo integral foi comprovadamente importado, conferido ou aprovado. Banco de produção não recebeu migração jurídica.

Não concluídos: importação/verificação integral das normas, teste integrado em PostgreSQL isolado e navegador autenticado, embeddings/pgvector, paginação completa de todos os artigos (consulta limitada a 100), hierarquia legislativa completa com todas as variantes de HTML, destaque visual de termos, links cruzados automáticos entre dispositivos, interface de edição de associações/disponibilidade e recuperação de documentos internos homologados. O índice atual registra caminho de até cinco títulos e não substitui a estrutura canônica da norma. A extração conserva ocorrências repetidas e alertas, mas exige conferência; não infere vigência. Documentos internos publicados não são presumidos homologados.

A comparação de versões está disponível na revisão administrativa; o workflow de fontes ainda não compara automaticamente artefatos de execuções anteriores. A validação de IDs não é uma garantia contra atribuição incorreta de artigo na prosa gerada. Revisão humana continua necessária. Não houve teste de chamada Gemini real nesta etapa.

## Publicação
Branch de desenvolvimento. Não fazer merge, deploy de produção ou executar migração de produção sem autorização explícita. Esta entrega é uma implementação inicial funcional condicionada a banco de desenvolvimento e acervo aprovado, e não o cumprimento integral do escopo solicitado.


## Correções e nova verificação — 24/10/2026
- Extração percorre o DOM inteiro e preserva texto em divs, contêineres aninhados, texto solto e quebras de linha sem duplicar descendentes. Teste de regressão incluído. Isso amplia a cobertura, mas não comprova todas as variantes legislativas.
- PostgreSQL isolado via PGlite executa o SQL real e as funções reais de importação, revisão e busca. Migração aplicada duas vezes, deduplicação, exclusão de pendentes, aprovação, pesquisa exata/FTS, consulta informal por expansão lexical, novas versões, indisponibilidade e invalidação verificadas com documentos fictícios.
- Busca expandida usa alternativas OR; antes a inclusão de sinônimos podia tornar todos os termos obrigatórios e reduzir os resultados.
- Fontes alternativas da Câmara cadastradas explicitamente para CP, CC e Maria da Penha. Captura usa timeout de 9 segundos por fonte e preserva a URL efetivamente utilizada na versão, em vez de atribuir todo documento ao Planalto.
- Nova captura: Planalto HTTP 503 e Câmara HTTP 403 para as três normas, neste ambiente. Não há contorno de bloqueios nem aprovação automática. Relatório atualizado em source-check.json.
- 51 testes passaram. Banco de produção não foi utilizado. Não houve migração em produção. Testes PGlite não substituem teste do provedor PostgreSQL hospedado nem do fluxo autenticado no navegador.
- Permanecem pendentes: acervo integral conferido, embeddings/pgvector, validação autenticada em navegador e demais funcionalidades de interface registradas acima. A publicação continua condicionada à resolução dos bloqueios; nenhuma garantia de 100% é declarada.
