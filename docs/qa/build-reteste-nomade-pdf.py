from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether

ROOT = Path(r"C:\Users\Teste\Documentos 2.0\Verificação 2.0\_DESENVOLVIMENTOS\Plataforma allka 2026\allka-plataforma\allka-2026")
OUT = ROOT / "entregas" / "qa-usuarios" / "atualizacao-nomade"

tests = [
    ("NO-R01", "Login e sessão", "Acesse com a conta Nômade de QA.", "Portal Nômade abre e a sessão permanece ativa."),
    ("NO-R02", "Container padrão", "Confira cabeçalho, menu e conteúdo central.", "Nenhuma área cortada ou sobreposta."),
    ("NO-R03", "Tutorial no primeiro acesso", "Caso a oferta apareça, clique em Começar.", "Primeiro passo do tutorial inicia corretamente."),
    ("NO-R04", "Não quero ver novamente", "Escolha Não quero ver e recarregue a página.", "Oferta não reaparece sozinha; tour continua na Ajuda."),
    ("NO-R05", "Central de Ajuda", "Abra Ajuda e localize o tour do Nômade.", "Ícone é diferente de Sugestões; iniciar, continuar e refazer funcionam."),
    ("NO-R06", "Retomada do tutorial", "Avance dois passos, feche e recarregue.", "Tour continua no mesmo ponto."),
    ("NO-R07", "Allkademy", "Abra Allkademy pelo menu.", "Layout segue o padrão com menu, cabeçalho e container central."),
    ("NO-R08", "Habilitações", "Abra Habilitações e confira as áreas.", "Tela abre sem erro e explica as habilitações."),
    ("NO-R09", "Minhas Tarefas em lista", "Abra Minhas Tarefas e selecione Lista.", "Cards têm prazo, etapa e estado legíveis."),
    ("NO-R10", "Minhas Tarefas em kanban", "Alterne para Kanban e volte para Lista.", "As duas visualizações funcionam."),
    ("NO-R11", "Detalhe da tarefa", "Clique em tarefa ou etapa atribuída.", "Abre no container central, com fechar e fixar."),
    ("NO-R12", "Etapa concluída", "Em registro [TESTE USUÁRIO], conclua a etapa liberada e abra Concluídas.", "Etapa concluída continua visível em Concluídas."),
    ("NO-R13", "Sequência automática", "Em tarefa [TESTE USUÁRIO] com duas etapas, conclua a primeira.", "Próxima etapa é liberada; antes disso, explica o bloqueio."),
    ("NO-R14", "Histórico", "Abra Histórico após uma ação permitida.", "Ação aparece com data e descrição coerentes."),
    ("NO-R15", "Tarefas Disponíveis", "Abra Tarefas Disponíveis e assuma apenas uma etapa [TESTE USUÁRIO] compatível.", "Busca funciona e etapa assumida aparece em Minhas Tarefas."),
    ("NO-R16", "Permissões do Nômade", "Procure Catálogo ou Contratar no menu.", "Não há catálogo nem ações de compra."),
]

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='MyTitle', parent=styles['Title'], fontName='Helvetica-Bold', fontSize=22, leading=27, textColor=colors.black, spaceAfter=8, alignment=TA_LEFT))
styles.add(ParagraphStyle(name='MyH1', parent=styles['Heading1'], fontName='Helvetica-Bold', fontSize=15, leading=19, textColor=colors.black, spaceBefore=14, spaceAfter=7))
styles.add(ParagraphStyle(name='MyH2', parent=styles['Heading2'], fontName='Helvetica-Bold', fontSize=11, leading=14, textColor=colors.black, spaceBefore=10, spaceAfter=3))
styles.add(ParagraphStyle(name='BodyCustom', parent=styles['BodyText'], fontName='Helvetica', fontSize=9.5, leading=13, spaceAfter=5))
styles.add(ParagraphStyle(name='Small', parent=styles['BodyText'], fontName='Helvetica', fontSize=8.5, leading=11))

def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(colors.HexColor('#475569'))
    canvas.drawCentredString(A4[0] / 2, 1.0 * cm, f'Allka - roteiro interno de QA - página {doc.page}')
    canvas.restoreState()

story = []
story.append(Paragraph('Roteiro de Reteste Nômade', styles['MyTitle']))
story.append(Paragraph('Atualização de QA - setembro de 2026', styles['BodyCustom']))
story.append(Spacer(1, 6))
story.append(Paragraph('<b>Objetivo.</b> Este roteiro verifica as correções recentes do portal Nômade antes de liberar o fluxo para o uso normal. Execute apenas com a conta de QA indicada e registre cada resultado na planilha correspondente.', styles['BodyCustom']))
story.append(Paragraph('Acesso de teste', styles['MyH1']))
access = [
    [Paragraph('<b>Campo</b>', styles['Small']), Paragraph('<b>Informação</b>', styles['Small'])],
    ['Portal', 'https://allka.store'],
    ['Conta', 'nomad@allka.com.vc'],
    ['Perfil', 'Nômade de QA, ativo, nível Bronze'],
    ['Senha', 'Enviar separadamente por canal interno seguro'],
]
table = Table(access, colWidths=[4 * cm, 12.6 * cm])
table.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#14213D')),
    ('TEXTCOLOR', (0,0), (-1,0), colors.white),
    ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
    ('FONTNAME', (0,1), (-1,-1), 'Helvetica'),
    ('FONTSIZE', (0,0), (-1,-1), 9),
    ('GRID', (0,0), (-1,-1), 0.35, colors.HexColor('#D9D9D9')),
    ('BACKGROUND', (0,2), (-1,2), colors.HexColor('#F4F7FB')),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('TOPPADDING', (0,0), (-1,-1), 7),
    ('BOTTOMPADDING', (0,0), (-1,-1), 7),
    ('LEFTPADDING', (0,0), (-1,-1), 8),
    ('RIGHTPADDING', (0,0), (-1,-1), 8),
]))
story.append(table)
story.append(Paragraph('Antes de começar', styles['MyH1']))
for note in [
    'Use apenas registros marcados [TESTE USUÁRIO] para concluir etapas ou assumir tarefas.',
    'Os testes NO-R12 a NO-R15 precisam de uma tarefa de QA atribuída e de uma tarefa disponível compatível. Se elas não existirem, marque Não consegui testar e informe a coordenação.',
    'Não exclua, cancele ou altere dados reais. Não publique produtos, não faça pagamentos e não altere contas.',
    'Ao encontrar algo errado, tire uma captura de tela, informe o código do teste e descreva o que esperava acontecer.',
]:
    story.append(Paragraph('• ' + note, styles['BodyCustom']))
story.append(PageBreak())
story.append(Paragraph('Roteiro de testes', styles['MyH1']))
for code, name, how, expected in tests:
    story.append(KeepTogether([
        Paragraph(f'{code} {name}', styles['MyH2']),
        Paragraph(f'<b>Como testar:</b> {how}', styles['BodyCustom']),
        Paragraph(f'<b>Deve acontecer:</b> {expected}', styles['BodyCustom']),
    ]))
story.append(Paragraph('Como registrar', styles['MyH1']))
story.append(Paragraph('Na planilha, selecione Funcionou, Não funcionou, Não se aplica ou Não consegui testar. Em caso de problema, descreva o que ocorreu, inclua a URL da tela e anexe a captura quando possível.', styles['BodyCustom']))
story.append(Paragraph('Pendência conhecida fora deste reteste', styles['MyH1']))
story.append(Paragraph('Em telas estreitas, os ícones flutuantes da lateral direita podem ficar parcialmente atrás do container principal. Esse acabamento já foi identificado e não faz parte deste reteste; registre apenas se o comportamento piorar ou impedir uma ação principal.', styles['BodyCustom']))

out = OUT / 'Roteiro_de_Reteste_Nomade.pdf'
SimpleDocTemplate(str(out), pagesize=A4, rightMargin=1.7*cm, leftMargin=1.7*cm, topMargin=1.5*cm, bottomMargin=1.7*cm).build(story, onFirstPage=footer, onLaterPages=footer)
print(out)
