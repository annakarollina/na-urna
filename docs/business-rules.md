# Regras de negócio

## 1. Escopo

Este documento descreve o comportamento implementado para o primeiro turno das Eleições Gerais de 2026. Somente 2026 está configurado; em outro ano, a aplicação informa que não há eleição suportada.

Uma seleção é uma anotação local para uma posição da colinha, não um voto enviado ou registrado. Candidatura, legenda, branco e nulo são variantes explícitas do domínio; branco, nulo e legenda não são candidatos sintéticos.

## 2. Localização eleitoral

**RN-010.** A pessoa informa a UF do domicílio eleitoral; a aplicação não presume que a posição física atual seja esse domicílio.

**RN-011.** A escolha manual de UF é o caminho principal e permanece disponível quando geolocalização ou resolução geográfica falham.

**RN-012.** A geolocalização é opcional, iniciada por ação explícita e serve somente para sugerir uma UF.

**RN-013.** As coordenadas são comparadas localmente com a malha estadual do IBGE e não são enviadas a um serviço de geocodificação.

**RN-014.** A UF sugerida precisa ser confirmada ou corrigida antes do carregamento das candidaturas.

**RN-015.** Alterar a UF com escolhas existentes exige confirmação e limpa a colinha para evitar combinações territoriais inválidas.

## 3. Eleições Gerais de 2026

**RN-020.** A ordem das posições é:

1. Deputado Federal — uma escolha;
2. Deputado Estadual — uma escolha, substituído por Deputado Distrital no DF;
3. Senador — primeira escolha;
4. Senador — segunda escolha;
5. Governador — uma escolha;
6. Presidente da República — uma escolha.

**RN-021.** As duas posições de Senador são distintas e não aceitam o mesmo candidato.

**RN-022.** Presidente tem circunscrição nacional; os demais cargos têm circunscrição estadual.

**RN-023.** Voto de legenda é permitido somente para Deputado Federal e Deputado Estadual ou Distrital.

**RN-024.** A interface oferece candidatura, legenda quando cabível e voto em branco. O domínio preserva a variante nulo para validação e composição, mas a interface não sugere um número nem oferece uma ação para produzir voto nulo.

**RN-025.** A data do eventual segundo turno é declarada, mas seus cargos não são inferidos nem apresentados enquanto não estiverem configurados a partir de definição oficial.

## 4. Candidaturas e disponibilidade

**RN-030.** Toda candidatura apresentada deriva do snapshot oficial normalizado e validado.

**RN-031.** A apresentação usa identificador, cargo, número, nome de urna, partido, situação, circunscrição e fotografia oficial quando disponível.

**RN-032.** Foto ausente ou com falha de carregamento recebe placeholder neutro; não é substituída por fonte não oficial. Nome e número continuam visíveis.

**RN-033.** Texto externo é renderizado como texto, nunca interpretado como HTML.

**RN-034.** `DISPLAYABLE` é selecionável. `PENDING_OR_AMBIGUOUS` também permanece selecionável com aviso visível. `NOT_DISPLAYABLE` não pode ser selecionado nem composto no PNG.

**RN-035.** Códigos ou descrições de situação desconhecidos interrompem o pipeline para revisão; não são convertidos silenciosamente.

## 5. Busca e apresentação

**RN-040.** A busca aceita nome de urna ou número e ignora caixa e acentos.

**RN-041.** Cada termo textual precisa ser prefixo de alguma palavra do nome; a consulta numérica precisa ser prefixo do número eleitoral.

**RN-042.** O filtro de partido é derivado das candidaturas carregadas e combinado com a busca.

**RN-043.** Sem filtros, todas as candidaturas selecionáveis são apresentadas em lista contínua e ordenação numérica/nominal determinística.

**RN-044.** Popularidade, cliques, histórico, preferência presumida e patrocínio não influenciam busca, ordenação ou destaque.

**RN-045.** Foto, número, nome de urna, partido, cargo e eventual situação pendente permitem confirmar visualmente a escolha.

## 6. Estado da colinha

**RN-050.** UF, arquivos carregados e escolhas existem somente na memória da página.

**RN-051.** A aplicação não persiste escolhas em `localStorage`, `sessionStorage`, IndexedDB, cookies, URL ou servidor.

**RN-052.** Recarregar ou fechar a página apaga o progresso.

**RN-053.** Posições podem permanecer vazias durante a montagem; nenhuma escolha é inferida.

**RN-054.** A revisão distingue candidatura, legenda, branco, nulo e posição não preenchida.

## 7. Geração e entrega da imagem

**RN-060.** O PNG é composto no navegador e preserva a ordem oficial das posições.

**RN-061.** Para candidatura, a imagem inclui cargo, foto ou placeholder, número em destaque, nome de urna e partido. Legenda é identificada como `VOTO DE LEGENDA`; branco e nulo são identificados como `BRANCO` e `NULO`.

**RN-062.** A partir da primeira escolha, posições vazias aparecem como não preenchidas, salvo quando a pessoa opta por gerar somente as preenchidas.

**RN-063.** A geração não envia escolhas ou imagem para a rede.

**RN-064.** Cada mudança relevante invalida o PNG preparado. Após uma espera curta, um único `Blob` em memória é reutilizado por download e compartilhamento.

**RN-065.** Web Share é habilitado somente quando o navegador suporta arquivos. Cancelar o menu não é erro; sem suporte, o download permanece disponível.

**RN-066.** A legenda de frescor do PNG usa `sourceGeneratedAt`, a geração da fonte TSE, e não `importedAt`, a importação pelo projeto.

## 8. Dados oficiais e atualização

**RN-070.** O acesso do visitante usa snapshots estáticos e não depende de consultar o TSE em tempo real.

**RN-071.** O catálogo Candidatos — 2026 informa atualização até quatro vezes ao dia. O workflow deste projeto roda diariamente às 05:23 BRT, em pushes para `main` e por execução manual.

**RN-072.** O snapshot registra origem, geração da fonte, importação, versão do pipeline, URLs, hashes e contagens verificáveis.

**RN-073.** Somente um conjunto completo e validado pode chegar ao artefato publicado.

**RN-074.** Falha de fonte, parsing, schema, pacote de fotografias, validação, teste, build ou verificação impede um novo deploy e preserva a última publicação válida.

## 9. Falhas

**RN-090.** Dado ausente, incompatível ou inválido produz um estado de erro identificável; a aplicação não inventa nem substitui por candidatura de outro cargo ou outra UF.

**RN-091.** Sem metadados oficiais válidos, a exportação oficial não é preparada.

**RN-092.** Falha de geolocalização retorna ao caminho manual sem serviço remoto alternativo.

**RN-093.** Fixtures fictícias exigem modo explícito de teste/desenvolvimento, exibem aviso inequívoco e não entram no build de produção.
