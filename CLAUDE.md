# polymarket-ladder

## Objetivo

Detector de **arbitragem de escada (ladder arbitrage)** em mercados de temperatura
máxima diária da Polymarket. Esses mercados (eventos "Highest temperature in
`<cidade>` on `<data>`?") dividem a temperatura em faixas mutuamente exclusivas
e exaustivas (ex.: `<20°C`, `20-21°C`, `21-22°C`, ..., `>35°C`). Exatamente uma
faixa resolve "Yes" e paga $1,00 por share; todas as outras resolvem "No" e
pagam $0. Logo, a soma dos preços justos ("fair value") de todas as faixas de
um mesmo evento deve ser $1,00.

A tese: quando a soma dos **melhores asks** de todas as faixas de um evento
fica abaixo de $1,00 (menos taxas/slippage), comprar 1 share "Yes" de cada
faixa trava um payout de $1,00 garantido, sem exposição à temperatura real —
lucro = $1,00 − soma dos asks. Esses eventos costumam ser "negRisk" (grupo de
mercados mutuamente exclusivos ligados via Neg Risk Adapter), o que também
pode alterar como o custo de montar a escada é calculado.

## Escopo desta fase — **IMPORTANTE**

- **NÃO executar ordens.** Nada de autenticação, chaves de API, assinatura L1/L2,
  nem `POST /order`. Só leitura de dados públicos.
- Objetivo é medir: (1) a oportunidade existe? (2) com que frequência? (3) com
  que profundidade de book (quanto dá para comprar antes do preço subir e a
  soma passar de $1,00)?
- Ainda não escrever a lógica de detecção/coleta — apenas estrutura de projeto,
  dependências e este documento de contexto.

## Estado da pesquisa de API (LEIA ANTES DE IMPLEMENTAR)

O CLOB da Polymarket migrou para o **contrato V2 em 28/abr/2026**, com breaking
changes principalmente em autenticação e criação de ordens (não deveria afetar
os endpoints de leitura pública que usaremos, mas isso não foi confirmado
diretamente — ver aviso abaixo).

**Aviso de confiabilidade**: o ambiente onde este projeto foi iniciado bloqueia
acesso de rede a qualquer domínio `*.polymarket.com` (incluindo
`docs.polymarket.com`, `clob.polymarket.com`, `gamma-api.polymarket.com`) por
política de egress. Não foi possível abrir as páginas de documentação
diretamente. As informações abaixo vêm de resultados de busca (snippets
indexados das páginas reais de `docs.polymarket.com`) e do repositório GitHub
`Polymarket/py-clob-client` (arquivado em 25/mai/2026, substituído por
`py-sdk` / `clob-client-v2`) — **não da memória de treinamento do modelo**.
Ainda assim, **antes de escrever a lógica de coleta**, abra manualmente
`docs.polymarket.com` (de uma máquina/ambiente sem esse bloqueio) e confirme:

1. Os nomes exatos dos campos da resposta de `GET /book` (abaixo é a melhor
   reconstrução disponível, mas pode haver mudanças pós-V2 não capturadas).
2. Se `GET /price` e `GET /midpoint` continuam públicos e sem autenticação.
3. O rate limit atual de cada endpoint (valores abaixo podem estar defasados).
4. Como o campo `negRisk`/`neg_risk` aparece exatamente em evento vs. mercado
   vs. order book, e se afeta o cálculo da soma de preços (conversão via Neg
   Risk Adapter pode mudar a interpretação de "custo para montar a escada").

### APIs e endpoints candidatos (fase 1 — somente leitura, sem chave)

**Gamma API** — `https://gamma-api.polymarket.com` (pública, sem autenticação)
Descoberta de eventos/mercados.
- `GET /events` — listar eventos (filtrar por tag/slug de temperatura, `active`,
  `closed`).
- `GET /markets` — listar mercados individuais (cada faixa de temperatura é um
  mercado binário dentro do evento).
- `GET /markets/{id}` — detalhe de um mercado.
- Campos relevantes esperados: `conditionId`/`condition_id`, `clobTokenIds`
  (array JSON com os token IDs do CLOB, um por outcome), `outcomes`, `negRisk`,
  `active`, `closed`, `archived`, `accepting_orders`, `enable_order_book`,
  `start_date`, `end_date`.

**CLOB API V2** — `https://clob.polymarket.com` (endpoints de leitura são
públicos; autenticação só é necessária para ordens, que não usaremos nesta
fase)
- `GET /book?token_id=<asset_id>` — order book de um outcome específico.
  Campos esperados: `market`, `asset_id`, `timestamp`, `hash`, `bids` (lista
  price/size, ordenado desc.), `asks` (lista price/size, ordenado asc.),
  `min_order_size`, `tick_size`, `neg_risk`, `last_trade_price`.
- `POST /books` — order books em lote (múltiplos `token_id` em uma chamada) —
  preferível para reduzir número de requisições ao coletar uma escada inteira.
- `GET /price?token_id=...&side=...` — melhor preço.
- `GET /midpoint?token_id=...` — ponto médio do book.
- Mudanças conhecidas da migração V2: `chainId` → `chain`; headers
  `POLY_BUILDER_*` removidos (autenticação de ordens); `feeRateBps`, `nonce`,
  `taker` deixaram de ser configuráveis pelo cliente; nenhuma mudança
  documentada nos endpoints de leitura pública — **a confirmar**.
- Rate limits observados (podem estar desatualizados): `/book` ~5 req/s,
  `/price` ~10 req/s, por IP, via throttling da Cloudflare (fila, não rejeição
  imediata).

**Data API** — `https://data-api.polymarket.com` (pública) — posições, trades,
histórico. Provavelmente não necessária na fase 1 (não precisamos de dados de
usuário), mas pode servir para validar trades executados vs. book observado.

### O que NÃO vamos usar nesta fase

- SDKs oficiais (`py-clob-client` está arquivado; `py-clob-client-v2`/`py-sdk`
  trazem autenticação e lógica de ordem que não precisamos). Prefer chamadas
  HTTP diretas via `httpx`, mantendo a superfície de dependências mínima e
  evitando gerenciamento de chaves.
- Qualquer endpoint autenticado (L1/L2, API key/secret/passphrase).

## Estrutura do projeto

```
polymarket-ladder/
├── CLAUDE.md
├── pyproject.toml
├── requirements.txt
├── .gitignore
├── src/polymarket_ladder/
│   ├── __init__.py
│   ├── config.py        # configuração (URLs base, intervalos de polling, etc.)
│   ├── clients/          # clientes HTTP para Gamma API e CLOB API (somente leitura)
│   ├── models/           # dataclasses/pydantic: Event, Market, OrderBook, Quote
│   ├── collectors/        # polling periódico de books e persistência de snapshots
│   ├── detectors/         # cálculo da soma dos asks vs. $1,00 e profundidade
│   └── storage/           # gravação dos snapshots coletados (parquet/sqlite)
├── scripts/               # entrypoints de linha de comando
├── tests/
└── data/                  # snapshots coletados localmente (gitignored)
```

Nenhum desses módulos tem lógica ainda — apenas `__init__.py` vazios/placeholder
até a próxima fase.

## Próximas fases (fora de escopo agora)

1. Implementar cliente Gamma para descobrir eventos de temperatura ativos.
2. Implementar cliente CLOB para buscar order books de todas as faixas de um
   evento (via `POST /books` em lote).
3. Detector: somar melhores asks, comparar com $1,00, registrar profundidade
   disponível em cada nível de preço.
4. Coleta periódica + persistência de séries temporais dessas métricas.
5. (Fase futura, não agora) Execução de ordens — exigirá revisão de segurança,
   gestão de chaves e testes com capital mínimo.
