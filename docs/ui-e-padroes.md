# UI e Padrões Visuais

Guia de consistência visual e de interação da plataforma.

---

## Stack visual

- **Tailwind CSS 4** — utilitários de estilo
- **shadcn/ui + Radix UI** — primitivos acessíveis (`apps/frontend/components/ui/`)
- **Lucide React** — ícones
- **next-themes** — suporte a dark mode

---

## Variáveis de tema (CSS vars)

Definidas dinamicamente pelo `SidebarContext` (`apps/frontend/contexts/sidebar-context.tsx`) com base no perfil / agência:

| Variável               | Uso                                                  | Exemplo                                                       |
| ---------------------- | ---------------------------------------------------- | ------------------------------------------------------------- |
| `--app-brand-gradient` | Backgrounds corporativos (sidebar, cards principais) | `linear-gradient(135deg, #000 0%, #1a2a6f 45%, #c81a7f 100%)` |
| `--app-brand-header`   | Header de drawers e páginas                          | mesmo gradiente                                               |
| `--app-brand-button`   | Botões primários                                     | cor sólida                                                    |
| `--app-brand-active`   | Item ativo na navegação                              | cor destaque                                                  |

**Regra**: sempre que precisar do gradiente/tema da plataforma, **usar a variável CSS**, não hardcodear cor.

```tsx
<div style={{ background: "var(--app-brand-header)" }}>...</div>
```

Cores por portal (accents):

- Admin → rose
- Nômade → amber
- Empresa → violet
- Agência → indigo
- Parceiro → blue

---

## Layout da plataforma

Estrutura compartilhada por todas as telas autenticadas:

```
┌──────────────────────────────────────────────────┐
│ Sidebar (fixa à esquerda, largura dinâmica)      │
│ ┌──────────────────────────────────────────────┐ │
│ │ Header (fixo no topo)                        │ │
│ ├──────────────────────────────────────────────┤ │
│ │                                              │ │
│ │  Conteúdo da página (PageHeader + body)      │ │
│ │                                              │ │
│ ├──────────────────────────────────────────────┤ │
│ │ Footer (fixo no rodapé)                      │ │
│ └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

A `sidebarWidth` é lida via `useSidebar()`. Drawers e overlays devem **respeitá-la** para não cobrir o menu.

---

## Padrão de drawers laterais (slide panels)

Drawer é o componente preferencial para ações de criar/editar/visualizar/filtrar. Desde 2026-07 o padrão é o componente compartilhado `SlidePanel` (`apps/frontend/components/slide-panel.tsx`) — não recriar a estrutura na mão.

### Uso

```tsx
import { SlidePanel } from "@/components/slide-panel";

<SlidePanel
  open={open}
  onClose={() => setOpen(false)}
  title="Filtros"
  subtitle="Configure e aplique filtros"
  widthMode="full" // ou "compact" para formulários/confirmações menores
  footer={<div className="flex gap-2">...</div>}
>
  {/* conteúdo do painel */}
</SlidePanel>
```

### O que o componente já resolve

1. **Offset pela sidebar/header/footer** via `useAppFrameMetrics()` — nunca cobre nenhum dos três, mesmo quando a sidebar muda de largura.
2. **Sem backdrop** — o resto da tela continua visível e interativa atrás do painel.
3. **Sem `setTimeout` manual** — o próprio componente controla a animação de saída (~300ms) antes de desmontar.
4. **Fecha em X, Escape** e (se a página quiser) um botão "Cancelar" próprio no `footer`.
5. **`z-70`** — abaixo da sidebar (`z-100`) e do header/footer (`z-90`), acima do conteúdo da página.
6. Renderiza via `createPortal(..., document.body)`, então `position: fixed` nunca quebra por causa de um `transform`/`filter` em um elemento ancestral.

### Componentes de referência que já usam este padrão

`company-create-slide-panel.tsx`, `company-edit-slide-panel.tsx`, `company-view-slide-panel.tsx`, `confirmation-dialog.tsx` (variante `widthMode="compact"`), os painéis de Filtros/Configurar Colunas em `admin/empresas` e `admin/clientes`.

Se uma tela ainda usa `<Sheet>`/`<SheetContent>` (shadcn) com backdrop visível, basta adicionar a prop `hideOverlay` — o clique-fora e o Escape continuam funcionando (o Radix trata isso na `Content`, não na `Overlay`), só o fundo escurecido desaparece.

---

## Padrão de modais

Para ações rápidas/confirmações use `apps/frontend/components/ui/dialog.tsx` ou `apps/frontend/components/confirmation-dialog.tsx`. Modais **centralizados** (não laterais) devem ser usados apenas para:

- Confirmações destrutivas
- Pick de produto (`product-selection-modal`)
- Wizards curtos

Para fluxos longos (criar empresa, projeto, produto, usuário) → **sempre drawer lateral**.

---

## Tipografia

| Elemento              | Classes Tailwind típicas                                               |
| --------------------- | ---------------------------------------------------------------------- |
| Título de página (h1) | `text-2xl font-extrabold` ou `text-xl font-bold`                       |
| Título de seção       | `text-lg font-semibold`                                                |
| Subtítulo / tagline   | `text-sm text-muted-foreground`                                        |
| Corpo                 | `text-sm`                                                              |
| Labels de formulário  | `text-xs font-semibold uppercase tracking-wider text-muted-foreground` |
| Ajudinhas             | `text-xs text-muted-foreground`                                        |

---

## Espaçamento

- **Padding padrão de seção**: `p-4` a `p-6`
- **Gap entre cards**: `gap-3` a `gap-4`
- **Gap entre elementos de formulário**: `space-y-4`
- **Header de página**: usar `PageHeader` (`apps/frontend/components/page-header.tsx`) para manter uniformidade.

---

## Ícones

- Biblioteca única: **Lucide React** (`lucide-react`)
- Tamanhos padrão: `h-3 w-3` (chips), `h-4 w-4` (botões), `h-5 w-5` (cards)
- Cores semânticas:
  - Sucesso → `text-emerald-500`
  - Aviso → `text-amber-500`
  - Erro → `text-rose-500`
  - Neutro → `text-muted-foreground`
  - Brand/destaque → `text-purple-600` / `text-violet-600`

**Nunca** misturar com outra biblioteca de ícones.

---

## Tabelas

Padrão de referência: `apps/frontend/app/admin/empresas/page.tsx` — cards de estatística com gradiente, toolbar de duas linhas (busca + filtros/config, depois itens-por-página + contagem + espelho de rolagem + paginação numerada, repetida no rodapé), avatar circular, badges "neon", coluna de ações fixa. Especificação completa e exaustiva (tamanhos, cores, classes exatas, armadilhas já corrigidas) em **[padrao-tabela-empresas.md](./padrao-tabela-empresas.md)** — sempre que for levar outra tela "para o mesmo padrão", comece por lá.

Peças reutilizáveis usadas por esse padrão:

- `apps/frontend/components/sortable-header.tsx` — ordenação + filtro por coluna
- `apps/frontend/components/items-per-page-select.tsx` — tamanho de página
- `apps/frontend/components/icon-toolbar-button.tsx` — botão só-ícone com gradiente no hover
- `apps/frontend/components/neon-badge.tsx` — badge com borda + glow
- `apps/frontend/hooks/useTableScrollSync.ts` — sincronização das barras de rolagem horizontal espelhadas
- `apps/frontend/components/export-button.tsx` — export CSV/PDF

Formulários dentro da tabela abrem sempre via **drawer lateral** (padrão, não modal) — ver `SlidePanel` abaixo.

---

## Formulários

- Usar `apps/frontend/components/ui/input.tsx`, `apps/frontend/components/ui/select.tsx`, `apps/frontend/components/ui/textarea.tsx`, `apps/frontend/components/ui/checkbox.tsx`, `apps/frontend/components/ui/switch.tsx`, `apps/frontend/components/ui/radio-group.tsx`.
- Labels com `apps/frontend/components/ui/label.tsx`.
- Validação: geralmente via estado local + zod no backend. Formulários simples não precisam de libs adicionais.
- Feedback: `apps/frontend/hooks/use-toast.ts` para confirmações/errors.

---

## Mobile

Toda tela deve funcionar em mobile. Ferramentas:

- `apps/frontend/components/mobile-layout-wrapper.tsx` — wrapper que ativa o layout responsivo
- `apps/frontend/components/mobile-bottom-nav.tsx` — nav inferior
- `apps/frontend/components/mobile-horizontal-nav.tsx` — abas roláveis
- `apps/frontend/components/mobile-menu-sheet.tsx` — menu hamburger

Breakpoints Tailwind padrão: `sm: 640`, `md: 768`, `lg: 1024`, `xl: 1280`.

---

## Acessibilidade

- Usar **sempre** primitivos do Radix (`apps/frontend/components/ui/`) — eles já vêm com ARIA correto.
- Botões de ação precisam de `aria-label` quando o texto visível é só um ícone.
- Foco visível: Tailwind gera ring em todos os inputs/buttons por padrão (`focus-visible:ring-2`).

---

## Componentes compartilhados frequentes

| Componente              | Quando usar                                       |
| ----------------------- | ------------------------------------------------- |
| `page-header`           | Cabeçalho de toda página interna (título + ações) |
| `data-table`            | Qualquer listagem paginada                        |
| `confirmation-dialog`   | Confirmar ação destrutiva (deletar, desativar)    |
| `advanced-date-filter`  | Filtros temporais                                 |
| `export-button`         | Exportar listagem (CSV, PDF)                      |
| `footer`                | Rodapé                                            |
| `term-acceptance-gate`  | Bloquear acesso até aceitar termos                |
| `alerts-header-icon`    | Ícone de notificações no header                   |
| `quick-contact-actions` | Ações rápidas (WhatsApp, e-mail)                  |

Antes de criar um componente novo, checar `apps/frontend/components/` — em 90% dos casos algo equivalente já existe.

---

## Como criar tela nova mantendo consistência

1. **Base**: `PageHeader` no topo + container `<div className="p-4 md:p-6 space-y-4">`.
2. **Listagens**: `data-table` + paginação + filtros padrão.
3. **Ações CRUD**: drawer lateral (copiar esqueleto de `company-create-slide-panel.tsx`).
4. **Confirmações**: `confirmation-dialog`.
5. **Feedback**: `useToast()` de `apps/frontend/hooks/use-toast.ts`.
6. **Ícones**: só Lucide.
7. **Cores**: usar CSS vars (`--app-brand-*`) quando for brand/header; usar classes Tailwind semânticas (`text-emerald-500`, `text-muted-foreground`) para estados.
8. **Mobile**: testar em `<640px` antes de abrir PR.
