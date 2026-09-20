# ESTILO.md — Na Urna

Briefing visual e contrato de dados. Vale para qualquer pessoa ou assistente que
gere código para este repositório. Ler junto com `INSTRUCOES-DADOS-TSE.md` e
`plano.md`.

Referência visual: `prototipo/na-urna-arcade.html`. Quando este documento e o
protótipo discordarem, o protótipo manda.

---

## 0. O que NÃO fazer

1. **Nunca gerar candidatura fictícia.** Nada de "MARINA EXEMPLO", nada de
   número inventado, nem em teste, nem em demonstração. Se faltar dado, a tela
   mostra estado vazio. Candidatura inventada em artefato eleitoral é risco, não
   protótipo.
2. **Nunca inventar identidade visual.** Os tokens da seção 2 são a paleta
   inteira. Não acrescentar cor, sombra difusa, canto arredondado ou gradiente.
3. **Nunca escrever pedido de voto**, explícito ou por formulação equivalente:
   "vote em", "escolha a sua candidata", "leve na urna", "digite na urna".
   O rótulo do número é "NUMERO NA URNA", descritivo.
4. **Nunca derivar gênero de texto.** Sem heurística de nome, terminação, foto
   ou modelo. O recorte vem da lista curada em arquivo.
5. **Nunca acessar plataforma de rede social** para testar perfil, resolver
   encurtador ou seguir redirecionamento.
6. **Nunca publicar CPF, título eleitoral, e-mail ou data de nascimento cheia.**
   Descartados na ingestão. O build falha se aparecerem na saída.
7. **Nunca ordenar por relevância, alfabeto ou qualquer critério que favoreça
   candidatura.** Ordem sorteada por sessão, declarada no rodapé.

---

## 1. Tipografia

Duas famílias, do Google Fonts, carregadas com `display=swap`:

```html
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Pixelify+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
```

| Uso | Família | Tamanho |
|---|---|---|
| Números de urna, siglas de UF, rótulos curtos, botões de ação | Press Start 2P | 9 a 46px |
| Títulos, nomes, corpo, tudo o mais | Pixelify Sans | 14 a 34px |

**Press Start 2P não cobre acentuação com segurança.** Só usar em texto sem
acento e sem cedilha. Título com acento vai em Pixelify Sans 700, com
`text-shadow:3px 3px 0 var(--traco)`.

Corpo em 17 a 18px. Fonte pixelada abaixo disso fica ilegível em celular.

---

## 2. Cor

Tokens em `:root`, com variante clara em `prefers-color-scheme: light` e
sobrescrita explícita em `[data-theme]`. Nada de cor solta no CSS.

```css
/* arcade noturno, padrão */
--fundo:#150E2A; --painel:#241640; --painel2:#1B1033;
--texto:#F4ECFF; --apagado:#9C8CC4;
--neon:#FF3D9A; --ciano:#2BE7E0; --amarelo:#FFD23F; --roxo:#8B5CF6;
--traco:#000000; --sombra:#000000; --scan:rgba(0,0,0,.22);

/* claro, mesma estrutura, ar de fanzine */
--fundo:#FFF4E6; --painel:#FFFFFF; --painel2:#FFE8CC;
--texto:#1A0F2E; --apagado:#6B5A86;
--neon:#E01E7B; --ciano:#0FA8A2; --amarelo:#F5A800; --roxo:#6D28D9;
--traco:#1A0F2E; --sombra:#1A0F2E; --scan:rgba(26,15,46,.06);
```

Papéis fixos: `--amarelo` é sempre número de urna. `--ciano` é sempre metadado
(partido, cargo, contagem). `--neon` é sempre ação. `--apagado` é sempre texto
secundário e estado vazio.

**Nenhuma cor carrega significado político.** Sem verde e amarelo de bandeira,
sem cor de partido, sem vermelho contra azul. Cor de fundo de card nunca varia
por candidatura, partido ou gênero.

---

## 3. Forma

- `border: 3px solid var(--traco)` em tudo que é superfície.
- `box-shadow: 4px 4px 0 var(--sombra)`, deslocamento duro, `blur` zero.
- `border-radius: 0` em absolutamente tudo.
- Toque: `transform: translate(-2px,-2px)` com sombra 7px no hover,
  `translate(2px,2px)` com sombra 2px no active, transição
  `.06s steps(2)`. Desligado em `prefers-reduced-motion`.
- Scanlines de CRT: pseudo-elemento fixo em `body::before`,
  `repeating-linear-gradient` de 3px transparente e 1px `--scan`,
  `pointer-events:none`, `z-index` alto.
- `:focus-visible { outline: 3px solid var(--amarelo); outline-offset: 3px }`.
- Largura máxima de conteúdo 640px, uma coluna, mobile-first.
- `viewport-fit=cover` mais `env(safe-area-inset-*)` em `:root` e em qualquer
  elemento fixo.

---

## 4. Telas e componentes

Fluxo: **mapa → colinha → coleção → ficha → colinha → imagem**.

1. **Mapa.** SVG da malha do IBGE rasterizada em grade de 46x48, um `<g>` por
   UF com `data-uf`, `role="button"` e `tabindex="0"`. Contorno preto só onde
   muda de estado. Quatro cores, sem repetir entre vizinhos. Abaixo, lista das
   27 UFs com contagem, que é o caminho acessível e o único viável para DF, SE
   e AL no celular. Nunca substituir o mapa por grade de quadrados.
2. **Colinha.** Seis posições na ordem da urna: federal, estadual ou distrital,
   Senado vaga 1, Senado vaga 2, governo, presidência. Posição vazia com borda
   tracejada. Posição preenchida com número, nome de urna, partido e botão de
   tirar. Barra de progresso dos seis votos no topo.
3. **Coleção.** Lista do cargo da posição, com busca, filtro de partido, filtro
   opcional de cor/raça atrás de "mais filtros" e a chave "só candidaturas de
   mulheres". Cada linha tem dois alvos: corpo abre a ficha, botão OK escolhe
   direto. Paginação por botão, 60 e depois 120.
4. **Ficha.** Número como placar, o maior elemento da tela. Nome de urna,
   partido, cargo, UF, cor/raça, redes declaradas, link para o
   DivulgaCandContas. Botão de colocar na colinha quando vier de uma posição.
5. **Imagem.** PNG 1080x1350 gerado por Canvas, seis posições na ordem oficial,
   data da extração e aviso de sub judice no rodapé da imagem. Exibir na página
   para salvar com toque longo. Botão diz "baixar", nunca "compartilhar".

### Estados obrigatórios

Vazio, carregando e erro em toda lista. Nada de tela branca. Estado vazio usa
`--apagado` e diz o que fazer.

---

## 5. Contrato de dados

O front nunca lê CSV. Consome JSON gerado pelo pipeline.

```js
{
  geracao: "13/09/2026 19:31:22",     // data e hora da extração no TSE
  importado: "2026-09-14T12:00:00Z",  // quando o projeto importou
  cargos: ["Deputado federal","Deputado estadual","Deputado distrital",
           "Senador","Governador","Presidente"],
  plats:  ["Instagram","Facebook","TikTok","YouTube","X","Threads",
           "LinkedIn","Kwai","WhatsApp"],
  pref:   { "0": "https://www.instagram.com/", ... },  // prefixo por plataforma
  fora:   { vices: 221, suplentes: 688 },
  itens: [
    [ uf, cargoIdx, numero, nomeUrna, nomeCompleto, partido, corRaca,
      redes, oficial, ehCandidata ]
  ]
}
```

- `redes`: lista de `[platIdx, resto]`. `platIdx >= 0` vira link, montado como
  `pref[platIdx] + resto`. `platIdx === -1` é texto puro, exibido sem link, com
  a nota "perfil declarado à Justiça Eleitoral, rede não informada".
- `oficial`: sufixo para
  `https://divulgacandcontas.tse.jus.br/divulga/#/candidato/2026/{oficial}`.
- `ehCandidata`: 1 ou 0. **Vem da lista curada**, não de `DS_GENERO` sozinho.
  Enquanto a curadoria não estiver pronta, o filtro fica desligado e o build
  avisa, em vez de aproximar.
- Chave única é `SQ_CANDIDATO`. Número de urna **não** é chave: busca por número
  devolve lista, sempre.
- Produção carrega um JSON por UF sob demanda, mais um índice de busca reduzido.
  Carregar o país inteiro de uma vez são 4 MB e não serve para celular fraco.

Não entram no JSON: vice, 1º e 2º suplente, CPF, título eleitoral, e-mail e data
de nascimento.

---

## 6. Texto

- Tom direto e funcional. Sem prosa cerimoniosa.
- **Sem travessão em nenhum texto de interface.**
- Cargo em linguagem neutra na colinha: "Deputada ou deputado federal".
- Rodapé em toda tela, com data da extração, aviso de sub judice, ausência de
  persistência, ressalva sobre perfis declarados, ordem sorteada e declaração de
  independência e suprapartidarismo.
- Conteúdo gerado por IA, se houver, rotulado conforme o art. 9º-B da Resolução
  TSE 23.610/2019.

---

## 7. Acessibilidade

- Contraste mínimo 4.5:1 para texto. Conferir principalmente `--apagado` sobre
  `--painel2`.
- Alvo de toque mínimo de 44px.
- `prefers-reduced-motion` desliga transição, `transform` e o piscar.
- Navegação completa por teclado, incluindo os estados do mapa.
- `aria-label` com nome do estado e contagem em cada UF do mapa.
- Nenhuma informação transmitida só por cor.
