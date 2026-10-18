import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { META, TOPICS, SECTIONS, searchTopics, splitLocalText } from '../docs/jinming-content.js';
const root = new URL('../docs/', import.meta.url);

test('second interview is explicitly a guide with verified public-video metadata', () => {
  assert.equal(META.scope, 'guide');
  assert.equal(META.duration, 47 * 60 + 9);
  assert.equal(META.published, '2026-10-16');
  assert.equal(META.video, 'https://www.bilibili.com/video/BV1X6JX6sEYJ/');
  assert.ok(Object.values(META).filter(x => typeof x === 'string' && x.startsWith('http')).every(x => x.startsWith('https://')));
});

test('20 unique topics follow transcript order, not the rearranged source summary', () => {
  assert.equal(TOPICS.length, 20);
  assert.equal(new Set(TOPICS.map(t => t.id)).size, 20);
  assert.deepEqual(TOPICS.map(t => t.order), Array.from({ length: 20 }, (_, i) => i + 1));
  assert.deepEqual(TOPICS.map(t => t.section), [0,0,0,0,0,0,1,1,1,1,2,2,2,2,2,3,3,3,3,3]);
  assert.equal(TOPICS[0].title, 'Solana / DeFi');
  assert.equal(TOPICS[19].title, 'TRON 费用');
  assert.ok(TOPICS.every(t => SECTIONS[t.section] && t.review && !('start' in t) && !('time' in t)));
});

test('guide search covers core text, examples, quote, editorial review and category', () => {
  assert.deepEqual(searchTopics({ query: 'ETH 3,600' }).map(t => t.order), [18]);
  assert.deepEqual(searchTopics({ query: '做空' }).map(t => t.order), [5,16]);
  assert.deepEqual(searchTopics({ query: '幸存者偏差' }).map(t => t.order), [11]);
  assert.equal(searchTopics({ category: 'AI应用' }).length, 3);
  assert.equal(searchTopics({ query: 'btc' }).length, 2);
  assert.equal(searchTopics({ query: '<img src=x>' }).length, 0);
});

test('combined filters and read-state do not mutate their inputs', () => {
  const read = new Set(['jm-topic-13']);
  const found = searchTopics({ category: 'AI应用', unreadOnly: true, read });
  assert.deepEqual(found.map(t => t.order), [14,15]);
  assert.equal(read.size, 1);
  assert.equal(searchTopics({ query: '   ' }).length, 20);
  assert.equal(searchTopics({ query: '不存在的查询' }).length, 0);
});

test('local text preserves markup as text and requires no invented timestamps', () => {
  assert.deepEqual(splitLocalText('\uFEFF第一段\r\n续行\r\n\r\n<script>alert(1)</script>\r\n'), ['第一段\n续行','<script>alert(1)</script>']);
  assert.deepEqual(splitLocalText('   '), []);
  assert.deepEqual(splitLocalText('金明：问题\n孙宇晨：回答'), ['金明：问题\n孙宇晨：回答']);
});

test('source-derived topic index stays brief; editorial reviews are separate', () => {
  const synopsis = TOPICS.map(t => [t.title,t.summary,t.example,t.quote].join(' ')).join(' ');
  const words = [...new Intl.Segmenter('zh', { granularity: 'word' }).segment(synopsis)].filter(t => t.isWordLike);
  assert.ok(words.length <= 190, `Brief index has ${words.length} words`);
  assert.equal(TOPICS.filter(t => t.quote).length, 1);
  assert.ok(TOPICS.filter(t => t.quote).map(t => t.quote).join('').length < 25);
});

test('new reader preserves independent progress and never uploads imported text', async () => {
  const js = await readFile(new URL('jinming.js', root), 'utf8');
  assert.ok(js.includes("'longtalk-002-read-v1'"));
  assert.ok(!js.includes('longtalk-001'));
  assert.ok(!/\b(fetch|XMLHttpRequest|WebSocket|sendBeacon|indexedDB)\b/.test(js));
  assert.ok(!/innerHTML|outerHTML|insertAdjacentHTML|\beval\s*\(/.test(js));
  assert.ok(js.includes('8 * 1024 * 1024'));
  assert.ok(js.includes('node.textContent = text'));
});

test('second reader states its limits, has unique IDs and resolvable DOM targets', async () => {
  const html = await readFile(new URL('jinming.html', root), 'utf8');
  const js = await readFile(new URL('jinming.js', root), 'utf8');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(x => x[1]);
  assert.equal(ids.length, new Set(ids).size);
  for (const [, id] of js.matchAll(/\$\('([^']+)'\)/g)) assert.ok(ids.includes(id), `Missing DOM target ${id}`);
  assert.ok(html.includes('完整对话尚未内置'));
  assert.ok(html.includes('刷新后清除'));
  assert.ok(html.includes('不是受访者原话'));
  for (const [, tokens] of html.matchAll(/aria-labelledby="([^"]+)"/g)) for (const id of tokens.split(/\s+/)) assert.ok(ids.includes(id));
});
