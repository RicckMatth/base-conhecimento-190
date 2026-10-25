# Projeto 05 — editor e anexos privados

## Auditoria e causa-raiz
Main examinada: 0958ed1a422b310af493bdb45982612903bf75ce. O editor permitia imagem HTTPS, enquanto next.config.mjs usa img-src 'self' data:. A imagem era aceita no HTML e bloqueada pelo navegador. A solução não amplia a CSP: imagens novas usam /api/documentation/assets/:id na própria origem, com sessão e verificação de referência publicada. A CSP original permanece restritiva e inalterada.

## Armazenamento real e configuração
Uploads são recodificados e enviados a Vercel Blob PRIVATE por @vercel/blob. A base guarda apenas metadados, hashes, referências e histórico, sem imagens/base64. Filesystem da função não é utilizado para persistência. Biblioteca sharp valida e recodifica em memória. O limite de entrada é 3 MiB, abaixo do limite usual do corpo de funções Vercel; nenhuma imagem grande é colocada em JSON.

Antes de homologar: criar/conectar um store PRIVATE no ambiente autorizado, configurar BLOB_STORE_ID com OIDC ou BLOB_READ_WRITE_TOKEN somente no servidor. Não usar store público nem variável NEXT_PUBLIC. Sem configuração, a API informa indisponibilidade; não simula upload bem-sucedido. Não foi provisionado store nem alterado ambiente de produção nesta entrega. A integração real com o provedor precisa ser homologada com as credenciais daquele ambiente.

## Upload e proteção
- Seleção por arquivo, drop e paste no editor; progresso XHR, abort no desmontar, rejeição de resultado de página substituída e aviso de erro.
- PNG/JPEG/WebP estáticos somente. Magic bytes e MIME compatíveis são conferidos antes de sharp; decoder valida estrutura; até 20 milhões de pixels. Rejeita SVG, GIF/animações e formatos não contemplados. Saída WebP, até 2400x2400 px, sem metadados EXIF/GPS preservados. Esse módulo não oferece upload genérico de PDF/Office/executáveis.
- Nome é UUID gerado pelo servidor. Arquivo privado não expõe a URL Blob ao navegador.
- Download autenticado, no-store, nosniff e CSP sandbox da resposta. Leitor comum só vê imagem referenciada pela revisão atual de uma página publicada. Administrador pode ler imagens de rascunhos; usuários sem sessão ou sem permissão não têm acesso por adivinhar o UUID.
- Salvamento verifica todos os anexos: precisam existir, estar ativos e pertencer à página ou ser upload ainda não vinculado do próprio autor. Arquivo de outra página não pode ser reaproveitado silenciosamente.
- Histórico de versões retém referências. Excluir arquivo usado por versão/rascunho é bloqueado. Remover nó no editor não apaga arquivo necessário a restauração. Gerenciar anexos lista até 100 uploads recentes do próprio administrador; exclusão física é permitida somente quando órfão, com confirmação e verificação transacional.
- Importação HTTPS exige hostname exato em DOC_IMAGE_IMPORT_HOSTS (vazio bloqueia). Não admite credenciais na URL, IP literal, portas alternativas ou redirecionamento. DNS IPv4 é validado contra faixas privadas/reservadas e o endereço resolvido é fixado no dispatcher undici; a importação não deve ser configurada para hosts não confiáveis. Há limite de bytes e timeout de 12 s. A imagem é copiada, validada e recodificada antes de ser exibida pela mesma origem. IPv6 na importação externa não está habilitado.

## Editor
Tiptap instalado/validado em 3.32.0. Nó DocumentImage preserva src/alt/largura/alinhamento/legenda no HTML sanitizado. Figura com alça de arraste, largura numérica 100–1200 px, máximo 100% no viewport, legenda e texto alternativo editáveis em ferramentas contextuais. Tabelas preservam colwidth e têm rolagem horizontal; comandos existentes de linhas/colunas/listas/checklists e formatação foram mantidos. Lista de títulos permite navegação e âncoras estáveis geradas para títulos editados. Undo/redo e atalhos nativos de StarterKit permanecem; seleção de nós de imagem permite exclusão com teclado. Não há colaboração simultânea em tempo real.

Temas usam --panel/--ink/--soft/--line e mantêm contraste das ferramentas, destaques, seleção, tabelas e resize. Mobile usa controles de pelo menos 44 px, ferramentas com rolagem, texto 16 px e tabelas largas contidas. Testes CSS verificam essas regras estruturalmente; isso não substitui inspeção visual em dispositivos reais.

## Páginas, versões e recuperação
Página pai e relacionadas, com validação transacional contra ciclos. Não foram apagadas páginas antigas. Status, autoria, data e revisão continuam registrados. Histórico pode ser usado como origem para nova revisão: o salvamento exige a revisão atual da página e verifica a existência da versão original. Não sobrescreve silenciosamente uma revisão concorrente. Salvamento sem alterações não cria nova versão.

Rascunho de recuperação no PostgreSQL por usuário/página (um rascunho 'new' para uma página nova por usuário), debounce de dois segundos, separado das versões publicadas. Confirmação para recuperar, controle de revisão entre abas, referências de anexos protegidas e indicação do estado. O conteúdo fica em memória quando a conexão falha; não há armazenamento automático em localStorage. Mudanças ainda não confirmadas pelo servidor podem ser perdidas se o usuário forçar fechamento/offline antes da recuperação; beforeunload avisa. O componente é mantido montado ao navegar internamente, para preservar o conteúdo; ao sair da sessão é desmontado, após tentar concluir a recuperação e confirmar eventual falha. Uploads pendentes são cancelados no desmontar.

Enquanto o salvamento está em andamento, o editor e campos principais ficam bloqueados para impedir que teclas posteriores sejam marcadas como salvas indevidamente. Salvamento espera eventual recuperação em andamento para evitar recriar um rascunho removido. Restaurar é uma edição sujeita a revisão/publicação explícita; não publica automaticamente conteúdo histórico.

## Backend e migração
prepareDocumentationSchema aplica alterações aditivas/idempotentes em transação com advisory lock, depois das tabelas existentes. Schema de referência: migrations/005-documentation-up.sql. Novas tabelas: documentation_assets, documentation_asset_refs, documentation_drafts, documentation_draft_assets e documentation_events. Campos novos: parent_id e metadata de versões. Tabelas e conteúdo originais são preservados. Texto oficial/jurídico não se torna homologado por estar numa página.

Administração é verificada no servidor para criar/editar/restaurar, upload/importação/exclusão e recuperação. Usuários comuns continuam restritos a páginas publicadas. Eventos de save/restore registram autor, revisão, ação e data sem logar corpo do documento em console.

## Testes
48 testes automatizados e build de produção aprovados.
- Assinatura, MIME, tamanho, rejeição SVG/executável e recodificação real com sharp.
- PostgreSQL isolado via PGlite: schema repetido; upload com adaptador Blob de teste; privacidade antes/depois de publicar; referências por página; salvamento/reabertura; rascunhos; proteção de arquivo histórico; restauração; conflito de revisão; ciclo na hierarquia; ausência de nova revisão em salvamento idêntico.
- Tiptap real com JSDOM: serialização/sanitização/reabertura de imagem, legenda, alt, largura, alinhamento, tabela/colwidth, checklist, formatação e âncoras. Esse teste identificou e confirmou correção da perda de legenda no parser de figura.
- CSP e XSS; regras estruturais de temas e responsividade.
- Regressões existentes e build de produção.

## Limitações e homologação
Sem deploy, sem migração no PostgreSQL remoto e sem credenciais Blob usadas nesta tarefa. Os testes substituem apenas o transporte Blob por adaptador controlado; não comprovam disponibilidade/configuração de um store real. Não houve homologação em Chrome autenticado nem screenshot de desktop/mobile. Fluxos de upload/paste/drop e resize exigem essa etapa de navegador antes da publicação. Não declare equivalência integral ao Confluence.

Imagens externas antigas permanecem no conteúdo/histórico original e podem continuar bloqueadas pela CSP até importação autorizada. Ao salvar HTML que ainda usa URL externa, a API exige converter para anexo controlado em vez de liberar o domínio. Nenhuma captura automática de URLs antigas foi feita. Rascunhos e imagens históricas não são apagados automaticamente; uma política institucional de retenção poderá ser adicionada. O sistema de anexos desta etapa aceita somente imagens raster, não documentos de escritório.

A branch parte da main, sem integrar automaticamente Projetos 01–04. Uma futura integração deve unificar seus marcadores de migração, paginação e estados sem perder as referências de anexos.
