# Base de Conhecimento 190 — Node.js + PostgreSQL 

https://base-conhecimento-190.vercel.app/

Portal de consulta de naturezas e análise de relatos com **Next.js (Node.js)**, autenticação real, banco PostgreSQL e trilha de auditoria.

> **Aviso operacional:** as classificações, prioridades, códigos e referências legais são sugestões técnicas NÃO homologadas. Valide-as com a instituição antes do uso. Não processe dados pessoais, sensíveis, sigilosos ou de ocorrências reais sem avaliação jurídica, segurança e autorização institucional.

## Integração Relato 190 v5.14.0 — análise ao vivo no chat (TESTE)

A Base 190 é **a única interface de resultados** da extensão [Relato 190 integrada](https://github.com/RicckMatth/190-extensao_integrada). A extensão atua apenas como **ponte silenciosa**, sem exibir natureza, resultado, perguntas ou reformulações.

1. Instale a extensão **v5.14.0** e faça login normalmente nesta Base 190.
2. No Chrome, abra **Detalhes → Opções da extensão** e ligue **Análise automática de relatos**. Este é o único consentimento de transmissão; o site não precisa autorizar nada.
3. Abra o SADE/simulador em uma página suportada. A ponte entra em funcionamento **automaticamente**, sem abrir o painel da extensão ou clicar em Analisar.
4. Digite um relato fictício de pelo menos 20 caracteres. Depois de ~1,15 segundo sem alterações, a Base recebe o texto e analisa-o via API autenticada. O fluxo limita repetição e descarta resultados obsoletos.
5. O chat **Integração 190** abre automaticamente ao receber a resposta, e atualiza sua última análise ao vivo, sem acumular dezenas de mensagens durante a digitação.
6. Para parar, desative a preferência nas opções da extensão; nenhum resultado é enviado para o SADE e nenhuma ocorrência é salva/despachada automaticamente.

**Segurança:** o opt-in de transmissão fica no `chrome.storage.local`; autenticação exigida pelo servidor com sessão `HttpOnly`, e HTTPS/TLS para o tráfego. Não há criptografia ponta a ponta. O texto do relato pode conter dados pessoais ou sigilosos: a função continua **experimental e não homologada para uso operacional com dados reais**, dependendo de autorização institucional e avaliação de LGPD.

## Recursos

- Sessões com token aleatório, apenas hash persistido no PostgreSQL, cookie Secure/HttpOnly/SameSite.
- Senhas com scrypt + salt independente, proteção básica contra tentativas repetidas.
- Sem cadastro público: visitantes podem solicitar acesso; só o administrador aprova.
- Todo usuário aprovado recebe perfil simples (somente leitura). O administrador exclusivo `pm-civil.bandeira` é inicializado pelo servidor.
- Editor de fichas restrito ao administrador, histórico de revisões e concorrência otimista.
- Gestão de usuários, bloqueio, redefinição de senha, regras personalizadas e auditoria básica.
- Cérebro 190 adaptado do mecanismo existente para execução no Node.js, com regras extras e índice **heurístico** (não probabilidade).
- Tema claro/escuro funcional e responsividade mobile/desktop.
- Implantação automática por Git Integration do Vercel.

## Instalação local

Node.js 20+ e um PostgreSQL com acesso TLS:

```bash
npm install
cp .env.example .env.local
npm run dev
```

Edite `.env.local` com `DATABASE_URL` (string de conexão do banco) e `ADMIN_INITIAL_PASSWORD` (senha inicial temporária do administrador). **Não grave senha em `package.json`, README ou Git.** Essa senha precisa ter pelo menos 12 caracteres; remova-a do Vercel após o primeiro login e **troque a senha inicial por uma nova**. Não reaproveite senhas já compartilhadas em conversas.

O servidor cria as tabelas automaticamente na primeira requisição autenticada e inicializa o catálogo a partir das regras demonstrativas. Não há fallback com contas ou dados locais.

## Deploy Vercel + GitHub

1. Vercel → **Add New > Project** → importe `RicckMatth/base-conhecimento-190`.
2. Framework **Next.js**, Root Directory `./`, production branch `main`.
3. Crie um banco **PostgreSQL gerenciado**, por exemplo Neon, com TLS, de preferência na mesma região das funções. Associe a conexão ao projeto.
4. Em Vercel → **Settings > Environment Variables**, configure:
   - `DATABASE_URL`: conexão PostgreSQL (Production e Preview, idealmente **bancos distintos**).
   - `ADMIN_INITIAL_PASSWORD`: senha inicial forte e temporária do administrador, em variável Sensitive/Encrypted.
5. Faça **Redeploy** após adicionar as variáveis. Acesse a URL, faça login com usuário `pm-civil.bandeira` e a senha configurada no Vercel. Ao primeiro login, a conta administrativa será criada na base.
6. Após inicialização, retire `ADMIN_INITIAL_PASSWORD` do ambiente e redeploy. A conta permanece no banco de dados.
7. Toda atualização na branch `main` será automaticamente implantada na produção. Outras branches geram URLs Preview.

`DATABASE_URL` não configurada: API responde **503** (falha segura). Banco inacessível: autenticação e escrita não são liberadas.

## API

- `POST /api/access-requests`: solicitação pública de acesso (com proteção de origem e limitação de tentativas).
- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/session`.
- `GET /api/entries`, `GET /api/rules`, `POST /api/analyze`: apenas usuários autenticados.
- `GET/POST/PATCH /api/admin/...`: exclusivos do administrador; o servidor não confia em permissões do navegador.

O cadastro aprovado gera uma senha provisória, exibida **uma única vez** no painel do administrador, para entrega por canal seguro. Para troca de senha, utilize o fluxo de alteração de senha após a primeira implantação.

## Banco

Tabelas: `users`, `sessions`, `access_requests`, `auth_limits`, `knowledge`, `knowledge_revisions`, `custom_rules`, `audit_log`. O schema é criado com `CREATE TABLE IF NOT EXISTS`.

### Segurança e pendências para ambiente institucional
- Projeto experimental. Ainda são necessários pentest, política de backup/restore do banco, revisão jurídica de tipificações e aprovação formal da organização.
- Prefira Vercel Production + PostgreSQL em projetos/bancos isolados. Habilite MFA na conta GitHub, Vercel e no provedor do banco.
- Proteja a branch `main` e use CI com testes de regressão antes da liberação.
- Os relatos enviados ao analisador são processados em memória, sem gravação em banco ou envio para serviços de IA externos.
- Registros de login e alterações administrativas geram audit log básico; configure logs/monitoramento apropriados antes do uso real.
- O arquivo HTML legado foi substituído por aplicação Node. Seus conteúdos de demonstração antigos continuam recuperáveis no histórico do Git.

## Extensão
A extensão de navegador **não integra o repositório**. Teste e instalação serão locais, e os caminhos usuais da extensão estão incluídos no `.gitignore`.

## Testes
```bash
npm test
npm run build
```

Repositório: https://github.com/RicckMatth/base-conhecimento-190

## Catálogo ampliado e interface operacional (outubro de 2026)

A base distribuída reúne **100 fichas orientativas**: 16 regras originais, 10 regras
adicionais anteriores e 74 cenários novos em `lib/catalogue.js`. A consulta inclui
pessoas, proteção, patrimônio, trânsito, meio ambiente, emergências, ordem pública
e atendimento. Todas as regras distribuídas passam a alimentar também o catálogo
no PostgreSQL, com `ON CONFLICT(code) DO NOTHING`: fichas editadas pelo administrador
não são sobrescritas. A alimentação ocorre na inicialização da API após o deploy.

**Limite de cobertura:** não é uma tabela oficial nem uma enumeração exaustiva de
todas as naturezas possíveis. Os códigos `CAT-*` e `SUG-*` são identificadores
internos. Os códigos herdados também dependem de conferência institucional.
Para equivalência integral ao COPOM, importar e revisar a tabela oficial vigente,
incluindo nomenclatura, códigos, competência, prioridade e protocolos locais.
As descrições novas são conteúdo editorial, não transcrições de protocolos.
A prioridade exibida é orientativa; o motor não decide despacho ou tipificação.

Referências públicas de contexto consultadas em 21/10/2026 (não constituem
homologação das fichas ou regras):
- PCPR, canais de registro: https://www.policiacivil.pr.gov.br/BO
- PMPR, registro online: https://www.pmpr.pr.gov.br/Pagina/BO-online
- Ministério da Justiça, DEVIR: https://www.gov.br/pt-br/servicos/registrar-ocorrencia-policial-online

A interface usa SVGs locais em `app/icons.jsx`, navegação por áreas, busca sem
acentos, filtros combinados de categoria e prioridade, estados vazios e temas claro
/ escuro. Os ícones não dependem de fontes, CDNs ou serviços de terceiros.

Validação desta alteração: `npm test` (8 testes), `npm run build` e testes de
cenários de regressão. Os testes unitários não comprovam integração com banco de
produção, autenticação real nem homologação operacional.

## Assistente híbrido: resposta local antes do Gemini

O chat (`POST /api/chat`) e a análise (`POST /api/analyze`) consultam primeiro a
base local. Perguntas frequentes, definições específicas presentes nas fichas e
relatos com todos os grupos obrigatórios reconhecidos podem receber resposta
local. Correspondência parcial de assunto não basta para responder perguntas
sobre medidas ou procedimentos. Sem resposta adequada, o servidor consulta o
Google Gemini com até cinco fichas relacionadas e histórico limitado a oito
mensagens de até 1.800 caracteres cada. A interface identifica a origem.

O histórico é temporário na aba e não é gravado pela aplicação. O fallback envia
ao Google o texto, o histórico recente e trechos de fichas relacionadas; não use
dados pessoais ou sigilosos sem autorização institucional. Falhas de conexão,
permissão, cota, modelo ou prazo são exibidas sem revelar a chave. As consultas
exigem sessão ativa e têm limite por usuário. A pontuação local é heurística e
não garante acerto; respostas locais e da IA exigem validação humana.

Configuração em Vercel → projeto → Settings → Environment Variables:

- `GEMINI_API_KEY`: chave do Google AI Studio, tipo Secret/Sensitive, Production.
- `GEMINI_MODEL`: modelo disponível na conta; padrão `gemini-3.5-flash-lite`.

Faça novo deploy após alterar as variáveis. Nunca use `NEXT_PUBLIC_` na chave.
O administrador pode abrir o Assistente/Integração 190 e clicar em **Testar conexão
com Gemini**. Esse teste realiza uma chamada curta ao provedor. O status
configurado indica presença da chave, não comprova cota nem disponibilidade.
Rotacione a chave no Google AI Studio se ela tiver sido exposta e substitua o
valor na Vercel. Nenhuma chave real faz parte deste repositório.

Documentação: https://ai.google.dev/gemini-api/docs/api-key e
https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai

### Usar GitHub Secrets como origem da chave

A Vercel em execução não consegue ler o valor de GitHub Secrets. O workflow
**Sincronizar Gemini com Vercel** faz a ponte pelo GitHub Actions:

1. Abra Settings → Secrets and variables → Actions no repositório.
2. Cadastre `GEMINI_API_KEY` com a chave do Google AI Studio.
3. Cadastre `VERCEL_TOKEN` com um token da Vercel autorizado a atualizar variáveis
   e criar deployments no projeto `base-conhecimento-190`, na equipe existente.
4. Em Actions → Sincronizar Gemini com Vercel → Run workflow, execute em `main`.
5. Confira a conclusão do deploy na Vercel e use o teste de conexão no sistema.

O workflow copia a chave para uma variável Sensitive de **Production** e solicita
novo deploy do commit executado. Não imprime valores, não faz checkout, não salva
arquivos com segredos e não roda em pull requests. Se faltarem Secrets, registra
uma mensagem e preserva a configuração existente. Alterar um Secret não dispara
workflow: execute manualmente após cada rotação. O nome deve ser exatamente
`GEMINI_API_KEY`. O workflow nunca consulta nem revela o valor de Secrets já salvos.

## Triagem contextual por natureza

`lib/triage.js` amplia os roteiros das 100 naturezas distribuídas com perguntas
atômicas por contexto (pessoas, proteção, patrimônio, trânsito, emergência, meio
ambiente etc.). O catálogo oferece o roteiro completo. Ao analisar um relato,
o motor devolve somente perguntas pendentes em `principal.triageQuestions` e os
metadados `triage.pending`, `triage.answered` e `triage.total`. Não há gravação das
respostas extraídas: a avaliação é transitória e recalculada em cada análise.

O filtro local verifica afirmações explícitas e negativas, como “sem feridos” ou
“o autor fugiu”. Perguntas sem resposta, incerteza e contradição não eliminam a
necessidade de confirmar a informação. Detectores são conservadores: variantes
não reconhecidas podem manter uma pergunta já respondida. Não inferem ausência
de risco por omissão e não substituem a leitura do operador. Perguntas
personalizadas sem detector específico permanecem disponíveis.

A interface exibe apenas as perguntas pendentes e a quantidade ocultada. Os
roteiros completos são acrescentados à leitura das fichas distribuídas sem
sobrescrever textos editados no banco. O Gemini recebe sugestões pendentes no
contexto e instrução para não repetir informação respondida; o texto livre da IA
continua sujeito à revisão humana. A avaliação local não exige chamada à IA.

## Revisão de escrita em caixa alta

`lib/writing.js` faz correção local de termos operacionais, acentuação, alguns
casos inequívocos de concordância e pontuação. A saída usa `toLocaleUpperCase`
com `pt-BR`, mantendo acentos. A revisão não acrescenta solicitações de viatura,
prioridade ou providências, nem remove trechos iniciais do relato. Nomes não são
corrigidos por adivinhação; falas entre aspas não recebem substituição lexical.
O botão de copiar usa o próprio texto revisado em caixa alta.

Quando a revisão local for insuficiente, o usuário pode solicitar **Revisar com
IA**. Só esse clique envia o relato ao Gemini por `POST /api/rewrite`, com sessão
obrigatória e cota compartilhada de consultas. O servidor exige preservação de
fatos, sujeitos, tempos verbais, nomes e identificadores. Valida números,
marcadores de negação/incerteza e alguns acréscimos indevidos de providências;
rejeita a sugestão se essas verificações falharem. Essas verificações não provam
equivalência semântica: confira sempre o texto. A versão local permanece
acessível se a IA falhar. Se o relato mudar durante a revisão, o resultado antigo
não substitui o texto atual. A correção local é limitada às regras implementadas;
para frases ambíguas, preserve o original e revise com o operador.
