# Commitment Poker

Aplicação de Planning Poker por compromisso e mediana. O host cria uma sessão, compartilha um código de seis caracteres e inclui histórias, uma por linha. Pessoas em outros navegadores entram com nome e código, votam, pulam um cartão ou reveem a carta antes de confirmar. A sessão fica no Upstash Redis sem prazo de expiração configurado, até o host excluí-la.

**Versão: v0.3.2**

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

## Estrutura

```text
index.html             Interface, estilos, cartas e perguntas
api/session.mjs        API de sessão na Vercel, com Upstash Redis
test/session.test.js   Teste da API e das regras de sigilo
vercel.json            Configuração HTTP para a Vercel
README.md              Documentação
```

Sem framework, build ou dependências npm. A Vercel entrega `index.html` e executa `api/session.mjs` como função Node.js. O servidor guarda os tokens de acesso e conversa com o Redis; o navegador chama apenas `/api/session`.

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

- **v0.3.2:** a área de votação do participante usa a largura disponível em telas grandes.
- **v0.3.1:** exibição da mediana também quando uma rodada com um único voto é revelada.
- **v0.3.0:** sessões compartilhadas com Redis e função Vercel, tokens por participante, atualizações periódicas e testes automatizados.
- **v0.2.0:** mão de cartas interativa na página inicial.
- **v0.1.x:** host, participante, cartões, demonstração, perguntas, voto e regras locais.

Versionamento: `0.x.0` para novas funcionalidades e `0.x.y` para correções durante o MVP.
