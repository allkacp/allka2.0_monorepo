# Produtos

Tudo sobre o domínio de produtos: estrutura, variações, etapas, testes, briefing e onde editar cada parte.

---

## Conceito geral

A plataforma vende **produtos digitais** (ex: Gestão de Tráfego, Criação de Logo). Cada produto:

- Tem **variações** (opções comerciais — ex: "Até 2 campanhas" / "Até 4 campanhas")
- Tem **estrutura compartilhada**: tarefas, etapas, testes de qualificação, briefing — tudo no produto pai
- Cada **variação** carrega apenas os **diferenciais** (preço, prazo, features específicas)

Padrão estabelecido no produto-modelo `PA0001 — Gestão de Tráfego`.

---

## Hierarquia de dados

```
Product  (PA0001 — Gestão de Tráfego)
├── metadata.baseFeatures           ← itens incluídos em TODAS as variações
├── metadata.presentation           ← apresentação genérica (tagline, highlights, etc.)
├── metadata.tasks                  ← tarefas T01, T02, T03... (modelo de execução)
├── metadata.stages                 ← etapas E01..E07 (kanban de execução)
├── metadata.tests                  ← testes do circuito de pré-habilitação
├── metadata.qualificationChecklist ← critérios para nômade ser habilitado
├── metadata.briefing               ← questionário estruturado para o cliente
│
├── ProductVariation [1] (Até 2 campanhas)
│   ├── price: R$100
│   ├── deadlineDays: 30
│   └── features: [diferenciais específicos da opção 1]
│
└── ProductVariation [2] (Até 4 campanhas)
    ├── price: R$180
    ├── deadlineDays: 30
    └── features: [diferenciais específicos da opção 2]
```

> Regra de ouro: **se o item está em todas as variações, ele vai no produto pai (`baseFeatures`/`presentation`/`tasks`/etc.).** Variação só guarda o que é diferente.

---

## Modelos no banco

`apps/backend/prisma/schema.prisma`:

```prisma
model Product {
  id                  String   @id
  code                String   @unique  // ex: PA0001
  name                String
  category            String
  description         String?
  base_price          Float
  recurrence          String?            // Mensal, Único, Anual
  delivery_days       Int?
  item_limit          Int?               // contratos simultâneos por cliente
  is_active           Boolean  @default(true)
  metadata            String?            // JSON: presentation, baseFeatures, tasks, stages, tests, briefing
  variations          ProductVariation[]
  addons              ProductAddon[]
  // ...
}

model ProductVariation {
  id              String  @id
  product_id      String
  name            String
  price           Float
  deadline_days   Int?
  features        String?  // JSON: array de diferenciais
  // ...
}

model ProductAddon {
  id          String  @id
  product_id  String
  name        String
  price       Float
  // ...
}
```

O campo `metadata` é **JSON serializado** (string no banco, parseado no backend e no adapter do front).

---

## Onde editar — mapa rápido

| O que editar                                               | Arquivo                                                      |
| ---------------------------------------------------------- | ------------------------------------------------------------ |
| **Schema** do produto (campos novos no banco)              | `apps/backend/prisma/schema.prisma`                               |
| **API** — rotas REST de produtos                           | `apps/backend/src/routes/products.ts`                             |
| **Conteúdo** do produto PA0001 (presentation, tasks, etc.) | `apps/backend/seed-product-PA0001.js`                             |
| **Adapter** backend → frontend (mapeia metadata)           | `apps/frontend/lib/product-adapter.ts`                                     |
| **Tipos/Contexto** de produto no front                     | `apps/frontend/lib/contexts/product-context.tsx`                           |
| **Tela do catálogo** (listagem para clientes)              | `apps/frontend/components/product-catalog-view.tsx`                        |
| **Drawer de detalhe** (ver/comprar produto)                | `apps/frontend/components/product-detail-sheet.tsx`                        |
| **CRUD admin** de produtos                                 | `apps/frontend/app/admin/produtos/page.tsx`                                |
| **Precificação** (motor de cálculo)                        | `apps/frontend/lib/pricing-engine.ts` + `apps/frontend/lib/contexts/pricing-context.tsx` |
| **Tela de precificação admin**                             | `apps/frontend/app/admin/precificacao/page.tsx`                            |

---

## Conteúdo do `metadata` (JSON)

### `presentation`

Apresentação **genérica** do produto (mostrada no header do drawer e no catálogo). Não pode ter texto específico de variação.

```js
presentation: {
  tagline: "Gestão profissional das suas campanhas de tráfego pago...",
  highlights: [               // bullets no header — sempre genéricos
    "Gestão profissional de campanhas em Meta Ads, Google Ads...",
    "Volume de campanhas e plataformas conforme a opção escolhida",
  ],
  targetAudience: [...],
  whatIsIncluded: [...],
  deliverables: [...],
  notIncluded: [...],
  requirements: [...],
  howToRequest: [...],
  faq: [...],
}
```

### `baseFeatures`

Lista plana de itens **incluídos em todas as variações**. Aparece como Section "Incluído em todas as opções" no drawer de detalhe.

```js
baseFeatures: [
  "Onboarding e diagnóstico inicial de campanhas (T01 — 2h)",
  "Configuração, segmentação e ativação das campanhas (T02 — 3h)",
  "7 etapas de execução estruturadas: E01 → E02 → ... → E07",
  // ...
];
```

### `tasks` — tarefas executadas pelo nômade

Cada tarefa tem código (`T01`, `T02`...), nome, descrição, duração estimada e relação com a especialidade.

### `stages` — etapas do kanban

`E01 (Setup) → E02 (Estabilização) → E03 (Feedback 2) → ... → E07 (Encerramento)`. Define o fluxo do projeto.

### `tests` — circuito de pré-habilitação

Testes que o nômade precisa passar antes de poder ser alocado em uma tarefa do produto.

### `qualificationChecklist`

Lista de critérios objetivos para o admin habilitar manualmente um nômade.

### `briefing`

Questionário estruturado que o cliente preenche ao contratar o produto (objetivo, orçamento, público, peças existentes, etc.).

### `welcomeHighlights` (dentro de cada variação)

Mini-cards mostrados nos primeiros minutos do projeto (mensagem de boas-vindas).

---

## Como criar um produto novo (passo a passo)

### Opção A — via UI admin (recomendado para produtos simples)

1. Logar como admin → `/admin/produtos`
2. Clicar **"Novo produto"**
3. Preencher dados básicos, variações, addons
4. Salvar

### Opção B — via seed (recomendado para produtos complexos com tarefas, etapas, testes)

1. **Copiar** `apps/backend/seed-product-PA0001.js` → renomear para `seed-product-<CODIGO>.js`
2. Ajustar:
   - `code`, `name`, `category`, `base_price`, `recurrence`, `delivery_days`
   - `metadata.presentation` (tagline, highlights, etc.)
   - `metadata.baseFeatures`
   - `metadata.tasks`, `metadata.stages`, `metadata.tests`, `metadata.briefing`
   - Variações (pelo menos 1)
3. Rodar localmente:
   ```powershell
   cd apps/backend
   $env:DATABASE_URL="file:./prisma/dev.db"
   node seed-product-<CODIGO>.js
   ```
4. Validar no `/admin/produtos` e no catálogo público.
5. Para subir em produção: subir o arquivo `.js` no servidor e rodar via SSH.

---

## Regras importantes (não quebrar)

1. **`presentation.highlights` é genérico** — proibido frase como "Até 2 campanhas". Quem mostra info da variação é a Section "Sua seleção" no drawer.

2. **Tarefas, etapas, testes, briefing → produto pai**. Variação só carrega features e preço.

3. **Códigos de produto** (`PA0001`, etc.) são imutáveis após criação. Eles aparecem em integrações, faturas, relatórios.

4. **Status `is_active`** controla visibilidade no catálogo. Para "remover" um produto **sem perder histórico**, desative em vez de deletar.

5. **Re-seed apaga relações** (variations, addons) e recria. Histórico de pedidos/projetos baseados no produto **não é afetado** porque referenciam o `product_id` que continua o mesmo.

6. **Qualquer mudança em `metadata`** é só re-seed — não precisa migration de banco.

7. **Mudança em `presentation` ou `baseFeatures`** afeta o que aparece no drawer. Sempre testar com Ctrl+F5 (cache).

---

## Catálogo de produtos (UI)

`apps/frontend/components/product-catalog-view.tsx`:

- Lista produtos ativos (`p.isActive === true`)
- Filtros por categoria, busca textual, ordenação
- Cada card abre o **drawer de detalhe** (`product-detail-sheet.tsx`)

`apps/frontend/components/product-detail-sheet.tsx`:

- Header genérico (info do produto pai + Destaques)
- Coluna esquerda: "Sua seleção" (reflete variação escolhida) + Para quem é + O que está incluído + Incluído em todas as opções + Entregas + ...
- Coluna direita: preço dinâmico, lista de variações, CTA "Adicionar ao projeto"
- Largura redimensionável (handle entre as colunas)
- Visual segue tema da sidebar (`var(--app-brand-header)`)

---

## Pricing (precificação)

- Engine: `apps/frontend/lib/pricing-engine.ts`
- Contexto: `apps/frontend/lib/contexts/pricing-context.tsx`
- Tela admin: `apps/frontend/app/admin/precificacao/page.tsx`
- Aplica margens, impostos (`constants/tax-rates.ts`), comissões e descontos sobre o `base_price` do produto e o preço da variação.

---

## Fluxo no projeto contratado

Quando o cliente contrata um produto:

1. Cria-se um `Project` referenciando `product_id` + `variation_id`.
2. As `tasks` do produto são instanciadas como `TaskExecution` no projeto.
3. As `stages` definem o kanban do projeto.
4. O `briefing` é preenchido pelo cliente.
5. Nômades habilitados (que passaram nos `tests`) podem ser alocados nas `TaskExecution`.
6. Ao concluir, gera-se `Invoice` para o cliente e `WalletTransaction` para os nômades/parceiros.

