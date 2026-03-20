# 💰 Finanças - Gestão de Finanças Pessoais

Web App mobile-first de gestão de finanças pessoais com PWA completo.

## Stack

- **Next.js 14** (App Router)
- **Tailwind CSS** (estilização)
- **Supabase** (banco de dados + autenticação)
- **Lucide React** (ícones)
- **PWA** (manifest.json + service worker)

## Funcionalidades

- Login exclusivo via **Google Auth**
- Dashboard com **Receitas**, **Despesas Fixas**, **Despesas Variáveis** e **Saldo Total**
- Navegação por meses com **seletor mensal**
- **Repetição mensal automática**: transações recorrentes são replicadas para novos meses
- **Edição individual** de cada transação por período
- Sistema de status editável: **Pendente de pagamento** / **Foi pago**
- CRUD completo (adicionar, editar, excluir transações)
- PWA instalável no iOS e Android com suporte a notch

## Configuração

### 1. Supabase

1. Crie um projeto no [Supabase](https://supabase.com)
2. Execute o script SQL em `supabase-schema.sql` no SQL Editor do Supabase
3. Configure Google Auth:
   - Vá em **Authentication > Providers > Google**
   - Ative o provider e adicione suas credenciais OAuth do Google Cloud Console
   - Configure o redirect URL: `https://SEU_DOMINIO/auth/callback`

### 2. Variáveis de Ambiente

Edite o arquivo `.env.local` na raiz do projeto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key_aqui
```

### 3. Instalar e Rodar

```bash
npm install
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## Estrutura do Projeto

```
src/
├── app/
│   ├── auth/callback/route.ts    # Callback do Google OAuth
│   ├── dashboard/page.tsx        # Dashboard principal
│   ├── login/page.tsx            # Página de login
│   ├── layout.tsx                # Layout com PWA meta tags
│   ├── globals.css               # Estilos globais + safe areas
│   └── page.tsx                  # Redirect inicial
├── components/
│   ├── BalanceCards.tsx           # Cards de saldo
│   ├── MonthSelector.tsx         # Seletor de mês
│   ├── StatusBadge.tsx           # Badge de status (Pendente/Pago)
│   ├── TransactionForm.tsx       # Formulário de transação
│   └── TransactionList.tsx       # Lista de transações agrupada
├── lib/
│   ├── hooks/useTransactions.ts  # Hook de CRUD + recorrência
│   └── supabase/
│       ├── client.ts             # Cliente browser
│       ├── server.ts             # Cliente server
│       └── middleware.ts         # Middleware helper
├── middleware.ts                 # Proteção de rotas
└── types/index.ts                # Tipos TypeScript
```

## Banco de Dados

A tabela `transactions` possui:

| Campo              | Tipo         | Descrição                              |
|--------------------|--------------|----------------------------------------|
| id                 | UUID         | Chave primária                         |
| user_id            | UUID         | FK para auth.users                     |
| description        | TEXT         | Descrição da transação                 |
| amount             | DECIMAL      | Valor                                  |
| type               | TEXT         | receita / despesa_fixa / despesa_variavel |
| status             | TEXT         | pendente / pago                        |
| is_recurring       | BOOLEAN      | Se é recorrente                        |
| recurring_group_id | UUID         | Agrupa instâncias recorrentes          |
| month              | INTEGER      | Mês (1-12)                             |
| year               | INTEGER      | Ano                                    |
| created_at         | TIMESTAMPTZ  | Data de criação                        |
| updated_at         | TIMESTAMPTZ  | Data de atualização                    |

RLS (Row Level Security) está habilitado para que cada usuário acesse apenas seus dados.
