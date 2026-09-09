# ADR-008 — Ciclo de vida e exibição de candidaturas

## Status

Aceito.

## Contexto

O dataset de candidatos possui uma situação geral de candidatura e, em arquivo complementar, uma situação de julgamento. No pacote oficial 2026 inspecionado, o primeiro campo aparece como `-3 / #NE` em todos os registros e os estados efetivos estão no arquivo complementar. Estados de recurso e pendência podem mudar durante o calendário eleitoral.

Uma classificação baseada apenas nos textos observados em um único snapshot deixaria a atualização vulnerável a transições já previstas pelo próprio domínio do TSE.

## Decisão original

O adaptador mantém tabelas explícitas de código e descrição para os dois campos. Elas reconhecem somente valores concretamente encontrados no pacote oficial de Candidatos 2026: `-3 / #NE` no campo geral e `2`, `4`, `5`, `6`, `8`, `13`, `14` e `16` no julgamento.

`#NE` não é convertido em status do produto. O julgamento complementar fornece o estado de 2026. Deferimentos são exibíveis; situações recursais ou ainda não julgadas permanecem ambíguas; cancelamento, renúncia, pedido não conhecido e indeferimento inequívocos não são exibíveis. Códigos conhecidos apenas por eleições anteriores não são antecipados neste adaptador.

Qualquer código novo ou divergência entre código e descrição abortava a normalização. A publicação atômica exigia revisão humana do mapeamento antes de aceitar um novo estado.

## Evolução da decisão

A enumeração externa evoluiu durante o ciclo eleitoral com `17 / PENDENTE DE JULGAMENTO`. Esse par passa a ser conhecido explicitamente e, preservando sua distinção em relação a `8 / AGUARDANDO JULGAMENTO`, é classificado como `PENDING_OR_AMBIGUOUS`.

A política fail-closed global para situações de julgamento desconhecidas mostrou-se excessiva: uma mudança semântica isolável impedia a atualização de todas as candidaturas estruturalmente válidas. A partir desta revisão, o par código e descrição continua sendo a unidade de reconhecimento, mas um código novo ou uma descrição divergente produz uma resolução `unrecognized`, preserva os dois valores externos, recebe conservadoramente `PENDING_OR_AMBIGUOUS`, gera warning agrupado e não invalida sozinho o snapshot. O diagnóstico é ordenado e conta todas as ocorrências de cada par para permitir revisão e posterior inclusão explícita no mapping.

Essa tolerância não se aplica à situação geral de candidatura nem a falhas estruturais. Arquivos ilegíveis ou inválidos, colunas obrigatórias ausentes, parsing impossível, identificadores inválidos, duplicidades, associações impossíveis, partições ou artefatos incompletos e inconsistências de validação continuam causando falha global. A publicação permanece atômica.

## Alternativas consideradas

- usar somente descrições textuais;
- tratar qualquer situação desconhecida como pendente;
- usar apenas o campo geral em todos os anos;
- remover do snapshot registros que não podem ser exibidos.

## Consequências

- mudanças do domínio oficial não chegam silenciosamente à interface;
- transições 2026 de deferimento, recurso, espera ou pendência de julgamento, cancelamento, renúncia, pedido não conhecido e indeferimento possuem testes explícitos;
- registros não exibíveis permanecem auditáveis no snapshot, mas a camada de candidatos impede sua seleção;
- novos pares de julgamento não congelam todo o dataset, mas permanecem detectáveis e conservadores;
- warnings agrupados tornam a evolução do contrato visível sem alterar o código de saída;
- novos códigos exigem inspeção oficial e alteração revisada do adaptador para deixarem de ser `unrecognized`;
- invariantes estruturais permanecem fail-closed.
