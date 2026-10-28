-- O texto da pergunta aceitava até 500 caracteres na validação, mas a coluna só guardava 191: perguntas longas (ex.: geradas pela IA) davam "Erro interno" ao salvar.
ALTER TABLE `catalog2_questionnaire_questions` MODIFY `label` VARCHAR(500) NOT NULL;
