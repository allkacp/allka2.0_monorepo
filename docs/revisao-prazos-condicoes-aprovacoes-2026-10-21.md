# Revisão de prazos, condições e aprovações (R21-24) — rascunho para o Vinicius decidir

> Reunião de 21/10: "revisar as regras de prazos, condições e aprovações já definidas". Este documento junta o que **já está definido e funcionando** e lista **as decisões que só você pode tomar**. Nada aqui foi publicado.

## 1. Prazos — o que vale hoje
| Regra | Situação |
|---|---|
| O **prazo comercial** (o que o cliente vê) é informado em dias ou horas úteis e **nunca** é derivado do esforço | Funcionando. O esforço calculado serve só para planejamento interno. |
| Variações, adicionais e condições **somam dias** ao prazo base | Funcionando (memória de cálculo mostra cada parcela). |
| Horas úteis → dias úteis pelo calendário da plataforma | Funcionando. |
| Prazo comercial em minutos/horas/dias com conversão (R21-15) | Feito em 21/10. |
| **Entrega rápida (R21-04/19)**: por etapa **ou** condição do produto inteiro (um % de redução do prazo e um % de adicional para TODAS as etapas) | Cadastro e cálculo prontos em 21/10. |
| Limites do pedido de entrega rápida: **horário-limite no mesmo dia** e **antecedência mínima** antes do fim da tarefa | Cadastrados e **aplicados no servidor** ao pedir (21/10). |
| **Aceite do profissional (R21-11)**: pode ser exigido; prazo de resposta; sem resposta = recusa; recusou = valor adicional cancelado | Pronto no servidor e na tarefa (21/10). Dinheiro já pago **não** é devolvido sozinho: fica "ESTORNO PENDENTE" e o admin é avisado. |

## 2. Condições — o que vale hoje
- Condição = alteração **global de execução** (prazo somado e/ou % sobre o custo em **todas** as etapas). Variação = escolha exclusiva que define o produto. Adicional = opcional complementar (R21-23).
- Etapa **dependente** de variação/adicional (R21-03) só entra com vínculo e **bloqueia a publicação** se ficar sem ele.
- Adicionais agora têm **"quando contratar"**: só antes · só depois que a execução começou · antes e depois (R21-05). A compra só mostra os de "antes/ambos"; os de "depois/ambos" saem separados para a área da execução.

## 3. Aprovações — o que vale hoje
- Quatro modos por etapa: não exige · pela própria etapa · por entregáveis · apenas ciência. Etapa interna nunca vai ao cliente.
- **Limites honestos (já documentados)**: limite de ajustes, quem recebe o pedido de ajuste e a ação no silêncio ficam **registrados** no cadastro, mas o sistema **ainda não os aplica sozinho**.

## 4. Decisões que dependem de você
1. **Entrega rápida × Condição "entrega expressa/full".** Hoje existem os dois caminhos (a Condição genérica e a Entrega rápida do produto inteiro). Manter os dois ou usar só a Entrega rápida? *Sugestão: usar só a Entrega rápida e deixar Condição para regras de prazo de aprovação.*
2. **Fuso do horário-limite.** O "12:00" do mesmo dia é conferido no horário do servidor. Definir "horário de Brasília" como padrão?
3. **Estorno automático.** Quando o profissional recusa e o cliente já pagou, hoje o financeiro devolve à mão. Quer que vire crédito automático na carteira do cliente?
4. **Adicional durante a execução (R21-20).** Falta decidir: preço = o mesmo da compra ou recalculado? Muda o prazo da etapa em andamento? E qual gateway/caixa de pagamento usar? (A caixa de pagamento **não foi construída** por depender disso.)
5. **Alterações grátis por IA vazias (R21-01).** Hoje etapa sem o número recebe alerta vermelho no resumo do produto, mas **não trava a publicação** (vazio = vale a regra global). Quer travar a publicação?
6. **Aplicar de verdade** o limite de ajustes e a ação no silêncio da aprovação (item 3 acima)?
