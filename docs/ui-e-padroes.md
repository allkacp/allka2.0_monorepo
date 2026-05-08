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

Drawer é o componente preferencial para ações de criar/editar/visualizar. Referência canônica: `apps/frontend/components/company-create-slide-panel.tsx`.

### Estrutura

```tsx
const { sidebarWidth } = useSidebar();
const [isClosing, setIsClosing] = useState(false);

const handleClose = () => {
  setIsClosing(true);
  setTimeout(() => {
    setIsClosing(false);
    onOpenChange(false);
  }, 420); // duração da animação
};

return (
  <>
    {/* Backdrop — offset pela sidebar */}
    <div
      className="fixed top-0 bottom-0 right-0 z-40 bg-black/20 backdrop-blur-[2px]"
      style={{ left: `${sidebarWidth}px` }}
      onClick={handleClose}
    />

    {/* Drawer — h-[calc(100vh-24px)] mantém o footer visível */}
    <div
      className="fixed top-0 right-0 h-[calc(100vh-24px)] z-50 bg-background flex flex-col shadow-2xl"
      style={{
        left: `${sidebarWidth}px`,
        width: `calc(100vw - ${sidebarWidth}px)`,
      }}
    >
      {/* Header com gradient brand */}
      <div style={{ background: "var(--app-brand-header)" }}>...</div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-hidden">...</div>

      {/* Footer CTA sticky */}
      <div className="border-t">...</div>
    </div>
  </>
);
```

### Regras

1. **Sempre offset pela sidebar** (`left: sidebarWidth`).
2. **Altura `calc(100vh - 24px)`** deixa o footer da plataforma visível.
3. **Z-index**: backdrop `z-40`, drawer `z-50`.
4. **Animação de fechar**: `setTimeout(420ms)` para casar com a transição CSS.
5. **Botão `X`** absoluto no canto superior direito, sobre o gradient (fundo `bg-white/10` + `backdrop-blur-sm`).

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

Padrão único: `apps/frontend/components/data-table.tsx` combinado com:

- `apps/frontend/components/sortable-header.tsx` — ordenação
- `apps/frontend/components/pagination-controls.tsx` — paginação
- `apps/frontend/components/items-per-page-select.tsx` — tamanho de página
- `apps/frontend/components/advanced-date-filter.tsx` — filtro por data
- `apps/frontend/components/export-button.tsx` — export CSV/PDF

Formulários dentro da tabela abrem sempre via **drawer lateral** (padrão, não modal).

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
