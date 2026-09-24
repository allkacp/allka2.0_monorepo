import fs from 'node:fs/promises';
import { Workbook, SpreadsheetFile } from '@oai/artifact-tool';

const outputDir = String.raw`C:\Users\Teste\Documentos 2.0\Verificação 2.0\_DESENVOLVIMENTOS\Plataforma allka 2026\allka-plataforma\allka-2026\entregas\qa-usuarios\atualizacao-nomade`;
await fs.mkdir(outputDir, { recursive: true });

const tests = [
  ['NO-R01','Login e sessão','Acesse com a conta Nômade de QA.','Portal Nômade abre e a sessão permanece ativa.','Baixo'],
  ['NO-R02','Container padrão','Confira cabeçalho, menu e conteúdo central.','Nenhuma área cortada ou sobreposta.','Baixo'],
  ['NO-R03','Tutorial no primeiro acesso','Caso a oferta apareça, clique em Começar.','Primeiro passo do tutorial inicia corretamente.','Baixo'],
  ['NO-R04','Não quero ver novamente','Escolha Não quero ver e recarregue a página.','Oferta não reaparece sozinha; tour continua na Ajuda.','Baixo'],
  ['NO-R05','Central de Ajuda','Abra Ajuda e localize o tour do Nômade.','Ícone é diferente de Sugestões; iniciar, continuar e refazer funcionam.','Baixo'],
  ['NO-R06','Retomada do tutorial','Avance dois passos, feche e recarregue.','Tour continua no mesmo ponto.','Baixo'],
  ['NO-R07','Allkademy','Abra Allkademy pelo menu.','Layout segue o padrão com menu, cabeçalho e container central.','Baixo'],
  ['NO-R08','Habilitações','Abra Habilitações e confira as áreas.','Tela abre sem erro e explica as habilitações.','Baixo'],
  ['NO-R09','Minhas Tarefas em lista','Abra Minhas Tarefas e selecione Lista.','Cards têm prazo, etapa e estado legíveis.','Baixo'],
  ['NO-R10','Minhas Tarefas em kanban','Alterne para Kanban e volte para Lista.','As duas visualizações funcionam.','Baixo'],
  ['NO-R11','Detalhe da tarefa','Clique em tarefa ou etapa atribuída.','Abre no container central, com fechar e fixar.','Baixo'],
  ['NO-R12','Etapa concluída','Em registro [TESTE USUÁRIO], conclua a etapa liberada e abra Concluídas.','Etapa concluída continua visível em Concluídas.','Médio'],
  ['NO-R13','Sequência automática','Em tarefa [TESTE USUÁRIO] com duas etapas, conclua a primeira.','Próxima etapa é liberada; antes disso, explica o bloqueio.','Médio'],
  ['NO-R14','Histórico','Abra Histórico após uma ação permitida.','Ação aparece com data e descrição coerentes.','Baixo'],
  ['NO-R15','Tarefas Disponíveis','Abra Tarefas Disponíveis e assuma apenas uma etapa [TESTE USUÁRIO] compatível.','Busca funciona e etapa assumida aparece em Minhas Tarefas.','Médio'],
  ['NO-R16','Permissões do Nômade','Procure Catálogo ou Contratar no menu.','Não há catálogo nem ações de compra.','Baixo'],
];

const wb = Workbook.create();
const summary = wb.worksheets.add('Resumo');
const sheet = wb.worksheets.add('Reteste Nômade');
for (const ws of [summary, sheet]) ws.showGridLines = false;

summary.getRange('A2').values = [['Reteste Nômade']];
summary.getRange('A3').values = [['Conta: nomad@allka.com.vc']];
summary.getRange('A5:B9').values = [
  ['Status','Quantidade'],
  ['Funcionou',0],
  ['Não funcionou',0],
  ['Não se aplica',0],
  ['Não consegui testar',0],
];
summary.getRange('B6').formulas = [[`=COUNTIF('Reteste Nômade'!$G$2:$G$17,A6)`]];
summary.getRange('B6:B9').fillDown();
summary.getRange('A11').values = [['Observação: NO-R12 a NO-R15 exigem registros [TESTE USUÁRIO] preparados pela coordenação.']];

const headers = [['Código','Área','Como testar','Resultado esperado','Cuidado','Evidência ou URL','Status','Observações']];
sheet.getRange('A1:H1').values = headers;
sheet.getRange(`A2:H${tests.length + 1}`).values = tests.map(([code, area, how, expected, care]) => [code, area, how, expected, care, '', '', '']);

const titleFormat = { font: { name: 'Arial', size: 16, bold: true, color: '#111827' } };
summary.getRange('A2').format = titleFormat;
summary.getRange('A3').format = { font: { name: 'Arial', size: 10, italic: true, color: '#475569' } };
summary.getRange('A5:B5').format = { fill: '#14213D', font: { name: 'Arial', size: 10, bold: true, color: '#FFFFFF' } };
summary.getRange('A6:B9').format = { font: { name: 'Arial', size: 10 }, borders: { items: [{ color: '#D9D9D9', style: 'continuous', side: 'EdgeBottom' }] } };
summary.getRange('A11').format = { font: { name: 'Arial', size: 10, italic: true, color: '#7C2D12' }, fill: '#FFF7ED', wrapText: true };
summary.getRange('A1:B12').format.horizontalAlignment = 'left';
summary.getRange('A1:B12').format.verticalAlignment = 'center';
summary.getRange('A:A').format.columnWidth = 28;
summary.getRange('B:B').format.columnWidth = 16;
summary.getRange('A11:B11').merge();

sheet.getRange('A1:H1').format = { fill: '#14213D', font: { name: 'Arial', size: 10, bold: true, color: '#FFFFFF' }, horizontalAlignment: 'center', verticalAlignment: 'center', wrapText: true };
sheet.getRange(`A2:H${tests.length + 1}`).format = { font: { name: 'Arial', size: 10, color: '#172033' }, verticalAlignment: 'top', wrapText: true };
sheet.getRange(`A2:H${tests.length + 1}`).format.rowHeight = 52;
sheet.getRange('A:A').format.columnWidth = 12;
sheet.getRange('B:B').format.columnWidth = 25;
sheet.getRange('C:C').format.columnWidth = 44;
sheet.getRange('D:D').format.columnWidth = 44;
sheet.getRange('E:E').format.columnWidth = 12;
sheet.getRange('F:F').format.columnWidth = 25;
sheet.getRange('G:G').format.columnWidth = 22;
sheet.getRange('H:H').format.columnWidth = 35;
sheet.getRange(`G2:G${tests.length + 1}`).dataValidation = { rule: { type: 'list', formula1: '"Funcionou,Não funcionou,Não se aplica,Não consegui testar"' } };
sheet.getRange(`G2:G${tests.length + 1}`).conditionalFormats.add('containsText', { text: 'Funcionou', format: { fill: '#DCFCE7', font: { color: '#166534', bold: true } } });
sheet.getRange(`G2:G${tests.length + 1}`).conditionalFormats.add('containsText', { text: 'Não funcionou', format: { fill: '#FEE2E2', font: { color: '#991B1B', bold: true } } });
sheet.getRange(`G2:G${tests.length + 1}`).conditionalFormats.add('containsText', { text: 'Não se aplica', format: { fill: '#F1F5F9', font: { color: '#475569' } } });
sheet.getRange(`G2:G${tests.length + 1}`).conditionalFormats.add('containsText', { text: 'Não consegui testar', format: { fill: '#FEF3C7', font: { color: '#92400E', bold: true } } });
sheet.freezePanes.freezeRows(1);
sheet.tables.add(`A1:H${tests.length + 1}`, true, 'RetesteNomadeTable').style = 'TableStyleMedium2';

wb.recalculate();
const preview = await wb.render({ sheetName: 'Reteste Nômade', range: 'A1:H17', autoCrop: 'all', scale: 1, format: 'png' });
await fs.writeFile(`${outputDir}\\Registro_de_Resultados_Reteste_Nomade_preview.png`, new Uint8Array(await preview.arrayBuffer()));
const xlsx = await SpreadsheetFile.exportXlsx(wb);
await xlsx.save(`${outputDir}\\Registro_de_Resultados_Reteste_Nomade.xlsx`);
console.log('done');
