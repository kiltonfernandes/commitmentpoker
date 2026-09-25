import { randomBytes } from 'node:crypto';

const values = [1, 2, 3, 5, 8, 13, 21];
const regular = [1, 2, 3, 5, 8];
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const prefix = 'commitment-poker:v3:';
const capacityLimit = 8;

function redisConfig() {
  const url = process.env.UPSTASH_KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || process.env.STORAGE_REST_API_URL;
  const token = process.env.UPSTASH_KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || process.env.STORAGE_REST_API_TOKEN;
  if (!url || !token) throw Object.assign(new Error('Banco ainda não conectado ao projeto na Vercel.'), { status: 503 });
  return { url: url.replace(/\/$/, ''), token };
}

async function redis(...args) {
  const { url, token } = redisConfig();
  const response = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(args), signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw Object.assign(new Error('O banco de sessões está temporariamente indisponível.'), { status: 503 });
  const data = await response.json();
  if (data.error) throw Object.assign(new Error('Erro ao salvar a sessão. Tente novamente.'), { status: 503 });
  return data.result;
}

const secret = () => randomBytes(32).toString('hex');
const uid = () => randomBytes(9).toString('hex');
function code() { return Array.from(randomBytes(6), b => alphabet[b % alphabet.length]).join(''); }
function fail(message, status = 400) { throw Object.assign(new Error(message), { status }); }
function cleanName(input) { const name = String(input || '').trim().replace(/\s+/g, ' '); if (name.length < 1 || name.length > 70) fail('Informe um nome de até 70 caracteres.'); return name; }
function cleanDiscipline(input) { return ['Dev', 'QA', 'Outro'].includes(input) ? input : 'Outro'; }
function sessionKey(value) { if (!/^[A-HJ-NP-Z2-9]{6}$/.test(value || '')) fail('Código de sessão inválido.'); return prefix + value; }
async function read(key) { const raw = await redis('GET', key); return raw ? JSON.parse(raw) : null; }

// Compare-and-swap avoids lost votes when people submit at the same time.
const updateScript = "if redis.call('GET', KEYS[1]) == ARGV[1] then redis.call('SET', KEYS[1], ARGV[2]); return 1 else return 0 end";
const deleteScript = "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end";
async function update(key, mutate, remove = false) {
  for (let attempt = 0; attempt < 12; attempt++) {
    const old = await redis('GET', key);
    if (!old) fail('Sessão não encontrada ou encerrada pelo host.', 404);
    const data = JSON.parse(old);
    const result = mutate(data);
    const script = remove ? deleteScript : updateScript;
    const args = remove ? [script, 1, key, old] : [script, 1, key, old, JSON.stringify(data)];
    if (await redis('EVAL', ...args)) return { data, result };
  }
  fail('Muitas alterações simultâneas. Tente novamente.', 409);
}

function memberFor(data, token) { return data.members.find(m => m.token === token); }
function authorized(data, token, hostOnly = false) {
  const member = memberFor(data, token);
  if (!member || (hostOnly && member.role !== 'host')) fail('Acesso à sessão não autorizado.', 403);
  return member;
}
function itemFor(data, itemId) { const item = data.items.find(i => i.id === itemId); if (!item) fail('Cartão não encontrado.', 404); return item; }
function divergence(item) {
  const votes = Object.values(item.votes).map(v => v.value).filter(v => regular.includes(v));
  if (votes.length < 2) return false;
  return regular.indexOf(Math.max(...votes)) - regular.indexOf(Math.min(...votes)) >= 2;
}
export function resultFor(item) {
  const votes = Object.values(item.votes || {}).filter(v => values.includes(v.value));
  if (!votes.length) return { status: 'Aguardando votos', points: null };
  if (!item.revealed) return { status: 'Votação fechada', points: null };
  if (item.locked || divergence(item)) return { status: 'Divergência crítica', points: null };
  if (votes.some(v => v.value === 13 || v.value === 21)) return { status: 'Discussão obrigatória para carta 13 ou 21', points: null };
  const sorted = votes.map(v => v.value).sort((a, b) => a - b);
  return { status: 'Mediana revelada', points: sorted[Math.floor(sorted.length / 2)] };
}
function capacityFor(data, member) {
  const stories = data.items.filter(item => item.assignment?.devId === member.id || item.assignment?.qaId === member.id).map(item => ({
    itemId: item.id, text: item.text, role: item.assignment?.devId === member.id ? 'Dev' : 'QA',
    points: resultFor(item).points, status: resultFor(item).status
  }));
  const used = stories.reduce((sum, story) => sum + (story.points || 0), 0);
  return { memberId: member.id, name: member.name, discipline: member.discipline, limit: capacityLimit, used, exceeded: used > capacityLimit, stories };
}
export async function getExportSnapshot(codeValue, token) {
  const data = await read(sessionKey(String(codeValue || '').trim().toUpperCase()));
  if (!data) fail('Sessão não encontrada ou encerrada pelo host.', 404);
  authorized(data, String(token || ''), true);
  return data;
}
function view(data, member) {
  return {
    code: data.code, role: member.role, name: member.name, discipline: member.discipline,
    projectName: data.projectName || '', sprintName: data.sprintName || '',
    capacity: capacityFor(data, member),
    members: data.members.filter(m => m.role === 'participant').map(m => capacityFor(data, m)),
    items: data.items.map(item => {
      const visible = member.role === 'host' || item.revealed;
      const votes = {};
      for (const m of data.members) {
        const vote = item.votes[m.id];
        if (vote && (visible || m.id === member.id)) votes[m.name] = vote;
      }
      return { id: item.id, text: item.text, revealed: item.revealed, locked: item.locked, votes,
        assignment: member.role === 'host' ? (item.assignment || { devId: null, qaId: null }) : undefined,
        points: visible ? resultFor(item).points : null };
    })
  };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });
  try {
    const body = req.body || {};
    if (JSON.stringify(body).length > 18000) fail('Solicitação muito grande.', 413);
    const action = body.action;
    if (action === 'create') {
      const name = cleanName(body.name), discipline = cleanDiscipline(body.discipline);
      for (let attempt = 0; attempt < 12; attempt++) {
        const sessionCode = code(), key = sessionKey(sessionCode), token = secret();
        const now = new Date().toISOString();
        const data = { code: sessionCode, createdAt: now, updatedAt: now, projectName: '', sprintName: '', members: [{ id: uid(), name, discipline, role: 'host', token, joinedAt: now }], items: [] };
        // No TTL: the session remains until its host deletes it.
        if (await redis('SET', key, JSON.stringify(data), 'NX')) return res.status(201).json({ token, session: view(data, data.members[0]) });
      }
      fail('Não foi possível gerar um código livre. Tente novamente.', 503);
    }
    const sessionCode = String(body.code || '').trim().toUpperCase(), key = sessionKey(sessionCode);
    if (action === 'join') {
      const name = cleanName(body.name), discipline = cleanDiscipline(body.discipline);
      const token = secret(), id = uid();
      const { data } = await update(key, state => {
        if (state.members.some(m => m.name.toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR'))) fail('Este nome já está em uso na sessão. Informe outro nome.', 409);
        if (state.members.length >= 1000) fail('Esta sessão atingiu o limite técnico de participantes.', 409);
        state.members.push({ id, name, discipline, role: 'participant', token, joinedAt: new Date().toISOString() });
      });
      return res.status(200).json({ token, session: view(data, memberFor(data, token)) });
    }
    const token = String(body.token || '');
    if (action === 'state') {
      const data = await read(key);
      if (!data) fail('Sessão não encontrada ou encerrada pelo host.', 404);
      return res.status(200).json({ session: view(data, authorized(data, token)) });
    }
    const { data } = await update(key, state => {
      const member = authorized(state, token, ['add', 'remove', 'reveal', 'newRound', 'delete', 'assign', 'metadata'].includes(action));
      if (action === 'add') {
        const texts = body.texts;
        if (!Array.isArray(texts) || !texts.length || texts.length > 100 || state.items.length + texts.length > 300) fail('Informe entre 1 e 100 itens, respeitando o limite de 300 por sessão.');
        for (const text of texts) { const trimmed = String(text || '').trim(); if (!trimmed || trimmed.length > 500) fail('Cada item deve ter de 1 a 500 caracteres.'); state.items.push({ id: uid(), text: trimmed, votes: {}, revealed: false, locked: false, assignment: { devId: null, qaId: null }, rounds: [], createdAt: new Date().toISOString() }); }
      } else if (action === 'metadata') {
        const projectName = String(body.projectName || '').trim(), sprintName = String(body.sprintName || '').trim();
        if (projectName.length > 120 || sprintName.length > 120) fail('Nomes do projeto e da sprint devem ter até 120 caracteres.');
        state.projectName = projectName;
        state.sprintName = sprintName;
      } else if (action === 'delete') {
        // The host token is checked before the matching Redis key is removed.
      } else {
        const item = itemFor(state, body.itemId);
        if (action === 'remove') state.items = state.items.filter(i => i.id !== item.id);
        else if (action === 'assign') {
          if (!['devId', 'qaId'].includes(body.slot)) fail('Função inválida.');
          const selected = body.memberId ? state.members.find(m => m.id === body.memberId) : null;
          const required = body.slot === 'devId' ? 'Dev' : 'QA';
          if (body.memberId && (!selected || selected.role !== 'participant' || selected.discipline !== required)) fail('Escolha um participante com perspectiva ' + required + '.');
          item.assignment ||= { devId: null, qaId: null };
          item.assignment[body.slot] = selected?.id || null;
        }
        else if (action === 'reveal') { if (!Object.values(item.votes).some(v => v.value !== null)) fail('Aguarde pelo menos um voto.'); item.revealed = true; item.revealedAt = new Date().toISOString(); }
        else if (action === 'newRound') {
          if (Object.keys(item.votes || {}).length) {
            item.rounds ||= [];
            item.rounds.push({ number: item.rounds.length + 1, votes: item.votes, revealed: item.revealed, locked: item.locked, startedAt: item.startedAt || item.createdAt || null, endedAt: new Date().toISOString() });
          }
          item.votes = {}; item.revealed = false; item.locked = false; item.revealedAt = null; item.startedAt = new Date().toISOString();
        }
        else if (action === 'skip') {
          if (member.role !== 'participant') fail('O host conduz a sessão e não participa da votação.', 403);
          if (item.locked || item.revealed) fail('Esta rodada já foi encerrada.', 409);
          item.votes[member.id] = { value: null, skipped: true, discipline: member.discipline, votedAt: new Date().toISOString() };
        }
        else if (action === 'vote') {
          if (member.role !== 'participant') fail('O host conduz a sessão e não participa da votação.', 403);
          if (item.locked || item.revealed) fail('Esta rodada já foi encerrada.', 409);
          const value = Number(body.value);
          if (!values.includes(value)) fail('Carta inválida.');
          if (value === 13 && (!body.fullSprint || !body.otherTeam)) fail('Confirme as duas condições da carta 13.');
          if (value === 21 && !body.discussed21) fail('Confirme a condição da carta 21.');
          item.votes[member.id] = { value, discipline: member.discipline, fullSprint: !!body.fullSprint, otherTeam: !!body.otherTeam, discussed21: !!body.discussed21, votedAt: new Date().toISOString() };
          if (divergence(item)) { item.locked = true; item.revealed = true; item.revealedAt = new Date().toISOString(); }
        } else fail('Ação desconhecida.');
      }
      state.updatedAt = new Date().toISOString();
    }, action === 'delete');
    if (action === 'delete') return res.status(200).json({ deleted: true });
    return res.status(200).json({ session: view(data, authorized(data, token)) });
  } catch (error) {
    if (!error.status) console.error('session-api:', error);
    return res.status(error.status || 500).json({ error: error.status ? error.message : 'Não foi possível acessar a sessão. Tente novamente.' });
  }
};
