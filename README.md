# Lista de Compras

Lista de compras compartilhada, no estilo do app Lembretes do iPhone. Sem
login: qualquer pessoa com o link vê e edita a mesma lista, em tempo real.

- Digitar e apertar Enter cria o item e mantém o foco no campo, pronto para o
  próximo.
- Marcar como concluído manda o item para a seção "Concluídos", no fim da
  lista.
- Botão "Limpar concluídos" apaga tudo que já foi concluído de uma vez.
- Arrastar um item para a esquerda revela a exclusão (igual ao Lembretes).
- Sincroniza ao vivo entre dispositivos (Supabase Realtime) — cada pessoa vê
  a alteração da outra na hora.

## Como funciona

| Peça | Papel |
| --- | --- |
| React + Vite + Tailwind v4 | Interface mobile-first |
| Supabase Postgres | Tabela `shopping_items` |
| Supabase Realtime | Sincronização ao vivo entre dispositivos |
| GitHub Pages | Publicação do app |

## Rodando local

```bash
npm install
cp .env.example .env.local   # preencha com os dados do seu projeto Supabase
npm run dev                  # http://localhost:5848
```

## Backend

```bash
supabase link --project-ref SEU_REF
supabase db push
```

## Publicação

O workflow em `.github/workflows/deploy.yml` publica a cada push na `main`.
Ele espera dois secrets no repositório: `VITE_SUPABASE_URL` e
`VITE_SUPABASE_ANON_KEY`.

## Sobre acesso

O app não tem login, por escolha de projeto. A policy do Postgres libera
leitura e escrita para a chave anônima, então qualquer pessoa com o link
consegue ver e alterar a lista. A tabela `shopping_items` é isolada das
demais tabelas deste projeto Supabase.
