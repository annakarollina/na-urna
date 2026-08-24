# Minha Colinha

[Acessar a aplicação](https://predocampos.github.io/minha-colinha/)

Aplicação web aberta e auditável para montar uma colinha das Eleições Gerais de 2026 com dados oficiais e exportá-la como imagem no próprio dispositivo.

## Problema

A votação de 2026 reúne seis posições em uma ordem definida, incluindo duas escolhas distintas para o Senado. A Minha Colinha ajuda a localizar candidaturas da UF, revisar números e gerar uma referência visual sem criar conta ou entregar as escolhas a um servidor de aplicação.

## Confiança e privacidade

As escolhas ficam somente na memória da página e desaparecem ao recarregar ou fechar. A composição e o PNG são gerados no navegador; não há analytics, conta, banco de colinhas ou parâmetros de URL com intenção de voto. A geolocalização é opcional: as coordenadas são comparadas localmente com uma malha do IBGE e a UF sugerida precisa ser confirmada.

Como em qualquer site estático, o GitHub Pages e sua CDN podem manter logs técnicos das requisições. Os caminhos dos arquivos podem tornar a UF e o interesse por determinados arquivos inferíveis, mas a aplicação não envia um registro da colinha nem instrumenta seleções. Os limites completos estão no [modelo de privacidade e confiança](docs/privacy-and-trust-model.md).

## Como funciona

1. A pessoa confirma a UF manualmente ou aceita uma sugestão local por geolocalização.
2. O navegador carrega os arquivos oficiais necessários para os cargos daquela UF e para Presidente.
3. Busca, filtros e escolhas funcionam localmente, em ordem neutra e sem persistência.
4. A revisão preserva a ordem oficial e permite baixar ou compartilhar um PNG gerado por Canvas.

## Arquitetura

```text
TSE / IBGE → GitHub Actions → pipeline validado → snapshot estático → GitHub Pages
                                                                       ↓
                    PNG / Web Share ← Canvas ← escolhas em memória ← navegador
```

A publicação é atômica: falhas de download, interpretação, validação, testes, build ou verificação impedem um novo deploy, mantendo disponível a última versão válida. Veja a [arquitetura](docs/architecture.md) e o [pipeline TSE](docs/tse-data-pipeline.md).

## Tecnologias e motivos

- **TypeScript** mantém explícitos os contratos eleitorais e de dados.
- **Preact** oferece componentes declarativos com bundle pequeno.
- **Vite** fornece desenvolvimento e build estático com base compatível com GitHub Pages.
- **Canvas e Web Share nativos** geram e entregam a imagem sem serviço de renderização.
- **Vitest e Playwright** cobrem domínio, componentes e fluxos reais em Chromium e WebKit.
- **GitHub Actions e Pages** executam o pipeline e publicam o site sem backend de negócio.

## Dados eleitorais

O pipeline usa o conjunto oficial [Candidatos — 2026](https://dadosabertos.tse.jus.br/dataset/candidatos-2026), do TSE, incluindo dados de candidaturas, situações e fotografias. O catálogo informa atualização até quatro vezes ao dia. Este projeto atualiza o snapshot diariamente às 05:23 BRT e também em pushes para `main` ou execução manual.

Os metadados publicados distinguem quando os arquivos de origem foram gerados pelo TSE (`sourceGeneratedAt`) de quando foram importados pelo projeto (`importedAt`). O PNG apresenta a data de geração da fonte. A transformação completa, códigos aceitos, associação das fotos, atomicidade e hashes estão documentados no [pipeline TSE](docs/tse-data-pipeline.md).

## Limitações e decisões conscientes

- somente as Eleições Gerais de 2026 estão configuradas;
- recarregar ou fechar a página apaga as escolhas;
- pode haver atraso entre uma atualização do TSE e o próximo snapshot diário do projeto;
- se o pipeline falhar, permanece publicada a última versão válida;
- requisições estáticas podem revelar a UF e interesse por arquivos ou fotos ao provedor de hospedagem;
- compartilhamento direto depende do suporte do navegador a Web Share com arquivos; o download continua disponível.

## Desenvolvimento local

Requer Node.js 20.19 ou mais recente.

```bash
npm ci
npm run data:tse
npm run dev
```

`npm run data:tse` baixa e valida o snapshot oficial. Para usar ZIPs oficiais já obtidos, execute `npm run data:tse -- --input-dir <diretório>`. `npm run check` executa tipos, lint, testes e build; `npm run test:e2e` executa os fluxos de navegador após a instalação do Chromium e WebKit pelo Playwright.

As fixtures em `public/data/development-fixtures/` são fictícias, usadas apenas em desenvolvimento e testes, e excluídas do build de produção.

## Documentação

- [Índice da documentação](docs/README.md)
- [Arquitetura](docs/architecture.md)
- [Regras de negócio](docs/business-rules.md)
- [Modelo de privacidade e confiança](docs/privacy-and-trust-model.md)
- [Pipeline de dados do TSE](docs/tse-data-pipeline.md)
- [Decisões arquiteturais](docs/adr/README.md)
- [Política de segurança](SECURITY.md)

## Independência e atribuições

A Minha Colinha é um projeto independente, não oficial e sem vínculo ou endosso do TSE ou do IBGE. Dados eleitorais, fotografias e limites territoriais preservam as condições de suas fontes; detalhes e proveniência estão em [ATTRIBUTIONS.txt](public/ATTRIBUTIONS.txt).

## Licença

O código é distribuído sob a [licença MIT](LICENSE). A licença do código não relicencia os dados e artefatos de terceiros.
