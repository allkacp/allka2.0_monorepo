import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const R = '\uFFFD' // Unicode replacement character

const fixes = [
  // Starts with replacement char (Ú, Ó, etc.)
  [R + 'ltimos', 'Últimos'],
  [R + 'ltimo', 'último'],
  // Tabs / main labels
  ['Vis' + R + 'o Geral', 'Visão Geral'],
  ['Usu' + R + 'rios', 'Usuários'],
  ['usu' + R + 'rios', 'usuários'],
  ['Usu' + R + 'rio', 'Usuário'],
  ['usu' + R + 'rio', 'usuário'],
  // Informações variants
  ['Informa' + R + R + 'es Principais', 'Informações Principais'],
  ['Informa' + R + R + 'Adicionais', 'InformaçõesAdicionais'],
  ['Informa' + R + R + 'es', 'Informações'],
  ['informa' + R + R + 'es', 'informações'],
  ['INFORMA' + R + R + 'ES', 'INFORMAÇÕES'],
  // Seção
  ['Se' + R + R + 'o', 'Seção'],
  ['se' + R + R + 'o', 'seção'],
  // Estatísticas
  ['Estat' + R + 'sticas', 'Estatísticas'],
  ['Estat' + R + 'stica', 'Estatística'],
  ['estat' + R + 'sticas', 'estatísticas'],
  // Razão
  ['Raz' + R + 'o Social', 'Razão Social'],
  ['raz' + R + 'o social', 'razão social'],
  ['raz' + R + 'o', 'razão'],
  ['Digite a raz' + R + 'o', 'Digite a razão'],
  // Inscrição
  ['Inscri' + R + R + 'o Estadual', 'Inscrição Estadual'],
  ['Inscri' + R + R + 'o', 'Inscrição'],
  ['inscri' + R + R + 'o', 'inscrição'],
  // Endereço
  ['Endere' + R + 'o', 'Endereço'],
  ['endere' + R + 'o', 'endereço'],
  ['ENDERE' + R + 'O', 'ENDEREÇO'],
  // obrigatório
  ['obrigat' + R + R + 'rio', 'obrigatório'],
  ['obrigat' + R + 'rio', 'obrigatório'],
  ['Obrigat' + R + R + 'rio', 'Obrigatório'],
  // alterações / ação
  ['altera' + R + R + 'es', 'alterações'],
  ['Esta a' + R + R + 'o', 'Esta ação'],
  ['a' + R + R + 'o ir' + R, 'ação irá'],
  ['ir' + R + ' ', 'irá '],
  ['ir' + R + '.', 'irá.'],
  // Configurações
  ['Configura' + R + R + 'es', 'Configurações'],
  ['configura' + R + R + 'es', 'configurações'],
  // Atualização
  ['Atualiza' + R + R + 'o', 'Atualização'],
  ['atualiza' + R + R + 'o', 'atualização'],
  // Pontuação
  ['Pontua' + R + R + 'o', 'Pontuação'],
  ['pontua' + R + R + 'o', 'pontuação'],
  // à empresa
  ['Vinculadas ' + R + ' empresa', 'Vinculadas à empresa'],
  ['vinculadas ' + R + ' empresa', 'vinculadas à empresa'],
  [' ' + R + ' empresa', ' à empresa'],
  // Crédito
  ['Cr' + R + 'dito', 'Crédito'],
  ['cr' + R + 'dito', 'crédito'],
  // Gestão
  ['Gest' + R + 'o', 'Gestão'],
  ['gest' + R + 'o', 'gestão'],
  // Criação
  ['Cria' + R + R + 'o', 'Criação'],
  ['cria' + R + R + 'o', 'criação'],
  // Execução
  ['Execu' + R + R + 'o', 'Execução'],
  ['execu' + R + R + 'o', 'execução'],
  // Integração
  ['Integra' + R + R + 'o', 'Integração'],
  ['integra' + R + R + 'o', 'integração'],
  // Operação
  ['Opera' + R + R + 'o', 'Operação'],
  ['opera' + R + R + 'o', 'operação'],
  // Função
  ['Fun' + R + R + 'o', 'Função'],
  ['fun' + R + R + 'o', 'função'],
  // Opção
  ['Op' + R + R + 'o', 'Opção'],
  ['op' + R + R + 'o', 'opção'],
  // Sessão
  ['Sess' + R + 'o', 'Sessão'],
  ['sess' + R + 'o', 'sessão'],
  // Nível
  ['N' + R + 'vel', 'Nível'],
  ['n' + R + 'vel', 'nível'],
  // Não / não
  ['N' + R + 'o ', 'Não '],
  ['n' + R + 'o ', 'não '],
  ['N' + R + 'o.', 'Não.'],
  ['n' + R + 'o.', 'não.'],
  ['N' + R + 'o,', 'Não,'],
  ['n' + R + 'o,', 'não,'],
  ['N' + R + 'o:', 'Não:'],
  ['n' + R + 'o:', 'não:'],
  ['N' + R + 'o!', 'Não!'],
  // Ação standalone
  ['A' + R + R + 'o', 'Ação'],
  ['a' + R + R + 'o', 'ação'],
]

const files = [
  join(__dirname, '..', 'components', 'company-view-slide-panel.tsx'),
  join(__dirname, '..', 'components', 'company-create-slide-panel.tsx'),
  join(__dirname, '..', 'components', 'company-edit-slide-panel.tsx'),
  join(__dirname, '..', 'components', 'company-details-slide-panel.tsx'),
  join(__dirname, '..', 'components', 'company-logs-tab.tsx'),
  join(__dirname, '..', 'components', 'company-users-tab.tsx'),
  join(__dirname, '..', 'components', 'company-tasks-tab.tsx'),
]

let totalFixed = 0
for (const filePath of files) {
  try {
    let content = readFileSync(filePath, 'utf8')
    const before = content

    for (const [broken, fixed] of fixes) {
      while (content.includes(broken)) {
        content = content.split(broken).join(fixed)
      }
    }

    if (content !== before) {
      writeFileSync(filePath, content, 'utf8')
      console.log('Fixed: ' + filePath.split('\\').pop())
      totalFixed++
    } else {
      console.log('No changes: ' + filePath.split('\\').pop())
    }
  } catch (e) {
    if (e.code !== 'ENOENT') console.error('Error: ' + filePath.split('\\').pop() + ': ' + e.message)
  }
}
console.log('\nDone. ' + totalFixed + ' file(s) updated.')
