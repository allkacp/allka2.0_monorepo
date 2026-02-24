# Guia Completo - Filtro de Data Avançado

## 📋 Visão Geral

O novo componente **Advanced Date Filter** foi desenvolvido para a página `/admin/projetos` com o objetivo de fornecer uma experiência moderna e intuitiva para filtrar projetos por data range e exportar dados em múltiplos formatos.

## 🎨 Recursos Principais

### 1. **Seletor de Data Range**
- **Design Moderno**: Interface limpa e intuitiva com gradientes e efeitos visuais
- **Período Rápido**: Botões pré-definidos (Hoje, 7 dias, 30 dias, 90 dias, 1 ano)
- **Seleção Manual**: Calendários para data inicial e final
- **Validação Inteligente**: Impede seleção de datas inválidas
- **Display em Tempo Real**: Mostra quantidade de dias selecionados

### 2. **Indicadores Dinâmicos**
Todos os indicadores da página são recalculados automaticamente quando você altera o intervalo de datas:

\`\`\`
- Total de Projetos
- Projetos em Andamento
- Projetos Concluídos
- MRR (Receita Mensal Recorrente)
- Valor Total de Receita
- Saldo Orçamentário
- Churn Rate
- Crescimento por Tipo (Empresa, Agência, Squad)
\`\`\`

### 3. **Exportação de Dados**
O sistema oferece três formatos de exportação:

#### **CSV**
- Formato texto simples
- Compatível com Excel, Google Sheets, etc.
- Inclui resumo dos dados (período, totais, etc.)

#### **Excel (XLS)**
- Formato nativo do Microsoft Excel
- Formatação com cores e estilos
- Tabelas estruturadas
- Adequado para análises detalhadas

#### **PDF**
- Relatório visual e profissional
- Incluindo gráficos de resumo
- Pronto para impressão
- Assinatura de data e hora

## 🚀 Como Usar

### Passo 1: Abrir o Filtro de Data
Clique no botão **"Período"** no topo da página. Um popover será aberto com duas seções:

1. **Períodos Rápidos** (à esquerda)
2. **Calendários Detalhados** (à direita)

### Passo 2: Selecionar um Período

#### Opção A: Usar Período Pré-definido
Clique em um dos botões:
- **Hoje**: Filtra apenas o dia atual
- **Últimos 7 dias**: Últimas 7 dias (padrão)
- **Últimos 30 dias**: Mês corrente
- **Últimos 90 dias**: Trimestre
- **Último ano**: 12 últimos meses

#### Opção B: Seleção Manual
1. Clique na data inicial no calendário esquerdo
2. Clique na data final no calendário direito
3. Clique em **"Aplicar Filtro"**

### Passo 3: Observar as Mudanças
Todos os indicadores serão atualizados automaticamente com base no período selecionado.

### Passo 4: Exportar os Dados
1. Clique no botão **"Exportar"** (verde)
2. Escolha o formato desejado:
   - 📄 **CSV** - Para planilhas simples
   - 📊 **Excel** - Para análises detalhadas
   - 📋 **PDF** - Para relatórios impressos

## 📊 Indicadores que Mudam com o Filtro

Quando você altera o intervalo de datas, os seguintes indicadores são recalculados:

### Métricas Principais
| Métrica | Descrição |
|---------|-----------|
| **Total de Projetos** | Número total de projetos no período |
| **Projetos em Andamento** | Projetos com status "in-progress" |
| **Projetos Concluídos** | Projetos com status "completed" |
| **MRR** | Receita recorrente estimada |
| **Valor Total** | Soma de todos os orçamentos |
| **Gasto Total** | Soma de gastos realizados |

### Métricas por Tipo
| Métrica | Descrição |
|---------|-----------|
| **Projetos Empresa** | Web, Mobile e Sistemas |
| **Projetos Agência** | Marketing e Design |
| **Projetos Squad** | Desenvolvimento em equipe |

### Métricas de Pagamento
| Métrica | Descrição |
|---------|-----------|
| **Aguardando Pagamento** | Projetos não pagos |
| **Vencidos** | Faturas vencidas |
| **Churn Rate** | Taxa de cancelamento |

## 🎯 Exemplo de Uso

### Cenário 1: Analisar Últimos 30 Dias
\`\`\`
1. Clique em "Últimos 30 dias"
2. Os indicadores mostram apenas projetos dos últimos 30 dias
3. Você vê: 24 projetos, R$ 145.000 em receita, 8% de churn
4. Clique em "Exportar" → "Excel" para análise detalhada
\`\`\`

### Cenário 2: Período Customizado
\`\`\`
1. Clique em "Período"
2. Selecione manualmente: 01/01/2024 até 31/01/2024
3. Clique em "Aplicar Filtro"
4. Veja os indicadores atualizarem em tempo real
5. Exporte como PDF para documentação
\`\`\`

## 🔧 Configuração Técnica

### Componente Principal
**Arquivo**: `/components/advanced-date-filter.tsx`

**Props**:
\`\`\`typescript
interface AdvancedDateFilterProps {
  dateRange?: DateRange
  onDateChange?: (date: DateRange | undefined) => void
  onExport?: (format: "csv" | "excel" | "pdf") => void
  onReset?: () => void
  isLoading?: boolean
}
\`\`\`

### Utilitários de Exportação
**Arquivo**: `/lib/export-utils.ts`

**Funções**:
- `exportToCSV()` - Exporta em formato CSV
- `exportToExcel()` - Exporta em formato XLS
- `exportToPDF()` - Abre janela de impressão com PDF

## 📱 Responsividade

O componente é totalmente responsivo:
- **Desktop**: Todos os elementos lado a lado
- **Tablet**: Layout adaptado com flex wrapping
- **Mobile**: Stack vertical com botões em linha

## 🎨 Cores e Estilos

| Elemento | Cor | Descrição |
|----------|-----|-----------|
| **Botão Selecionado** | Azul (#2563eb) | Indica período ativo |
| **Botão Exportar** | Verde (#059669) | Destacado para exportação |
| **Botão Reset** | Vermelho (#dc2626) | Limpar filtro |
| **Badges** | Múltiplas | Mostram informações rápidas |

## ⚙️ Performance

- **Cálculo Eficiente**: Usa `useMemo()` para evitar recálculos desnecessários
- **Renderização Otimizada**: Componentes memoizados
- **Sem Bloqueios**: Exportações assíncronas e não-bloqueantes

## 🐛 Troubleshooting

### Problema: Dados não atualizam
**Solução**: Certifique-se de que o `useMemo` em stats possui `dateRange` como dependency.

### Problema: Exportação não funciona
**Solução**: Verifique se o navegador permite downloads. Alguns firewalls podem bloquear.

### Problema: Calendário não aparece
**Solução**: Certifique-se de que o componente `Calendar` está importado corretamente.

## 📝 Notas de Desenvolvimento

### Adição de Novos Períodos Pré-definidos
Edite o array `PRESET_RANGES` em `/components/advanced-date-filter.tsx`:

\`\`\`typescript
const PRESET_RANGES = [
  { label: "Hoje", days: 0 },
  { label: "Últimos 7 dias", days: 7 },
  // Adicione novos períodos aqui
  { label: "Últimos 60 dias", days: 60 },
]
\`\`\`

### Customização de Formato de Data
Modifique a função `formatDateDisplay()` em `/components/advanced-date-filter.tsx`.

### Adição de Novo Formato de Exportação
1. Crie nova função em `/lib/export-utils.ts`
2. Adicione botão em `/components/advanced-date-filter.tsx`
3. Implemente handler em `/app/admin/projetos/page.tsx`

## 🔐 Segurança

- Validação de datas no cliente
- Sanitização de strings em exportação
- Sem armazenamento de dados sensíveis
- CORS protegido para downloads

## 📈 Futuras Melhorias

- [ ] Comparação de períodos (este mês vs mês passado)
- [ ] Filtros adicionais (status, tipo, empresa)
- [ ] Gráficos interativos com os dados filtrados
- [ ] Agendamento de relatórios automáticos
- [ ] Exportação para Google Sheets
- [ ] Dashboards dinâmicos

---

**Versão**: 1.0.0  
**Última atualização**: 2024  
**Autor**: Sistema ALLKA
