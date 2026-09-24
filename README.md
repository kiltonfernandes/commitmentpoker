# Commitment Poker

Uma página estática que documenta a metodologia de **Planning Poker por compromisso e mediana**. O projeto torna visíveis as regras de estimativa, os casos de divergência e os critérios para chegar a uma pontuação que o time consiga sustentar durante a sprint.

[Ver a metodologia completa](https://app.notion.com/p/3e5195bb0be8812199e8f42d963cceea?pvs=204)

## Propósito

Estimativas costumam perder qualidade quando os pontos representam apenas uma impressão geral de esforço ou uma tradução aproximada de tempo. Nesta proposta, cada carta comunica uma condição de entrega concreta.

A pergunta durante a votação passa a ser: **“Eu consigo sustentar a mensagem desta carta para esta história completa, até Done?”**

Isso aproxima a estimativa do trabalho que realmente precisa acontecer: implementação, testes, cenários alternativos, validações, integrações, capacidade da sprint e dependências.

## Princípios

- Toda pessoa envolvida vota a mesma história, pensando na entrega completa.
- Dev, QA e demais participantes não produzem estimativas que depois serão somadas.
- A carta escolhida precisa ser defendida por condições observáveis.
- A mediana pode fechar uma votação próxima, mas não substitui uma conversa quando há sinais incompatíveis.
- Os votos 13 e 21 representam situações que exigem verificação explícita antes do fechamento.

## Escala de compromisso

| Carta | Declaração de compromisso |
| --- | --- |
| **1** | Consigo trabalhar nesta história em paralelo com outra. |
| **2** | Consigo entregar esta história e ainda assumir uma maior na mesma sprint. |
| **3** | Sabemos implementar, porém há vários cenários que aumentam o trabalho necessário para concluir a história. |
| **5** | Consigo entregar esta história e ainda assumir uma menor na mesma sprint. |
| **8** | A história exige uma pessoa durante a sprint inteira. |
| **13** | A história exige uma pessoa durante a sprint inteira e também depende de trabalho de outro time. |
| **21** | O time não consegue assumir a entrega desta história na sprint atual. |

As cartas representam uma escala ordinal: `1 → 2 → 3 → 5 → 8 → 13 → 21`. A distância entre as posições da escala importa mais do que a diferença numérica.

## Roteiro da votação

1. Ler a história e esclarecer seu critério de aceite.
2. Cada participante escolhe uma carta em silêncio.
3. Revelar os votos simultaneamente.
4. Ordenar os votos.
5. Localizar a mediana.
6. Verificar a distância entre o menor e o maior voto.
7. Examinar se existe uma diferença relevante entre disciplinas, especialmente Dev e QA.
8. Fechar a pontuação ou discutir as condições apontadas pelos extremos.
9. Realizar uma nova votação quando a discussão revelar uma divergência crítica.

## Regra da mediana

A mediana define o resultado somente quando os votos não apresentam uma divergência crítica.

### Quantidade ímpar de votos

Usa-se o valor central depois de ordenar os votos.

```
2 | 3 | 3 | 3 | 5
mediana = 3
```

### Quantidade par de votos

Quando o centro estiver entre duas cartas, usa-se a carta imediatamente superior, para preservar as opções existentes da escala.

| Votos centrais | Resultado |
| --- | --- |
| 2 e 3 | 3 |
| 3 e 5 | 5 |
| 5 e 8 | 8 |

## Divergência crítica

Uma diferença de **uma carta adjacente** pode ser absorvida pela mediana:

- 1 ↔ 2
- 2 ↔ 3
- 3 ↔ 5
- 5 ↔ 8

Uma distância de **duas ou mais posições** exige discussão e uma nova votação:

- 1 ↔ 3
- 2 ↔ 5
- 3 ↔ 8
- 1 ↔ 8

As pessoas nos extremos explicam o que as levou ao voto: cenários, dependências, capacidade já comprometida, necessidade de trabalho paralelo, validações ou uma condição concreta que afete a entrega.

## Leitura entre Dev e QA

A mediana geral pode mascarar uma percepção muito diferente de uma disciplina.

| Votos | Mediana geral | Tratamento |
| --- | --- | --- |
| Dev: 1, 1, 1 · QA: 8, 8 | 1 | Não fechar automaticamente. QA precisa explicar a condição que exige a sprint inteira. |
| Dev: 3, 3, 3 · QA: 5, 5 | 3 | A diferença é adjacente; a mediana pode ser aceita se o 3 continuar defensável. |
| Dev: 5, 5, 5 · QA: 2, 2 | 5 | Confirmar a leitura de QA. Se a carga de validação for pequena, 5 permanece uma estimativa coerente. |

A intenção é preservar a história como unidade de estimativa, sem permitir que um grupo inteiro tenha sua percepção ignorada por uma regra estatística.

## Tratamento de 13 e 21

### Voto 13

O grupo confirma obrigatoriamente:

- Há dedicação integral de uma pessoa na sprint?
- Há trabalho necessário de outro time para a história chegar a Done?

As duas condições precisam estar presentes.

### Voto 21

O grupo identifica por que a história não cabe na sprint e registra qual mudança permitiria uma nova estimativa: recorte de escopo, decomposição, remoção de dependência, decisão pendente ou outra condição de viabilidade.

## Exemplos de resultado

| Votos | Resultado |
| --- | --- |
| 3, 3, 3, 3, 3 | 3 |
| 3, 3, 3, 5, 5 | 3, salvo uma condição nova na conversa |
| 2, 2, 3, 5, 5 | Discussão obrigatória e nova votação |
| Dev: 1, 1, 1 · QA: 8, 8 | Discussão obrigatória antes de pontuar |

## O site

A página principal oferece:

- Explicação visual de cada carta.
- Roteiro resumido da sessão de Planning Poker.
- Regra da mediana e do arredondamento para quantidade par de votos.
- Alertas sobre divergência crítica e leitura entre Dev e QA.
- Simulador interativo para testar conjuntos de votos.

O site foi construído como um único arquivo estático, para facilitar o compartilhamento e evitar dependências de instalação.

## Estrutura do repositório

```text
.
├── index.html      # Página, estilos e simulador
├── vercel.json     # Configuração de publicação e cabeçalhos HTTP
└── README.md       # Documentação do projeto
```

## Execução local

Nenhuma instalação é necessária. Abra `index.html` diretamente no navegador ou rode um servidor HTTP simples:

```bash
npx serve .
```

Depois, acesse o endereço mostrado no terminal.

## Publicação na Vercel

1. Entre em [vercel.com](https://vercel.com) e escolha **Add New → Project**.
2. Importe `kiltonfernandes/commitmentpoker`.
3. Selecione o preset **Other**.
4. Deixe **Build Command** e **Output Directory** em branco.
5. Clique em **Deploy**.

A Vercel entrega `index.html` diretamente. O arquivo `vercel.json` já inclui URLs limpas e dois cabeçalhos básicos de segurança.

## Manutenção

O conteúdo da metodologia aparece em `index.html`. Ao alterar regras, exemplos ou mensagens das cartas:

1. Atualize a seção correspondente da página.
2. Confirme que a escala, os exemplos e o simulador continuam coerentes entre si.
3. Abra a página em tela pequena e em tela grande.
4. Faça o commit e envie para a branch publicada pela Vercel.

## Fonte

A versão consolidada da metodologia está registrada no Notion:

- [Metodologia de Planning Poker por Compromisso e Mediana](https://app.notion.com/p/3e5195bb0be8812199e8f42d963cceea?pvs=204)


## Regras implementadas na plataforma

A interface aplica as regras da metodologia durante a votação de cada cartão.

1. A pessoa escolhe uma carta.
2. Antes do voto ser registrado, abre-se uma confirmação de compromisso.
3. A confirmação apresenta uma pergunta diferente para estimular a conversa do time; existem 80 variações por carta antes de qualquer repetição.
4. A pessoa confirma a carta após a conversa ou pode pular aquele item.
5. Para 13, a pessoa confirma dedicação integral de uma pessoa na sprint e trabalho necessário de outro time.
6. Para 21, a pessoa confirma que o grupo discutiu a inviabilidade e a condição para voltar a estimar a história.
7. O host vê todos os votos recebidos, mas o grupo só os vê após o comando **Reveal votes**.
8. O resultado avalia os votos já recebidos:
   - presença de 13 ou 21: discussão obrigatória;
   - extremos separados por duas ou mais posições na escala regular: discussão obrigatória;
   - diferença forte entre votos de Dev e QA: discussão obrigatória;
   - sem essas condições: exibição da mediana provisória.

As perguntas servem como ponto de partida para a conversa do grupo; a plataforma registra a carta confirmada e as confirmações especiais de 13 e 21.

## Fluxos disponíveis

### Host session

1. A pessoa informa nome e perspectiva principal.
2. O sistema gera um código de seis caracteres.
3. O código pode ser copiado para a área de transferência.
4. Na sala, o host informa um item por linha.
5. Cada linha gera um cartão independente, pronto para votação.

### Join session

1. A pessoa informa nome, código da sessão e perspectiva principal.
2. Ela entra como participante.
3. Cada cartão mostra as cartas 1, 2, 3, 5, 8, 13 e 21.
4. A carta selecionada abre uma pergunta de compromisso antes da confirmação ou do salto do item.

## Sigilo e revelação dos votos

Enquanto a rodada está fechada, cada participante vê somente a própria carta. O host vê o nome e a carta de cada pessoa, podendo conferir a participação antes de revelar. Ao selecionar **Reveal votes**, os votos individuais e o resultado do cartão passam a ficar visíveis para toda a sessão.

## Demonstração guiada

A tela inicial inclui o acesso discreto **Ver uma demonstração da metodologia**. Ele percorre seis telas explicando compromisso, perguntas rotativas, tratamento de 13 e 21, votos fechados, revelação e mediana.

## Estado atual e próxima camada técnica

A página está pronta para publicação como site estático na Vercel. O fluxo de telas, os cartões, a confirmação de voto e a aplicação das regras funcionam no navegador.

A conexão de uma mesma sessão entre dispositivos ainda pede uma fonte de dados compartilhada. Uma implementação posterior pode usar Vercel KV, Postgres, Supabase ou outro serviço de persistência, com uma rota para criar sessões, outra para entrar e uma atualização em tempo real dos cartões e votos. As regras de validação já estão organizadas no navegador e podem ser movidas para essa camada de servidor para manter o mesmo comportamento para todo o time.
