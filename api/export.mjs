import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel } from 'docx';
import { getExportSnapshot, resultFor } from './session.mjs';

const date = value => value ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'America/Sao_Paulo' }).format(new Date(value)) + ' (Brasília)' : 'Não registrado';
const p = (value, bold = false) => new Paragraph({ children: [new TextRun({ text: String(value ?? ''), bold })], spacing: { after: 120 } });
const title = (value, level = HeadingLevel.HEADING_2) => new Paragraph({ text: value, heading: level, spacing: { before: 260, after: 140 } });
function table(headers, rows) {
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headers, ...rows].map((row, index) => new TableRow({ children: row.map(cell => new TableCell({ children: [p(cell, index === 0)] })) })) });
}
function memberName(data, id) { const member = data.members.find(m => m.id === id); return member ? member.name + ' (' + member.discipline + ')' : 'Não atribuído'; }
function capacity(data, member) {
  const stories = data.items.filter(i => i.assignment?.devId === member.id || i.assignment?.qaId === member.id);
  return stories.reduce((sum, item) => sum + (resultFor(item).points || 0), 0);
}
function votesTable(data, votes) {
  const records = Object.entries(votes || {}).map(([id, vote]) => {
    const member = data.members.find(m => m.id === id);
    const checks = vote.value === 13 ? 'Sprint integral: ' + (vote.fullSprint ? 'sim' : 'não') + '; outro time: ' + (vote.otherTeam ? 'sim' : 'não') : vote.value === 21 ? 'Discussão da inviabilidade: ' + (vote.discussed21 ? 'sim' : 'não') : 'Não se aplica';
    return [member?.name || 'Participante não encontrado', vote.discipline || member?.discipline || 'Outro', vote.skipped ? 'Pulou' : String(vote.value), checks, date(vote.votedAt)];
  });
  return records.length ? table(['Participante', 'Perspectiva', 'Carta', 'Condições', 'Registrado em'], records) : p('Nenhum voto registrado nesta rodada.');
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });
  try {
    const body = req.body || {};
    if (JSON.stringify(body).length > 2000) return res.status(413).json({ error: 'Solicitação muito grande.' });
    const data = await getExportSnapshot(body.code, body.token);
    const content = [new Paragraph({ text: 'Relatório da sessão · Commitment Poker', heading: HeadingLevel.TITLE }),
      p('Projeto: ' + (data.projectName || 'Não informado')),
      p('Sprint: ' + (data.sprintName || 'Não informada')),
      p('Código: ' + data.code), p('Criada em: ' + date(data.createdAt)),
      p('Última alteração: ' + date(data.updatedAt)), p('Exportada em: ' + date(new Date().toISOString())),
      p('Capacidade de referência: 8 pontos por participante. Histórias sem mediana válida e revelada não consomem capacidade.'),
      title('Participantes e capacidade'),
      table(['Nome', 'Papel', 'Perspectiva', 'Entrada', 'Capacidade'], data.members.map(m => [m.name, m.role === 'host' ? 'Host' : 'Participante', m.discipline, date(m.joinedAt), capacity(data, m) + ' / 8' + (capacity(data, m) > 8 ? ' · ACIMA DA CAPACIDADE' : '')])),
      title('Demandas, decisões e votos')];
    if (!data.items.length) content.push(p('Nenhuma demanda criada.'));
    data.items.forEach((item, index) => {
      const result = resultFor(item);
      content.push(title((index + 1) + '. ' + item.text));
      content.push(p('Criada em: ' + date(item.createdAt)));
      content.push(p('Dev: ' + memberName(data, item.assignment?.devId) + ' | QA: ' + memberName(data, item.assignment?.qaId)));
      content.push(p('Decisão atual: ' + result.status + (result.points === null ? ' · pontos pendentes' : ' · ' + result.points + ' pontos') + ' · confirmação do host: ' + (item.confirmed ? 'sim em ' + date(item.confirmedAt) : 'não')));
      content.push(p('Revelada: ' + (item.revealed ? 'sim' : 'não') + ' | Divergência: ' + (item.locked ? 'sim' : 'não') + ' | Revelação em: ' + date(item.revealedAt)));
      (item.rounds || []).forEach(round => {
        content.push(title('Rodada ' + round.number, HeadingLevel.HEADING_3));
        content.push(p('Início: ' + date(round.startedAt) + ' | encerramento: ' + date(round.endedAt) + ' | revelada: ' + (round.revealed ? 'sim' : 'não') + ' | divergência: ' + (round.locked ? 'sim' : 'não')));
        content.push(votesTable(data, round.votes));
      });
      content.push(title('Rodada atual ' + ((item.rounds?.length || 0) + 1), HeadingLevel.HEADING_3));
      content.push(p('Início: ' + date(item.startedAt || item.createdAt)));
      content.push(votesTable(data, item.votes));
    });
    content.push(title('Observações sobre o registro'));
    content.push(p('O voto registra a carta escolhida e, para 13 e 21, as confirmações obrigatórias. A discussão verbal e justificativas não são registradas. Rodadas encerradas antes desta versão podem não ter histórico salvo. Cartões removidos não fazem parte da sessão exportada.'));
    const doc = new Document({ sections: [{ properties: {}, children: content }] });
    const buffer = await Packer.toBuffer(doc);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename="commitment-poker-' + data.code + '.docx"');
    return res.status(200).send(buffer);
  } catch (error) {
    if (!error.status) console.error('export-api:', error);
    return res.status(error.status || 500).json({ error: error.status ? error.message : 'Não foi possível gerar o documento.' });
  }
}
