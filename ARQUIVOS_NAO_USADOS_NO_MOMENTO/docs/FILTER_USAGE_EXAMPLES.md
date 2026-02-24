# 📚 Exemplos de Uso - Filtro de Data Avançado

## 🎬 Cenários Práticos

### Cenário 1: Análise Mensal

**Objetivo**: Analisar dados de um mês específico

**Passos**:
1. Na página `/admin/projetos`, clique no botão **"Período"**
2. No calendário da esquerda, navegue até o mês desejado
3. Clique no dia 1° do mês
4. No calendário da direita, clique no último dia do mês
5. Clique em **"Aplicar Filtro"**

**Resultado**:
- Indicadores mostram apenas projetos daquele mês
- Status de Churn relacionados àquele período
- MRR calculado para o mês

**Exportar**:
- Clique **"Exportar"** → **"Excel"** para análise detalhada
- Arquivo salvo como: `projetos_01-01-2024_31-01-2024.xls`

---

### Cenário 2: Relatório Semanal

**Objetivo**: Gerar relatório semanal para gestão

**Passos**:
1. Clique em **"Período"**
2. Clique no botão pré-definido **"Últimos 7 dias"** (já seleciona automaticamente)
3. Clique em **"Aplicar Filtro"**

**Resultado Imediato**:
\`\`\`
Projetos Totais: 24
MRR: R$ 45.000
Receita: R$ 140.000
Churn Rate: 3.2%
\`\`\`

**Exportar para Gerente**:
- Clique **"Exportar"** → **"PDF"**
- Salva arquivo pronto para impressão
- Inclui visual profissional com cores

---

### Cenário 3: Comparação Trimestral

**Objetivo**: Comparar crescimento de T1 vs T2

**Primeira Análise (T1)**:
1. Selecione manualmente: 01/01/2024 até 31/03/2024
2. Anote os indicadores:
   - Total: 45 projetos
   - Receita: R$ 450.000

**Segunda Análise (T2)**:
1. Clique no botão de Reset 🔄 para limpar
2. Selecione: 01/04/2024 até 30/06/2024
3. Compare com T1:
   - Total: 52 projetos (+15.5%)
   - Receita: R$ 520.000 (+15.5%)

---

### Cenário 4: Análise de Churn

**Objetivo**: Identificar quando começou o churn

**Passos**:
1. Clique em **"Últimos 90 dias"**
2. Note o Churn Rate: 12.5%
3. Clique em **"Últimos 30 dias"**
4. Note o Churn Rate: 8.5%

**Conclusão**: Churn aumentou no período de 60-90 dias atrás

**Exportar**:
- Clique **"Exportar"** → **"CSV"**
- Importe em ferramentas de BI para gráficos

---

## 🔍 Exemplos de Interpretação de Dados

### Exemplo 1: Crescimento Positivo

\`\`\`
Período: Últimos 30 dias

📊 Indicadores Exportados (Excel):
┌─────────────────────────────────┐
│ Total de Projetos: 24           │
│ Projetos Concluídos: 18 (75%)   │
│ MRR: R$ 45.000                  │
│ Crescimento: +12.5%             │
│ Churn: -3.2% (Diminuiu!)        │
└─────────────────────────────────┘

✅ Interpretação Positiva:
   - Alta taxa de conclusão
   - MRR crescente
   - Churn em queda
   - Status: SAUDÁVEL ✓
\`\`\`

### Exemplo 2: Atenção Requerida

\`\`\`
Período: Últimos 90 dias

⚠️  Indicadores Alertam:
┌─────────────────────────────────┐
│ Churn Rate: 25.3% (ALTO!)       │
│ Aguardando Pagamento: 8 (R$ 67K)│
│ Projetos Vencidos: 12           │
│ Crescimento: -5.2%              │
└─────────────────────────────────┘

⚠️  Interpretação Crítica:
   - Alto churn requer ação
   - Problemas de pagamento
   - Muitos projetos vencidos
   - Status: CRÍTICO ⚠️
\`\`\`

---

## 💡 Casos de Uso por Cargo

### Para o CEO / Gestor

\`\`\`
Frequência: Semanal

1. Filtro: "Últimos 7 dias"
2. Indicadores Monitorados:
   - Total de Projetos (trend)
   - MRR (receita)
   - Churn Rate (retenção)

3. Exportação: PDF para relatório semanal

4. Pergunta Respondida:
   "Como foi a semana em números?"
\`\`\`

### Para o Gerente de Projetos

\`\`\`
Frequência: Diária

1. Filtro: "Hoje"
2. Indicadores Monitorados:
   - Projetos em Andamento
   - Projetos Concluídos
   - Aguardando Pagamento

3. Exportação: CSV para acompanhamento

4. Pergunta Respondida:
   "Quantos projetos concluímos hoje?"
\`\`\`

### Para o Analista Financeiro

\`\`\`
Frequência: Mensal

1. Filtro: Período customizado (mês específico)
2. Indicadores Monitorados:
   - Valor Total
   - Gasto Total
   - Saldo Orçamentário
   - Aguardando Pagamento

3. Exportação: Excel para análise detalhada

4. Pergunta Respondida:
   "Qual foi o resultado financeiro do mês?"
\`\`\`

---

## 🎯 Fluxo de Trabalho Completo

### Exemplo: Geração de Relatório Mensal

\`\`\`
INÍCIO
  ↓
1️⃣  Abrir /admin/projetos
  ↓
2️⃣  Clique em "Período"
  ↓
3️⃣  Selecione manualmente as datas do mês
     Data Inicial: 01/01/2024
     Data Final: 31/01/2024
  ↓
4️⃣  Clique em "Aplicar Filtro"
  ↓
5️⃣  Observe os indicadores atualizarem
     Total: 42 projetos
     Receita: R$ 485.000
     MRR: R$ 48.500
  ↓
6️⃣  Clique em "Exportar"
  ↓
7️⃣  Escolha "Excel" para análise detalhada
  ↓
8️⃣  Arquivo baixa automaticamente:
     projetos_01-01-2024_31-01-2024.xls
  ↓
9️⃣  Abra em Excel, analise dados, gere gráficos
  ↓
🔟 Pronto! Relatório completo
FIM
\`\`\`

---

## 📊 Dados de Exemplo Exportados

### CSV
\`\`\`
Relatório de Projetos
Período: 01/01/2024 até 31/01/2024
Total de Projetos: 24
Valor Total: R$ 485.000,00
Gasto Total: R$ 142.500,00

"ID";"Nome do Projeto";"Status";"Tipo";"Orçamento";"Gasto"
"001";"Site Corporativo";"completed";"Web";"R$ 15.000,00";"R$ 15.000,00"
"002";"App Mobile";"in-progress";"Mobile";"R$ 42.000,00";"R$ 28.500,00"
...
\`\`\`

### Excel (Visual)
\`\`\`
╔════════════════════════════════════════════╗
║     RELATÓRIO DE PROJETOS - JANEIRO        ║
╠════════════════════════════════════════════╣
║ Período: 01/01/2024 até 31/01/2024        ║
║ Total de Projetos: 24                      ║
║ Valor Total: R$ 485.000,00                 ║
║ Gasto Total: R$ 142.500,00                 ║
╠════════════════════════════════════════════╣
║ ID  │ Projeto      │ Status    │ Orçamento ║
├─────┼──────────────┼───────────┼───────────┤
║ 001 │ Site Corp.   │ Concluído │ R$ 15K   ║
║ 002 │ App Mobile   │ Em Prog.  │ R$ 42K   ║
║ ... │ ...          │ ...       │ ...      ║
╚════════════════════════════════════════════╝
\`\`\`

### PDF
\`\`\`
┌─────────────────────────────────────────┐
│    RELATÓRIO DE PROJETOS                │
│    Período: 01/01/2024 até 31/01/2024   │
│    Gerado em: 05/02/2024 14:32:15       │
├─────────────────────────────────────────┤
│ ┌──────────┬──────────┬──────────┐      │
│ │ Projetos │ Orçamento│ Gasto    │      │
│ │    24    │ R$ 485K  │ R$ 142K  │      │
│ └──────────┴──────────┴──────────┘      │
├─────────────────────────────────────────┤
│ [Tabela com todos os projetos]          │
└─────────────────────────────────────────┘
\`\`\`

---

## 🚀 Dicas de Uso Avançado

### Dica 1: Período Móvel
\`\`\`
Para monitorar "últimos 30 dias" sempre:

Segunda-feira:
- Filtro: Últimos 30 dias
- Exporta CSV
- Salva como: "relatorio_semana_01.csv"

Próxima segunda:
- Filtro: Últimos 30 dias (automaticamente 7 dias depois)
- Exporta CSV
- Compara com semana anterior
\`\`\`

### Dica 2: Análise de Tendência
\`\`\`
Descubra quando crescimento começou:

1. "Últimos 90 dias" → Nota tendência
2. "Últimos 60 dias" → Isola período
3. "Últimos 30 dias" → Identifica exatamente quando

Resultado: Crescimento começou na semana 2 de dezembro
\`\`\`

### Dica 3: Exportação Comparativa
\`\`\`
Para comparar períodos:

1. Período 1: 01/01 até 31/01
   - Exporta como: "janeiro.xlsx"
   
2. Reset filtro (botão 🔄)

3. Período 2: 01/02 até 28/02
   - Exporta como: "fevereiro.xlsx"

4. Abre ambos em Excel, cria gráfico comparativo
\`\`\`

---

## 🎓 Fórmulas de Interpretação

### MRR (Monthly Recurring Revenue)
\`\`\`
MRR = (Valor Total do Período) / (Dias do Período / 30)

Exemplo:
- Período: 30 dias
- Valor: R$ 45.000
- MRR = R$ 45.000 / (30/30) = R$ 45.000
\`\`\`

### Churn Rate
\`\`\`
Churn Rate = (Projetos Cancelados / Total) × 100

Exemplo:
- Total: 100 projetos
- Cancelados: 8 projetos
- Churn Rate = (8/100) × 100 = 8%
\`\`\`

### Taxa de Conclusão
\`\`\`
Taxa de Conclusão = (Concluídos / Total) × 100

Exemplo:
- Total: 50 projetos
- Concluídos: 42 projetos
- Taxa = (42/50) × 100 = 84%
\`\`\`

---

## ✅ Checklist de Validação de Dados

Ao exportar, verifique:

- [ ] Período está correto
- [ ] Total de linhas corresponde ao total de projetos
- [ ] Valores em reais estão formatados
- [ ] Status dos projetos fazem sentido
- [ ] Datas são válidas
- [ ] Não há linhas duplicadas
- [ ] Arquivo baixou completo

---

## 🔗 Integração com Outras Ferramentas

### Google Sheets
\`\`\`
1. Exporta como CSV
2. Google Sheets → Arquivo → Importar
3. Seleciona arquivo CSV
4. Cria abas dinâmicas e gráficos
\`\`\`

### Power BI
\`\`\`
1. Exporta como Excel
2. Power BI → Obter dados → Excel
3. Seleciona arquivo XLS
4. Cria dashboards interativos
\`\`\`

### Ferramentas de BI (Tableau, Metabase)
\`\`\`
1. Exporta como CSV regularmente
2. Configura automação de import
3. Constrói visualizações
4. Compartilha dashboards
\`\`\`

---

**Versão**: 1.0.0  
**Última atualização**: 2024  
**Próximas melhorias**: Agendamento automático de relatórios
