# Guia de Uso: Seletor de Datas Dinâmico para Indicadores

## Visão Geral

A página `/admin/projetos` agora possui um **seletor de datas interativo** que permite visualizar indicadores (KPIs) e métricas para qualquer período de tempo. Os indicadores se atualizam automaticamente quando você muda o intervalo de datas.

---

## Localização do Seletor

\`\`\`
/admin/projetos
  └─ [Seção de Indicadores]
     └─ Filtro de Data (acima dos cards de métricas)
\`\`\`

---

## Como Usar

### Passo 1: Acessar a Página
\`\`\`
Navegue para /admin/projetos
\`\`\`

### Passo 2: Localizar o Seletor de Data
Você verá um componente chamado "Filtro de Data" com um ícone de calendário acima dos indicadores azuis, verdes, roxos e vermelhos.

### Passo 3: Clicar no Seletor
Clique no botão de data que mostra o intervalo selecionado:
\`\`\`
📅 Jan 01, 2026 - Jan 21, 2026
\`\`\`

### Passo 4: Selecionar o Intervalo
Um calendário com dois meses aparecerá. Você pode:
- **Clicar em uma data inicial** (aparecerá destacada em azul claro)
- **Clicar em uma data final** (o intervalo será destacado em azul)
- **Atalhos rápidos**: Clique em diferentes datas para criar intervalos

### Passo 5: Confirmar Seleção
Clique fora do calendário ou em outro lugar da página. Os indicadores atualizarão automaticamente!

---

## Indicadores Atualizados Dinamicamente

Todos estes indicadores mudam com base no intervalo de datas selecionado:

### 📊 Card Azul - Projetos Totais
- **Projetos Totais**: Quantidade de projetos criados no período
- **Rascunho**: Projetos em fase de rascunho
- **Negociação**: Projetos em negociação
- **Concluídos**: Projetos finalizados
- **Ativos**: Projetos em andamento

### 💚 Card Verde - MRR (Monthly Recurring Revenue)
- **MRR**: Receita mensal recorrente calculada
- **Crescimento**: Taxa de crescimento (%)
- Atualiza baseado em projetos ativos no período

### 🟣 Card Roxo - Avulsos Ativos
- **Avulsos Ativos**: Quantidade de projetos pontuais
- **Crescimento**: Taxa de crescimento
- Baseado em projetos do período

### 🔴 Card Vermelho - Churn
- **Churn**: Quantidade de projetos cancelados
- **Taxa**: Percentual de churn
- **Valor**: Valor em reais dos projetos cancelados

### 📈 Métricas Adicionais (no código, visíveis em detalhes)
- `totalRevenue`: Receita total do período
- `totalSpent`: Total gasto em projetos
- `revenueGrowth`: Crescimento de receita
- `awaitingPaymentValue`: Valor aguardando pagamento
- `overdueValue`: Valor em atraso
- `projection30Days`: Projeção para os próximos 30 dias

---

## Exemplos de Uso

### 📌 Exemplo 1: Análise de Última Semana
\`\`\`
1. Clique no seletor de data
2. Selecione "há 7 dias" até "hoje"
3. Veja o desempenho da última semana
4. Analise o MRR e taxa de churn
\`\`\`

### 📌 Exemplo 2: Comparação Mensal
\`\`\`
1. Selecione primeiro dia do mês até último dia
2. Observe totalRevenue e revenueGrowth
3. Compare com outros meses mudando o intervalo
\`\`\`

### 📌 Exemplo 3: Análise de Período Customizado
\`\`\`
1. Selecione data inicial: 01/01/2025
2. Selecione data final: 31/03/2025
3. Veja o desempenho do trimestre
4. Identifique tendências
\`\`\`

---

## Interpretando os Dados

### 🎯 O que significam os percentuais de crescimento?

| Métrica | Significado |
|---------|------------|
| `mrrGrowth: 45.5%` | 45.5% dos projetos do período estão ativos |
| `avulsosGrowth: 2.5%` | Taxa de crescimento de projetos avulsos |
| `churnRate: 8.5%` | 8.5% dos projetos foram cancelados |
| `revenueGrowth: 75.2%` | 75.2% da receita foi gasta em execução |

### 💡 Dicas de Análise

1. **MRR Alto com Churn Baixo** = Saúde financeira boa
2. **Muitos em "Aguardando Pagamento"** = Acompanhar inadimplência
3. **Avulsos Crescendo** = Bom para receita variável
4. **Projection 30 Days > MRR** = Crescimento esperado

---

## Informações Exibidas

Ao lado do seletor, você verá:

\`\`\`
Intervalo Selecionado:
21/01/2025 até 21/01/2026
(365 dias)
\`\`\`

Isto ajuda a:
- Confirmar o período selecionado
- Ver o número exato de dias
- Planejar análises com precisão

---

## Limitações e Considerações

1. **Datas do Dataset**: Os projetos de mock usam datas de 2024-2025
   - Se selecionar período muito futuro, verá 0 projetos
   - Os dados se baseiam no campo `createdDate` de cada projeto

2. **Formato de Data**: Sistema usa formato brasileiro (DD/MM/YYYY) internamente
   - Display usa formato internacional (Mon DD, YYYY)
   - Conversão é automática

3. **Performance**: Com milhares de projetos, pode ter delay pequeno
   - Sistema é otimizado com `useMemo` para performance máxima

---

## Troubleshooting

### ❓ Os indicadores não estão mudando quando mudo a data?
- Verifique se clicou fora do calendário para confirmar seleção
- Verifique se a data está dentro do range de dados disponíveis

### ❓ O calendário não aparece?
- Tente atualizar a página (F5)
- Verifique se JavaScript está habilitado
- Veja o console de desenvolvedor (F12) para erros

### ❓ Os números estão muito baixos/altos?
- Pode ser porque o intervalo selecionado tem poucos projetos
- Tente selecionar um período maior
- Verifique o resumo "Intervalo Selecionado" para confirmar

---

## Recursos Técnicos

Para desenvolvedores que desejam entender a implementação:

### Componentes Principais
- `DatePickerWithRange` - Componente de seleção de datas
- `isDateInRange()` - Função de filtro
- `useMemo()` - Otimização de cálculos

### Arquivo
- `/app/admin/projetos/page.tsx`

### Integração
- O estado `dateRange` é gerenciado com `useState`
- Stats são calculadas dinamicamente com `useMemo`
- Dependência: `[dateRange]`

---

## Próximas Funcionalidades Planejadas

- [ ] Salvar filtros de data favoritos
- [ ] Exportar relatório com período selecionado
- [ ] Comparação entre dois períodos
- [ ] Atalhos pré-configurados (7 dias, 30 dias, 90 dias)
- [ ] Gráficos de tendência ao longo do tempo

---

**Última Atualização**: 21/01/2026
**Versão**: 1.0
**Status**: ✅ Produção
