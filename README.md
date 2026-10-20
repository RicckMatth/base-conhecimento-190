# Base de Conhecimento 190 — Node.js + PostgreSQL 

https://base-conhecimento-190.vercel.app/

Portal de consulta de naturezas e análise de relatos com **Next.js (Node.js)**, autenticação real, banco PostgreSQL e trilha de auditoria.

> **Aviso operacional:** as classificações, prioridades, códigos e referências legais são sugestões técnicas NÃO homologadas. Valide-as com a instituição antes do uso. Não processe dados pessoais, sensíveis, sigilosos ou de ocorrências reais sem avaliação jurídica, segurança e autorização institucional.

## Integração Relato 190 v5.12.0 — chat e autorização remota (TESTE)

A Base 190 possui a seção **Integração 190**, agora em formato de chat, conectada automaticamente à extensão [Relato 190 integrada](https://github.com/RicckMatth/190-extensao_integrada). Essa funcionalidade é **experimental e não homologada para uso operacional**.

1. Instale a extensão de teste e faça login normalmente neste site.
2. Abra **Integração 190** e clique em **Autorizar conexão remota**. Esta ação autoriza o envio automático do **texto principal do relato**, não os demais campos do SADE.
3. Enquanto a aba autorizada estiver aberta e o login válido, alterações de relato no SADE/simulador são analisadas após aproximadamente 3,5 segundos sem edição, respeitando o tamanho mínimo e limites de requisição.
4. Cada resultado recebido abre automaticamente o chat e é exibido em uma nova resposta, com natureza sugerida, perguntas e reformulação opcional.
5. Clique em **Revogar autorização**, faça logout ou feche a aba para bloquear o envio. A extensão verifica autorização e sessão a cada análise; a autorização fica no `sessionStorage` da aba e vinculada ao usuário autenticado.

**Segurança:** HTTPS/TLS protege a comunicação em trânsito, não oferece criptografia ponta a ponta. A extensão não armazena cookies, senhas ou tokens e a API continua protegida por sessão `HttpOnly`. O conteúdo enviado chega ao servidor para processamento. Não use informações reais ou sigilosas sem autorização institucional. A extensão não envia ou encerra ocorrências automaticamente no SADE. Para teste, use o simulador e relatos fictícios.

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
