# Projeto 03 — controle de qualidade e aprendizado supervisionado

## Base e escopo
Referência: main 0958ed1a422b310af493bdb45982612903bf75ce. Branch própria; sem integrar Projetos 01/02, alterar main, configurar produção ou migrar banco remoto.

## Fluxo persistente
Like -> propostas pendentes por natureza/tópico/versão de lógica -> revisão administrativa -> aprovação -> publicação ativa. Cada ticket identifica a avaliação sem carregar resposta ou relato. Somente perguntas canônicas reconhecidas podem originar propostas. Likes repetidos são idempotentes e agrupados pela chave de proposta. Dislikes ficam registrados e não publicam. Um dislike posterior reduz a contagem de avaliações positivas; não desfaz uma aprovação editorial já deliberada.

O administrador principal pode editar a pergunta, manter uma referência editorial separada, aprovar, rejeitar, devolver para revisão e mesclar propostas equivalentes. Edição retira a publicação e exige nova aprovação. Mescla exige o mesmo tópico e natureza, versão atual de origem/destino e não cria detectores. Aprovação é transacional e consolida uma única publicação por natureza/tópico. Revisão otimista por revision, locks de linha e advisory lock serializam decisões e votos concorrentes. Decisões guardam antes/depois, justificativa, responsável e data; reenvio de decisão antiga recebe 409.

## Interface
Aba Controle de Qualidade, carregada sob demanda, exclusiva do administrador principal. A API também verifica username, papel e troca obrigatória de senha. Indicadores: pendentes, aprovadas, rejeitadas, revisão, mescladas, legado e publicações. Filtros: data, natureza por código, origem, status, mínimo de likes, com páginas de 30 itens. Detalhe: natureza, origem, data, likes, pergunta original/atual, referências editoriais do catálogo quando disponíveis, equivalentes, histórico de avaliações e decisões. Todas as ações utilizam banco real; confirmações e conflitos são apresentados ao usuário. Há proteção de alterações editoriais não salvas ao trocar proposta, navegar pela função go ou sair da página; ações externas que substituam diretamente a tela ainda exigem atenção do operador.

## Migração
lib/quality-schema.js contém o schema e a migração transacional versionada em quality_migrations (versão 1). migrations/003-quality-schema.sql é um espelho legível do schema; não substitui a função de migração do legado. prepare() aplica migrateQuality depois de criar as tabelas antigas. Toda migração é idempotente e serializada, sem apagar ou sobrescrever tabelas antigas.

Aprendizados existentes viram propostas `legacy`, com vínculo explícito legacy_question_id, votos preservados e publicações apenas se antes estavam elegíveis por voto positivo de usuário ativo. Eles continuam disponíveis como exceção legada explícita, até revisão administrativa; não são apresentados como aprovados pelo novo fluxo. É possível revisar, editar, rejeitar ou mesclar o legado. Uma reprovação retira a publicação sem apagar o registro anterior. A leitura ativa agora usa quality_publications/quality_proposals, não os likes diretos. Uma edição de redação preserva topic e seus detectores; perguntas já respondidas continuam ocultas. Detectores não são criados ou reescritos por IA. A compatibilidade semântica de uma reformulação exige conferência explícita do administrador; a verificação automática impede troca de tópico/duplicação evidente, mas não substitui essa revisão.

## Privacidade e referência editorial
Não se persiste relato, resposta original do Gemini, nome, contato ou endereço obtido automaticamente da análise. A prévia segura é deliberadamente omitida: mostrar texto supostamente anonimizado seria menos confiável. Persistem somente perguntas canônicas, tópicos, códigos de natureza, identificadores de feedback/usuário, versão de lógica, datas e votos. Referências jurídicas exibidas vêm do catálogo da natureza, não de uma resposta livre da IA.

Resposta de referência e explicação são textos genéricos criados explicitamente pelo administrador, sem cópia automática. Têm limites de tamanho, bloqueio de HTML/contatos identificáveis e aviso de não inserir dados pessoais. Esses bloqueios não são anonimização universal: cabe ao curador manter o conteúdo genérico. Referência editorial não é orientação jurídica oficial, não é recuperada pelo Gemini, não alimenta classificação nem se torna acervo de respostas homologadas. Apenas a pergunta aprovada influencia triagem, por seu tópico estável.

## Retenção
Avaliações e seus vínculos pessoais: 180 dias. O administrador aplica a política pelo botão de retenção, com confirmação. São removidos feedbacks mais antigos e vínculos/eventos associados por cascata; propostas, publicações e decisões editoriais permanecem para auditoria. Isso não desfaz publicações administrativas. A operação gera registro no audit_log. Contagens de likes podem diminuir após retenção. O prazo é política técnica inicial configurada no código, a confirmar com a instituição antes da implantação. Histórico editorial minimizado é mantido enquanto o conteúdo existir, para rastreabilidade; não se armazena relato para fins de auditoria. Não há agendamento nem exclusão silenciosa de conteúdo editorial nesta entrega.

## Assinatura e implantação futura
- FEEDBACK_SIGNING_KEY: segredo independente, aleatório, pelo menos 32 caracteres, somente servidor. Gerar por meio seguro (ex.: openssl rand -base64 32); não versionar nem colocar em variável NEXT_PUBLIC.
- Tickets novos v2 incluem a versão triage-v1 e validade de 24 h. Não dependem da chave Gemini.
- Rotação: mover a chave atual para FEEDBACK_SIGNING_KEY_PREVIOUS, definir uma nova atual e remover a anterior depois de 24 h.
- Migração opcional v1: configurar FEEDBACK_LEGACY_ACCEPT_UNTIL com data ISO fixa até 24 h após rollout. Somente nessa janela tickets anteriores assinados pela chave Gemini são verificados; nenhum novo ticket v1 é emitido. Sem configuração, tickets v1 são rejeitados e o usuário deve fazer nova análise. Remover a configuração ao encerrar a janela.
- Sem segredo independente, o resultado Gemini continua disponível, mas o feedback informa indisponibilidade de configuração. Não há fallback automático para assinar novos tickets com a chave do provedor.
- Antes de implantar, homologar migração e sessão de administrador em ambiente de teste com PostgreSQL isolado e configurar o segredo. A produção não recebeu alterações.
- Ao integrar posteriormente com Projeto 02, acrescentar feedbackUnavailable aos campos opcionais de seu contrato compartilhado. Esta branch parte da main e não transporta mudanças de comunicação daquele projeto.

## Testes e limites
47 testes automatizados aprovados; build de produção Next.js aprovado.

Testes reais de SQL em PostgreSQL isolado via PGlite, com casos fictícios: migração repetida; like pendente e sem publicação; idempotência; edição de pergunta e referência; confirmação de detector; tópico duplicado; aprovação; retirada ao devolver/rejeitar; filtros; duas revisões concorrentes com mesma versão (uma aceita e outra 409); legado; mescla; retenção; histórico antes/depois; ausência de resposta/relato no detalhe. Testes de assinatura: chave independente, outra identidade, adulteração/expiração, rotação e janela v1. Regressões existentes de catálogo/triagem/escrita/permissões preservadas.

PGlite valida o SQL e o fluxo de domínio, mas não substitui homologação no PostgreSQL hospedado nem navegação autenticada. Não houve chamada Gemini real, sessão Chrome real ou migração de produção. Configuração do segredo e homologação autenticada permanecem etapas obrigatórias antes de publicação.
