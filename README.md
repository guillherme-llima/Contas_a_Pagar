# FatureMais

Sistema inicial de contas a pagar com:

- landing page profissional
- cadastro de novos usuarios
- login integrado ao banco MySQL em `contas_a_pagar`.`seguranca.tbUsuarios`
- home protegida por sessao
- suporte a MySQL remoto com SSL
- banco MySQL unificado em `contas_a_pagar`

## Como executar

1. Abra o terminal na pasta do projeto.
2. Execute o arquivo `database.sql` no MySQL Workbench para recriar o modelo exatamente como no DER.
3. Ajuste o arquivo `.env` com o host, porta e credenciais do servidor MySQL. O sistema usa sempre o banco `contas_a_pagar`.
4. Instale a dependencia:

```bash
npm install
```

5. Execute:

```bash
npm start
```

6. Acesse `http://localhost:3000`.

## Deploy na Vercel

O projeto agora usa a estrutura esperada pela Vercel:

- `npm run build`: copia os arquivos HTML/CSS/JS para `public/`
- `public/`: saida estatica usada pela Vercel
- `api/index.mjs`: funcao serverless para as rotas `/api/*`
- `vercel.json`: aponta o deploy estatico para `public/` e reescreve `/api/*` para a funcao Node

No painel da Vercel, configure as variaveis de ambiente em **Settings > Environment Variables**:

```bash
DB_HOST=seu_host_mysql
DB_PORT=3306
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
DB_NAME=contas_a_pagar
DB_SSL=true
AUTH_SECRET=um_texto_grande_e_aleatorio
```

Como alternativa, voce pode informar uma URL MySQL completa:

```bash
DATABASE_URL=mysql://usuario:senha@host:3306/contas_a_pagar?ssl=true
AUTH_SECRET=um_texto_grande_e_aleatorio
```

Depois de salvar as variaveis, faca um novo deploy. A raiz `/` deve carregar `index.html`, e as chamadas de login/cadastro continuam em `/api/auth/*`.

## Estrutura

- `index.html`: pagina inicial
- `login.html`: tela de login
- `cadastro.html`: tela de cadastro
- `home.html`: area autenticada
- `server.js`: servidor HTTP + API de autenticacao
- `database.sql`: script para executar no MySQL Workbench
- `primeiro-acesso.sql`: modelo para inserir o primeiro usuario em `contas_a_pagar`.`seguranca.tbUsuarios`
- `.env.example`: configuracao de conexao com MySQL

## API

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

## Observacao

O servidor cria automaticamente o banco `contas_a_pagar` e aplica nele todas as tabelas do modelo atual seguindo o DER. O CRUD de usuarios grava diretamente em `contas_a_pagar`.`seguranca.tbUsuarios`, sem sincronizacao com tabelas legadas. Para recriar o banco do zero seguindo o DER, execute primeiro `database.sql`. Para provedores como Aiven, utilize `DB_SSL=true`.
