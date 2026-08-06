-- Aprovação do cliente passa a ser configurável, e a configuração mora no
-- PRODUTO.
--
-- `ProjectTask.exige_aprovacao_cliente` existe desde a migration
-- `aprovacao_dois_niveis` e é lido pelo motor (`nivelPendente`), mas nada no
-- sistema jamais escrevia nele: ficava sempre no default `true`, então TODA
-- tarefa exigia o aceite do cliente, sem exceção possível. O comentário
-- daquela migration prometia "opcional por produto/contrato" — é isto aqui.
--
-- A regra é do produto porque quem determina se o cliente confere é o tipo de
-- entrega: identidade visual ele aprova, publicação de post recorrente
-- normalmente não. Decisão do usuário em 2026-08-06.
--
-- Default `true` preserva o comportamento atual: nenhum produto existente
-- muda de conduta com esta migration; só passa a ser possível desligar.

ALTER TABLE `products`
  ADD COLUMN `exige_aprovacao_cliente` BOOLEAN NOT NULL DEFAULT true;
