# Commitment Poker

Aplicação de Planning Poker por compromisso e mediana. O host cria uma sessão, compartilha um código de seis caracteres e inclui histórias, uma por linha. Pessoas em outros navegadores entram com nome e código, votam, pulam um cartão ou reveem a carta antes de confirmar. A sessão fica no Upstash Redis sem prazo de expiração configurado, até o host excluí-la.

**Versão: v0.6.3**

[Abrir a aplicação](https://commitmentpoker.vercel.app/) · [Ler a metodologia original](https://app.notion.com/p/3e5195bb0be8812199e8f42d963cceea?pvs=204)

## Regras das cartas

| Carta | Compromisso |
| --- | --- |
| 1 | Consigo trabalhar nesta história em paralelo com outra. |
| 2 | Consigo entregar a história e ainda assumir uma maior nesta sprint. |
| 3 | Sabemos implementar, mas há vários cenários que ampliam o trabalho. |
| 5 | Consigo entregar a história e ainda assumir uma menor nesta sprint. |
| 8 | A história exige uma pessoa durante a sprint inteira. |
| 13 | Exige uma pessoa durante a sprint inteira e trabalho de outro time. |
| 21 | O time não consegue assumir a entrega nesta sprint. |

Ao escolher uma carta, a pessoa vê a mensagem correspondente e uma pergunta de compromisso. O banco de perguntas combina oito formulações com dez assuntos por carta, oferecendo 80 perguntas por carta antes de repetir dentro da aba atual. A pessoa confirma com **Sim, é isso mesmo**, escolhe **Quero rever a carta** ou usa **Pular voto** no cartão. Não há campo para justificativa escrita. A carta 13 exige confirmar dedicação integral e dependência de outro time; a 21 exige confirmar a discussão sobre inviabilidade.

## Votação e visibilidade

- Enquanto o cartão está fechado, o participante recebe do servidor apenas o próprio voto e não vê os votos, a contagem nem a mediana dos demais.
- O host recebe todos os votos e decide quando usar **Reveal votes**. Então todos passam a receber os votos individuais e o resultado do cartão.
- Votos pulados aparecem como **Pulou** e não entram no cálculo da mediana.
- Se votos regulares extremos estiverem separados por duas ou mais posições em `1, 2, 3, 5, 8`, a rodada é interrompida e revelada automaticamente para que a história e as mensagens dos extremos sejam discutidas. O host pode iniciar outra rodada.
- Sem divergência crítica, a mediana é a carta central da lista ordenada; com quantidade par, é usada a carta central superior. Os votos 13 e 21 exigem discussão específica antes do fechamento.
- O host pode adicionar ou remover cartões e excluir a sessão inteira. A exclusão remove os dados compartilhados do Redis.

## Testar sozinho com demandas e participantes mock

Na sala do host, **Gerar nova demanda** cria imediatamente um cartão pronto para votação. O catálogo local contém 36 histórias fictícias de um aplicativo de car sharing para pets e evita repetições dentro da mesma sessão. É possível continuar escrevendo demandas próprias, uma por linha.

**Add mock participant** cria na sessão um participante de teste chamado `Tutor de pet (mock) 1`, depois `2`, `3` e assim por diante. Ao criar, a tela passa para a visão desse participante. O seletor **Alternar visão** permite voltar ao host ou assumir qualquer participante mock criado naquele navegador. Cada mock vota, pula e vê resultados com as mesmas permissões de um participante comum; o host pode revelar as cartas. Os mocks são membros da sessão compartilhada e seus votos aparecem aos demais após a revelação. A identidade de cada um fica salva no navegador em que foi criada. A sessão aceita até 1000 membros por limite técnico.

## Capacidade, responsáveis e exportação

Um resumo da capacidade de **todas as pessoas** fica visível na sala durante toda a sessão, para host e participantes. O botão **Capacidade** abre os detalhes de todos, inclusive as histórias atribuídas. O host configura o nome do projeto e da sprint, e associa um **Dev** e um **QA** a cada história. As opções exibem as pessoas que entraram com a perspectiva correspondente. A associação pode ser alterada ou removida apenas pelo host. Participantes consultam os dados da equipe, sem controles de edição.

O resumo no topo da sala é clicável. Ele mostra pontos usados e restantes de cada participante e abre um painel com a capacidade detalhada, histórias pontuadas vinculadas a cada pessoa e histórias ainda aguardando pontuação.

A referência é sempre **8 pontos por participante**. A mediana válida e revelada de uma história soma integralmente à capacidade do Dev e à do QA atribuídos. Votos ainda fechados, histórias sem votos, com divergência crítica ou com carta 13/21 pendente de discussão não somam pontos. Atribuições acima de 8 são permitidas e geram um alerta para a pessoa afetada na sala e no painel, além de sinalização para o host.

O botão **Exportar DOCX**, visível ao host, cria um relatório Word com projeto, sprint, código, datas, participantes, perspectivas, capacidade individual, histórias, responsáveis, decisão, pontuação, votos por participante e verificações das cartas 13 e 21. O arquivo inclui rodadas atuais e anteriores preservadas a partir desta versão. O fuso das datas exportadas é o de Brasília. O relatório não inclui tokens de acesso. Discussões verbais não são registradas; cartões removidos e rodadas encerradas antes desta versão não podem ser reconstruídos.

Após revelar votos sem divergência crítica, o host decide entre **Confirmar pontuação** ou **Votar novamente**. A confirmação move a história para **Histórias pontuadas**, onde o host associa Dev e QA. Somente histórias confirmadas ocupam capacidade. Mesmo depois de confirmada, o host pode usar **Votar novamente** na própria história: os votos são arquivados, a história retorna para votação e deixa de consumir capacidade até uma nova confirmação.

Quando houver divergência crítica, a interface revela todos os votos e destaca em vermelho os extremos que interromperam a rodada. O host pode **Votar novamente** ou usar **Seguir com pontuação**, escolhendo explicitamente uma carta para encerrar a história. A decisão fica registrada como pontuação confirmada pelo host.

A página inicial mantém a mão de cartas interativa. O botão de demonstração foi removido.

Ao abrir o endereço, a aplicação começa na página inicial. Sessões salvas ficam disponíveis em uma lista para retomada manual. Na sala, participantes votam usando uma mão visual de cartas em cada história; o host apenas conduz a rodada e revela os votos.

## Estrutura

```text
index.html             Interface, estilos, cartas e perguntas
api/session.mjs        API de sessão na Vercel, com Upstash Redis
api/export.mjs         Geração de relatório DOCX acessível apenas ao host
package.json           Dependência docx e versão do projeto
test/session.test.js   Teste da API e das regras de sigilo
vercel.json            Configuração HTTP para a Vercel
README.md              Documentação
```

Sem framework nem build. A Vercel instala a dependência `docx`, entrega `index.html` e executa as funções em `api/`. O servidor guarda os tokens de acesso e conversa com o Redis; o navegador chama `/api/session` e, para o host, `/api/export`.

## Configurar na Vercel

1. Importe este repositório como projeto com preset **Other**. Deixe Build Command e Output Directory em branco.
2. Em **Storage → Marketplace → Upstash for Redis**, crie um banco e conecte-o ao projeto `commitmentpoker` em **All Environments**.
3. Com o prefixo `UPSTASH`, a integração costuma criar `UPSTASH_KV_REST_API_URL` e `UPSTASH_KV_REST_API_TOKEN`. A API também aceita `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` e `KV_REST_API_URL`/`KV_REST_API_TOKEN`. O par URL + token precisa corresponder ao mesmo banco.
4. Faça um novo deploy após conectar a integração ou após enviar este commit para `main`. Não coloque tokens no GitHub, no HTML nem em mensagens.
5. Abra a aplicação na URL de produção, crie a sessão em um navegador e entre com o código em outro. Confira voto fechado, revelação e nova rodada.

Se surgir **Banco ainda não conectado ao projeto na Vercel**, confira em **Project → Settings → Environment Variables** se o par de variáveis está disponível para **Production** e publique novamente. Se a integração estiver ligada a outra instalação do projeto, use **Connect to Project** no painel do banco para escolher `commitmentpoker`.

### Teste local da API

Com Node.js 18 ou superior, disponibilize no processo `UPSTASH_KV_REST_API_URL` e `UPSTASH_KV_REST_API_TOKEN` de um banco de desenvolvimento. Em seguida:

```bash
npx vercel dev
```

Abra o endereço informado pelo comando. Para executar os testes automatizados com um Redis simulado, sem tokens reais:

```bash
node --test test/session.test.js
```

## Armazenamento e segurança

O Redis mantém o registro da sessão sem TTL; o host é o único com autorização para removê-la. A identidade da aba é mantida no `sessionStorage` e uma cópia de recuperação fica no `localStorage` do navegador. Se o host perder todas as cópias do token, não há tela de recuperação ou transferência de host nesta versão. Não use este MVP para dados confidenciais: os códigos são curtos para convites e os tokens são armazenados no navegador.

O servidor valida permissões para cada ação e remove votos de outras pessoas da resposta destinada a participantes antes da revelação. As alterações são protegidas por uma atualização condicional atômica no Redis para evitar que votos simultâneos se sobrescrevam. A interface consulta a sessão aproximadamente a cada 2,5 segundos; não há conexão WebSocket. O uso prolongado por muitas pessoas pode alcançar os limites do plano gratuito do Upstash.

## Histórico

- **v0.6.3:** seletor de pontuação na divergência permanece aberto e mantém a escolha do host durante a sincronização automática.
- **v0.6.2:** divergência com todos os votos, extremos destacados e decisão explícita de seguir com uma pontuação escolhida pelo host.
- **v0.6.1:** resumo de capacidade clicável, com painel visual de pontos restantes, histórias pontuadas e histórias abertas.
- **v0.6.0:** decisão explícita do host após revelação, seção Histórias pontuadas, responsáveis por história confirmada e reabertura controlada de votação.
- **v0.5.4:** modal reduzido à pergunta estática de confirmação, sem o box visual da carta.
- **v0.5.3:** modal de voto simplificado com mensagem estática da carta e confirmação, sem pergunta aleatória para o time.
- **v0.5.2:** toast legível para a mensagem da carta e correção do layout do modal de confirmação.
- **v0.5.1:** home como tela inicial, retomada manual de sessões salvas, mocks com nomes brasileiros determinísticos, mão de cartas para participantes, host sem voto e correção do modal de confirmação.
- **v0.5.0:** painel de capacidade com Dev e QA por história, alertas acima de 8, projeto e sprint, exportação DOCX e retirada da demonstração inicial.
- **v0.4.0:** geração de demandas fictícias sobre car sharing para pets e participantes mock controláveis pelo host.
- **v0.3.2:** a área de votação do participante usa a largura disponível em telas grandes.
- **v0.3.1:** exibição da mediana também quando uma rodada com um único voto é revelada.
- **v0.3.0:** sessões compartilhadas com Redis e função Vercel, tokens por participante, atualizações periódicas e testes automatizados.
- **v0.2.0:** mão de cartas interativa na página inicial.
- **v0.1.x:** host, participante, cartões, demonstração, perguntas, voto e regras locais.

Versionamento: `0.x.0` para novas funcionalidades e `0.x.y` para correções durante o MVP.
