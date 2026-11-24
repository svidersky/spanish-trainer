// The Sync server (Cloudflare Worker): Profiles (name + PIN), lockout, optimistic versioning.
import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/src/index.js';
import { fakeKv } from './helpers/kv.mjs';

const HOUR = 60 * 60 * 1000;

function server() {
  let now = Date.UTC(2026, 10, 24, 12);
  const env = { PROGRESS: fakeKv(), now: () => now };
  const call = async (path, body, method = 'POST') => {
    const init = { method, headers: { 'Content-Type': 'application/json' } };
    if (body !== undefined) init.body = typeof body === 'string' ? body : JSON.stringify(body);
    const res = await worker.fetch(new Request('https://sync.test' + path, init), env);
    const text = await res.text();
    return { status: res.status, headers: res.headers, body: text ? JSON.parse(text) : null };
  };
  return { env, call, advance: ms => { now += ms; } };
}

const PROGRESS = { version: 1, completedLessons: [1], cards: { 'l01-01|recog': { interval: 3, last: 1 } } };

test('a CORS preflight is answered for any origin', async () => {
  const { call } = server();
  const res = await call('/save', undefined, 'OPTIONS');
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');
  assert.match(res.headers.get('Access-Control-Allow-Methods'), /POST/);
  assert.match(res.headers.get('Access-Control-Allow-Headers'), /Content-Type/i);
});

test('real responses carry the CORS header too', async () => {
  const { call } = server();
  const res = await call('/load', { name: 'leonid', pin: '4831' });
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');
});

test('unknown paths are 404 and other methods are 405', async () => {
  const { call } = server();
  assert.equal((await call('/nope', {})).status, 404);
  assert.equal((await call('/load', undefined, 'GET')).status, 405);
});

test('invalid names, PINs and bodies are rejected with 400', async () => {
  const { call } = server();
  for (const body of [
    { name: 'leonid', pin: '123' },
    { name: 'leonid', pin: '12a4' },
    { name: 'leonid', pin: 4831 },
    { name: 'x', pin: '4831' },
    { name: 'a'.repeat(33), pin: '4831' },
    { name: 'bad name!', pin: '4831' },
    { pin: '4831' },
  ]) {
    assert.equal((await call('/load', body)).status, 400, JSON.stringify(body));
  }
  assert.equal((await call('/load', '{not json')).status, 400);
  assert.equal((await call('/save', { name: 'leonid', pin: '4831', version: 0 })).status, 400, 'save needs progress');
});

test('loading a name nobody has used yet returns empty progress at version 0', async () => {
  const { call } = server();
  const res = await call('/load', { name: 'leonid', pin: '4831' });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { progress: null, version: 0 });
});

test('the first save creates the Profile; then load returns the progress', async () => {
  const { call } = server();
  const saved = await call('/save', { name: 'leonid', pin: '4831', version: 0, progress: PROGRESS });
  assert.equal(saved.status, 200);
  assert.equal(saved.body.version, 1);
  const loaded = await call('/load', { name: 'leonid', pin: '4831' });
  assert.deepEqual(loaded.body, { progress: PROGRESS, version: 1 });
});

test('names are case- and space-insensitive', async () => {
  const { call } = server();
  await call('/save', { name: 'Leonid ', pin: '4831', version: 0, progress: PROGRESS });
  assert.equal((await call('/load', { name: 'leonid', pin: '4831' })).body.version, 1);
});

test('Cyrillic names are allowed', async () => {
  const { call } = server();
  assert.equal((await call('/save', { name: 'леонид', pin: '4831', version: 0, progress: PROGRESS })).status, 200);
});

test('a wrong PIN gets 401 and no progress', async () => {
  const { call } = server();
  await call('/save', { name: 'leonid', pin: '4831', version: 0, progress: PROGRESS });
  const res = await call('/load', { name: 'leonid', pin: '0000' });
  assert.equal(res.status, 401);
  assert.equal(res.body.progress, undefined);
  const save = await call('/save', { name: 'leonid', pin: '0000', version: 1, progress: { cards: {} } });
  assert.equal(save.status, 401);
  assert.deepEqual((await call('/load', { name: 'leonid', pin: '4831' })).body.progress, PROGRESS, 'not overwritten');
});

test('after 5 wrong PINs the name is locked for an hour, even for the right PIN', async () => {
  const s = server();
  await s.call('/save', { name: 'leonid', pin: '4831', version: 0, progress: PROGRESS });
  for (let i = 0; i < 5; i++) assert.equal((await s.call('/load', { name: 'leonid', pin: '1111' })).status, 401);
  const locked = await s.call('/load', { name: 'leonid', pin: '4831' });
  assert.equal(locked.status, 423);
  assert.ok(locked.body.retryAfterSeconds > 0 && locked.body.retryAfterSeconds <= 3600);
  s.advance(HOUR - 60 * 1000);
  assert.equal((await s.call('/load', { name: 'leonid', pin: '4831' })).status, 423, 'still locked before the hour');
  s.advance(2 * 60 * 1000);
  assert.equal((await s.call('/load', { name: 'leonid', pin: '4831' })).status, 200, 'unlocked after the hour');
});

test('a correct PIN resets the wrong-PIN counter', async () => {
  const { call } = server();
  await call('/save', { name: 'leonid', pin: '4831', version: 0, progress: PROGRESS });
  for (let i = 0; i < 4; i++) await call('/load', { name: 'leonid', pin: '1111' });
  assert.equal((await call('/load', { name: 'leonid', pin: '4831' })).status, 200);
  for (let i = 0; i < 4; i++) await call('/load', { name: 'leonid', pin: '1111' });
  assert.equal((await call('/load', { name: 'leonid', pin: '4831' })).status, 200, 'not locked: counter was reset');
});

test('locking one name does not affect another', async () => {
  const { call } = server();
  await call('/save', { name: 'leonid', pin: '4831', version: 0, progress: PROGRESS });
  await call('/save', { name: 'ana', pin: '1234', version: 0, progress: PROGRESS });
  for (let i = 0; i < 5; i++) await call('/load', { name: 'leonid', pin: '0000' });
  assert.equal((await call('/load', { name: 'ana', pin: '1234' })).status, 200);
});

test('a save based on an old version gets 409 with the current copy, and nothing is overwritten', async () => {
  const { call } = server();
  await call('/save', { name: 'leonid', pin: '4831', version: 0, progress: PROGRESS });
  const other = { ...PROGRESS, completedLessons: [1, 2] };
  assert.equal((await call('/save', { name: 'leonid', pin: '4831', version: 1, progress: other })).body.version, 2);
  const stale = await call('/save', { name: 'leonid', pin: '4831', version: 1, progress: PROGRESS });
  assert.equal(stale.status, 409);
  assert.deepEqual(stale.body, { progress: other, version: 2 });
  assert.deepEqual((await call('/load', { name: 'leonid', pin: '4831' })).body.progress, other);
});

test('creating a Profile that already exists is a version conflict, not a takeover', async () => {
  const { call } = server();
  await call('/save', { name: 'leonid', pin: '4831', version: 0, progress: PROGRESS });
  const res = await call('/save', { name: 'leonid', pin: '9999', version: 0, progress: { cards: {} } });
  assert.equal(res.status, 401, 'someone else cannot claim the name with another PIN');
});

test('the PIN is not stored in plain text', async () => {
  const { env, call } = server();
  await call('/save', { name: 'leonid', pin: '4831', version: 0, progress: { cards: {} } });
  const raw = [...env.PROGRESS.raw().values()].join('\n');
  assert.doesNotMatch(raw, /4831/);
});

test('bodies over 512 KB are rejected with 413', async () => {
  const { call } = server();
  const big = { name: 'leonid', pin: '4831', version: 0, progress: { pad: 'x'.repeat(600 * 1024) } };
  assert.equal((await call('/save', big)).status, 413);
});
