# ValueBot AI

Aplicação web para análise fundamentalista e acompanhamento de ações, construída com Next.js e Supabase.

## Tecnologias

- Next.js App Router
- React + TypeScript
- Supabase Auth
- Supabase Database

## Executar localmente

1. Instala Node.js LTS.
2. Copia `.env.example` para `.env.local`.
3. Preenche `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` com os valores do teu projeto Supabase.
4. Instala dependências: `npm install`.
5. Inicia o servidor: `npm run dev`.
6. Abre http://localhost:3000.

## Variáveis de ambiente

- `NEXT_PUBLIC_SUPABASE_URL`: URL do projeto Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: chave publicável (ou chave anon legada) do Supabase.

**Nunca** coloques no frontend nem no GitHub a chave `service_role`, chaves secretas do Supabase, `CRON_SECRET`, `FMP_API_KEY` ou `GEMINI_API_KEY`. As chaves de fornecedores externos devem ficar em secrets do Supabase Edge Functions.

## Estado atual

A página inicial e os formulários de registo/início de sessão estão preparados. O painel de investimentos e a integração segura das tabelas serão ligados depois de confirmarmos as políticas RLS e o esquema existente. Não desativar RLS para fazer a aplicação funcionar.

## Publicação

Pode ser publicado num serviço compatível com Next.js, como Vercel. Antes de publicar, configura as variáveis de ambiente no painel do alojamento e confirma as URLs de redirecionamento de autenticação no Supabase.

## Aviso

O ValueBot é uma ferramenta informativa de análise; não constitui aconselhamento financeiro.