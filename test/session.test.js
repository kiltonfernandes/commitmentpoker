const test = require('node:test');
const assert = require('node:assert/strict');
let handler;
test.before(async () => { handler = (await import('../api/session.mjs')).default; });

const data = new Map();
process.env.UPSTASH_KV_REST_API_URL = 'https://redis.example.test';
process.env.UPSTASH_KV_REST_API_TOKEN = 'test-token';
global.fetch = async (_url, options) => {
  const [command, ...args] = JSON.parse(options.body);
  let result;
  if (command === 'GET') result = data.get(args[0]) || null;
  if (command === 'SET') { result = args[2] === 'NX' && data.has(args[0]) ? null : 'OK'; if (result) data.set(args[0], args[1]); }
  if (command === 'EVAL') {
    const [, , key, old, next] = args;
    result = data.get(key) === old ? 1 : 0;
    if (result) { if (next) data.set(key, next); else data.delete(key); }
  }
  return { ok: true, json: async () => ({ result }) };
};
async function call(action, fields = {}) {
  const response = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(n) { this.statusCode = n; return this; }, json(body) { this.body = body; return this; } };
  await handler({ method: 'POST', body: { action, ...fields } }, response);
  return response;
}

test('dois navegadores, sigilo, pular, divergência, nova rodada e exclusão', async () => {
  const created = await call('create', { name: 'Host', discipline: 'Dev' });
  assert.equal(created.statusCode, 201);
  const code = created.body.session.code, host = created.body.token;
  const alice = await call('join', { code, name: 'Alice', discipline: 'QA' });
  const bob = await call('join', { code, name: 'Bob', discipline: 'Dev' });
  assert.equal(alice.statusCode, 200);
  await call('add', { code, token: host, texts: ['História A', 'História B'] });
  const hostState = await call('state', { code, token: host });
  const [item, other] = hostState.body.session.items;
  await call('vote', { code, token: alice.body.token, itemId: item.id, value: 2 });
  await call('skip', { code, token: bob.body.token, itemId: other.id });
  const hidden = await call('state', { code, token: bob.body.token });
  assert.deepEqual(hidden.body.session.items[0].votes, {});
  assert.equal(hidden.body.session.items[1].votes.Bob.skipped, true);
  assert.equal(hidden.body.session.items[0].revealed, false);
  const visibleHost = await call('state', { code, token: host });
  assert.equal(visibleHost.body.session.items[0].votes.Alice.value, 2);
  await call('vote', { code, token: bob.body.token, itemId: item.id, value: 5 });
  const exposed = await call('state', { code, token: alice.body.token });
  assert.equal(exposed.body.session.items[0].locked, true);
  assert.equal(exposed.body.session.items[0].revealed, true);
  assert.equal(exposed.body.session.items[0].votes.Bob.value, 5);
  assert.equal((await call('vote', { code, token: alice.body.token, itemId: item.id, value: 3 })).statusCode, 409);
  assert.equal((await call('newRound', { code, token: bob.body.token, itemId: item.id })).statusCode, 403);
  await call('newRound', { code, token: host, itemId: item.id });
  assert.deepEqual((await call('state', { code, token: host })).body.session.items[0].votes, {});
  assert.equal((await call('vote', { code, token: bob.body.token, itemId: item.id, value: 13 })).statusCode, 400);
  await call('vote', { code, token: alice.body.token, itemId: item.id, value: 3 });
  await call('vote', { code, token: bob.body.token, itemId: item.id, value: 5 });
  assert.deepEqual((await call('state', { code, token: alice.body.token })).body.session.items[0].votes, { Alice: { value: 3, discipline: 'QA', fullSprint: false, otherTeam: false, discussed21: false } });
  await call('reveal', { code, token: host, itemId: item.id });
  assert.equal((await call('state', { code, token: alice.body.token })).body.session.items[0].votes.Bob.value, 5);
  assert.equal((await call('delete', { code, token: bob.body.token })).statusCode, 403);
  await call('delete', { code, token: host });
  assert.equal((await call('state', { code, token: alice.body.token })).statusCode, 404);
});
