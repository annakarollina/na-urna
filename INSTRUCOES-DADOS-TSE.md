# Instruções para tratamento dos dados do TSE (Na Urna, Eleições 2026)

Rascunho v1, 20/09/2026. Para colar como `AGENTS.md`, `CLAUDE.md` ou prompt de sistema
do repositório. Vale para qualquer assistente que leia, transforme ou exporte os
arquivos `consulta_cand_2026_*.csv` e `rede_social_candidato_2026_*.csv`.

Tudo aqui foi verificado contra os arquivos reais (extração de 13/09/2026), não apenas
contra o leiame do TSE. Onde os dois discordam, o arquivo manda.

---

## 0. Antes de qualquer coisa

1. Não editar os CSVs originais. São somente leitura. Toda transformação sai em
   arquivo derivado, por pipeline reexecutável.
2. Não inventar, completar nem corrigir dado de candidatura. Campo ausente
   permanece ausente na saída.
3. Nenhuma consulta a plataformas de rede social, buscadores ou APIs para
   "confirmar" perfil, identidade ou foto. A classificação é determinística,
   feita só com o que está no arquivo.
4. Falhar alto: se uma contagem de validação (seção 9) não bater, interromper o
   build em vez de publicar parcial.

---

## 1. Como ler os arquivos

| Item | Valor |
|---|---|
| Codificação | `latin-1` (cp1252). Nunca `utf-8` |
| Separador | `;` |
| Aspas | `"` apenas em campos textuais. Numéricos vêm sem aspas |
| Fim de linha | CRLF |
| Cabeçalho | Primeira linha |

Não há `;` nem `"` dentro de nenhum campo da base atual, em nenhum dos dois
arquivos. Parser padrão com `quotechar='"'` resolve. Ainda assim, manter o
parser CSV: não usar `split(";")`.

```python
import csv
def ler(caminho):
    with open(caminho, encoding="latin-1", newline="") as f:
        return list(csv.DictReader(f, delimiter=";", quotechar='"'))
```

Em pandas: `pd.read_csv(p, sep=";", encoding="latin-1", dtype=str, keep_default_na=False)`.

**Ler tudo como texto.** Números de urna, CPF, título, `SQ_CANDIDATO` e
`CD_COR_RACA` têm zeros à esquerda ou estouram inteiro. `CD_COR_RACA` vem como
`"03"`, não `3`.

Todo texto vem em caixa alta com acentuação latin-1 (`NM_URNA_CANDIDATO`,
`DS_URL`). Caixa alta é do dado, não erro. Se o site exibir em capitalização
normal, é decisão de apresentação e precisa tratar preposições ("DE", "DOS",
"DA") e abreviações ("DR.", "PROF."). Guardar sempre o valor original.

---

## 2. Divergências entre o leiame e os arquivos de 2026

Estas quatro já foram conferidas. Não "corrigir" o dado para bater com o leiame.

1. **`AA_ELEICAO`, não `ANO_ELEICAO`.** O leiame documenta `ANO_ELEICAO` para
   `REDE_SOCIAL_CANDIDATO`, mas o cabeçalho real traz `AA_ELEICAO`. Em
   `CONSULTA_CAND` é `ANO_ELEICAO` mesmo. Os dois arquivos usam nomes
   diferentes para o mesmo campo.
2. **CPF vem preenchido.** O leiame diz que `NR_CPF_CANDIDATO` não é divulgável.
   No arquivo de 2026 há 20.940 CPFs completos, de 11 dígitos. O que veio
   suprimido foi `DS_EMAIL`: 100% dos registros trazem `"NÃO DIVULGÁVEL"`.
   Ver seção 4.
3. **`NR_TITULO_ELEITORAL_CANDIDATO` vem completo**, 12 dígitos, em 20.940
   registros.
4. **Situação do registro não existe nesta base.** `CD_SITUACAO_CANDIDATURA`
   é `-3` (`#NE`) em 100% das linhas e `CD_SIT_TOT_TURNO` é `-1` / `#NULO` em
   100%. Nenhuma inferência de deferimento a partir destes campos. Situação do
   registro só via DivulgaCandContas, em etapa separada.

---

## 3. Valores sentinela

Nunca tratar como conteúdo, nunca exibir no site, nunca somar em estatística.

| Sentinela | Texto | Numérico | Significado |
|---|---|---|---|
| Vazio no banco | `#NULO` | `-1` | Informação em branco |
| Não coletado naquele ano | `#NE` | `-3` | Campo não existia |
| Candidatura não divulgável | `NÃO DIVULGÁVEL` | `-4` | Sigilo; data de nascimento vem `""` |

Normalizar os três para nulo na ingestão, em todas as colunas, antes de qualquer
regra. Campos onde eles aparecem em massa hoje: `NM_SOCIAL_CANDIDATO` (20.885
`#NULO`), os quatro de federação (14.452 `#NULO` quando a candidatura não é
federada), e os quatro de situação (100%).

**Registros não divulgáveis:** são 3, todos em MG, PSDB, número 456
(`SQ_CANDIDATO` 130002553352, 130002553353, 130002553354). Nome civil e nome de
urna vêm preenchidos; gênero, cor/raça, grau de instrução, CPF e nascimento vêm
suprimidos. Entram na navegação como candidatura normal, com a ficha reduzida.
Nunca entram em recorte de gênero, em nenhuma direção.

---

## 4. Campos proibidos na saída

O build falha se qualquer artefato publicável (JSON, PNG, HTML, dataset) contiver:

- `NR_CPF_CANDIDATO`
- `NR_TITULO_ELEITORAL_CANDIDATO`
- `DT_NASCIMENTO` em data cheia (se precisar de idade, derivar o número inteiro
  na data da eleição e descartar a data)
- `DS_EMAIL` (é `NÃO DIVULGÁVEL` em 100% dos casos, então o campo só traz ruído)

O dado estar num portal de dados abertos não torna a republicação irrelevante:
CPF e título em arquivo estático, indexável e fácil de cruzar têm outro efeito
prático. Regra do projeto: descartar na ingestão, não na exportação. Assim o
campo não chega a existir nos derivados.

Teste automatizado sugerido: varredura por regex de 11 e 12 dígitos contíguos em
todo artefato de saída antes do deploy.

---

## 5. Chaves, joins e integridade

- **`SQ_CANDIDATO` é a única chave.** 20.943 registros, nenhum duplicado. É o
  identificador de URL, de arquivo e de cruzamento com fotografias.
- **Os arquivos por UF somam exatamente o nacional.** 27 UFs mais `BR`,
  totalizando 20.943, igual ao `_BRASIL`. Usar só o `_BRASIL` ou só as fatias.
  Misturar duplica.
- **`SG_UF = "BR"`** são as 26 candidaturas federais (13 presidenciais e 13 a
  vice), `CD_ELEICAO` 6257, `TP_ABRANGENCIA` FEDERAL. As demais 20.917 estão em
  `CD_ELEICAO` 6259, ESTADUAL. `VT` e `ZZ` não aparecem nesta base.
- **Join com redes sociais:** `SQ_CANDIDATO`, um para muitos. 18.394
  candidaturas (87,8%) têm ao menos um perfil. `NR_ORDEM_REDE_SOCIAL` vai de 1 a
  117 e só ordena a declaração; não indica plataforma nem prioridade.
- **6 `SQ_CANDIDATO` do arquivo de redes não existem no de candidaturas.**
  Provável efeito de extrações em minutos distintos (19:30:48 para redes,
  19:31:22 para candidaturas). Descartar essas linhas no join, registrar a
  contagem em log. Não criar candidatura a partir delas.

---

## 6. Cargos e a colinha

| CD_CARGO | DS_CARGO | Registros | Entra na colinha |
|---|---|---|---|
| 1 | PRESIDENTE | 13 | Sim, posição 6 |
| 2 | VICE-PRESIDENTE | 13 | Não, exibe na ficha da chapa |
| 3 | GOVERNADOR | 200 | Sim, posição 5 |
| 4 | VICE-GOVERNADOR | 208 | Não, exibe na ficha da chapa |
| 5 | SENADOR | 319 | Sim, posições 3 e 4 |
| 6 | DEPUTADO FEDERAL | 7.793 | Sim, posição 1 |
| 7 | DEPUTADO ESTADUAL | 11.277 | Sim, posição 2 (UFs) |
| 8 | DEPUTADO DISTRITAL | 432 | Sim, posição 2 (só DF) |
| 9 | 1º SUPLENTE | 344 | Não, só estatística |
| 10 | 2º SUPLENTE | 344 | Não, só estatística |

Ordem da urna, fixa: federal, estadual/distrital, senador 1, senador 2,
governador, presidente. No DF, cargo 8 no lugar do 7.

**Atenção:** vices e suplentes têm `NR_CANDIDATO` preenchido, repetindo o número
do titular. Não dá para separá-los por "tem número ou não". Filtrar sempre por
`CD_CARGO`.

### 6.1 Número de urna não é chave única

Há 167 combinações de (UF, cargo, número) com mais de um registro, envolvendo 340
candidaturas: 43 em deputado federal, 41 em estadual, 6 em governador, 5 em
senador, 1 em distrital. Em 161 dos 167 casos os homônimos de número são do
mesmo partido, o que sugere substituição de chapa ainda não refletida na
extração.

Consequências obrigatórias:

- Busca por número retorna **lista**, nunca registro único. Um "primeiro
  resultado" aqui é erro silencioso.
- A colinha guarda `SQ_CANDIDATO`, não o número digitado.
- Quando houver mais de um resultado, exibir os dois com partido e nome de urna
  e o aviso de sub judice, sem escolher por conta própria.

### 6.2 Ligação de chapa (titular, vice, suplentes)

A base não tem chave de chapa. A melhor aproximação disponível é
(`SG_UE`, `NR_CANDIDATO`, `SQ_COLIGACAO`), que resolve a maioria mas deixa 4
chaves ambíguas em governador, 4 em cada suplência e nenhuma em presidente.
Há ainda 344 conjuntos de suplentes para 319 senadores, ou seja, o desencontro
existe no dado.

Regra: montar a ligação, marcar como ambígua onde a chave repete e não exibir
vínculo nesses casos. Nunca escolher o "mais provável".

---

## 7. Gênero e o filtro de candidatas

Regras não negociáveis, herdadas da metodologia do projeto:

1. `DS_GENERO` é campo administrativo do cadastro eleitoral. Distribuição atual:
   13.597 masculino, 7.343 feminino, 3 não divulgável. Serve para estatística
   agregada e como insumo, nunca como classificação de identidade.
2. `NM_SOCIAL_CANDIDATO` é **pista para verificação humana, nunca
   classificação**. Estão preenchidos 58 registros: 45 classificados como
   femininos, 10 como masculinos e 3 não divulgáveis. (O plano registra 55, que
   é 45 mais 10; a diferença são os 3 não divulgáveis.)
3. **Proibido**: inferir identidade de gênero por comparação entre
   `NM_CANDIDATO` e `NM_URNA_CANDIDATO`, por terminação de nome, por foto, por
   heurística de nome próprio ou por qualquer modelo. Isso é mecanismo de
   outing, não de classificação.
4. Nenhuma candidatura entra ou sai do filtro sem verificação em fonte pública,
   registrada em `nome_social_2026.csv` com fonte, URL e data.
5. Fora do filtro, nenhuma marcação de gênero aparece na listagem, na ficha ou no
   PNG. Não existe filtro inverso.

Ao gerar código, a IA nunca escreve regra que derive gênero de texto. Se o
pipeline precisar de um recorte, ele lê a lista curada em arquivo. Se a lista não
existir, o filtro fica desligado e o build avisa, em vez de aproximar.

---

## 8. Redes sociais

59.987 linhas, 3.531 domínios distintos. Situação medida:

- 51.768 linhas (86,3%) começam com `http`/`https`.
- 2.062 começam com `@`.
- O resto é texto livre: `"TIKTOK: @FULANO"`, `"WWW.FACEBOOK.COM/FULANO"`,
  `"FACEBOOK: @FULANA"`, nome solto sem plataforma.
- A caixa é inconsistente: 43.307 linhas em maiúsculas, 16.680 com minúsculas.
  Normalizar para minúsculas só para classificar; preservar o original.

Classificação determinística, em três degraus, nesta ordem:

1. **URL completa** (`^https?://`): extrair o host, remover `www.`, classificar
   por domínio. Tratar como a mesma plataforma as variantes já observadas:
   `facebook.com` / `web.facebook.com` / `m.facebook.com`; `x.com` /
   `twitter.com`; `threads.com` / `threads.net`; `kwai.com` / `k.kwai.com` /
   `kwai-video.com`; `whatsapp.com` / `chat.whatsapp.com` / `wa.me`.
   Principais: instagram 17.650, facebook 12.617+, tiktok 5.679, youtube 3.339,
   x/twitter 2.503, threads 1.865, linkedin 584.
2. **Texto com plataforma nomeada**: regex conservador sobre o texto, gerando
   link, com conferência por amostra antes de publicar.
3. **Resto**: texto puro, sem link, com a nota "perfil declarado à Justiça
   Eleitoral, rede não informada".

Proibido: acessar a plataforma para testar se o perfil existe, resolver
encurtador, seguir redirecionamento, buscar nome de usuário em mecanismo de
busca. Erro assimétrico e homônimo frequente. O site declara que são canais
informados à Justiça Eleitoral, sem verificação de autenticidade pelo projeto.

Deduplicar por (`SQ_CANDIDATO`, URL normalizada) antes de exibir, mantendo a
menor `NR_ORDEM_REDE_SOCIAL`.

### 8.1 Telefone e e-mail nunca visíveis

Decisão de 20/09/2026: telefone e e-mail de candidatura nunca aparecem como
texto visível em nenhum artefato, mesmo quando declarados no campo de rede
social.

- Registro do degrau 3 que seja telefone (só dígitos e separadores, com 10 a 13
  dígitos após remover a pontuação) ou e-mail (padrão `usuario@dominio.tld`,
  após descartar prefixo `https://` espúrio) é removido na ingestão, com
  contagem em log. Na extração de 13/09 são 22 telefones e 151 e-mails.
- Link de WhatsApp com número embutido (`wa.me/<número>`,
  `api.whatsapp.com/send?phone=<número>`) continua sendo link, mas o texto
  visível é o rótulo "canal de WhatsApp declarado", nunca o número. Convite de
  grupo (`chat.whatsapp.com/<código>`) não contém número e aparece normalmente.
- Handle como `@fulana` não é e-mail: só é e-mail o que tem domínio com ponto
  depois do arroba.

---

## 9. Validação obrigatória do build

Números da extração de 13/09/2026. Divergiu, o build para.

| Verificação | Esperado |
|---|---|
| Linhas em `consulta_cand_2026_BRASIL.csv` | 20.943 |
| Colunas | 50 |
| `SQ_CANDIDATO` duplicados | 0 |
| Soma dos arquivos por UF mais BR | 20.943 |
| Linhas em `rede_social_candidato_2026_BRASIL.csv` | 59.987 |
| Colunas | 11 |
| Candidaturas com ao menos um perfil | 18.394 (87,8%) |
| `SQ_CANDIDATO` órfãos no arquivo de redes | 6 |
| `DT_GERACAO` / `HH_GERACAO` (candidaturas) | 13/09/2026 19:31:22 |
| `DT_GERACAO` / `HH_GERACAO` (redes) | 13/09/2026 19:30:48 |
| `CD_ELEICAO` | 6259 (20.917) e 6257 (26) |
| Registros não divulgáveis | 3 |
| CPF ou título em qualquer artefato de saída | 0 |

Ao trocar a extração, atualizar esta tabela na mesma commit que atualiza os CSVs,
e registrar as duas datas: geração no TSE e importação no projeto.

---

## 10. Saída: o que todo artefato precisa carregar

- Data e hora da extração no TSE, visíveis (rodapé, metadados do JSON, rodapé
  do PNG).
- Aviso de que há candidaturas sub judice e que a situação do registro não consta
  nesta base.
- Origem: Portal de Dados Abertos do TSE.

E o que nenhum artefato pode carregar:

- Telefone ou e-mail de candidatura como texto visível (seção 8.1).
- Pedido de voto, explícito ou por formulação equivalente ("vote em", "escolha
  a sua candidata", "leve na urna"). O site informa. Texto gerado por IA passa
  por essa revisão antes de entrar.
- Ordenação, destaque, badge ou ranking que favoreça candidatura, partido ou
  coligação. A ordem padrão é neutra e declarada (número de urna ou alfabética
  por nome de urna).
- Conteúdo sintético sem rotulagem, conforme art. 9º-B da Resolução TSE
  23.610/2019.

---

## 11. Quando pedir decisão humana

A IA para e pergunta, em vez de decidir sozinha, nos casos:

- Número de urna com mais de uma candidatura ativa.
- Chapa com vínculo ambíguo.
- Registro de rede social que não cai limpo em nenhum dos três degraus.
- Qualquer dúvida sobre identidade de gênero de uma candidatura.
- Divergência entre uma contagem nova e a tabela da seção 9.
