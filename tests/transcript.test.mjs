import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { BUNDLED_TRANSCRIPT } from '../docs/transcript.js';
import { TOPICS, META } from '../docs/content.js';
import { assignBlocks, formatTime, matchesTopic } from '../docs/parser.js';

const rawBytes = readFileSync(new URL('../docs/transcript.md', import.meta.url));
const raw = rawBytes.toString('utf8');
const turns = BUNDLED_TRANSCRIPT.blocks;
const assigned = assignBlocks(turns, TOPICS);

test('embedded data identifies the exact downloadable source file', () => {
  assert.equal(createHash('sha256').update(rawBytes).digest('hex'), BUNDLED_TRANSCRIPT.sourceSha256);
  assert.equal(BUNDLED_TRANSCRIPT.bundled, true);
  assert.equal(turns.length, 682);
});

test('all spoken text is preserved character for character apart from layout whitespace', () => {
  const sourceBody = raw.slice(raw.indexOf('**[00:00:00]'));
  const dialogueOnly = sourceBody.split('\n').filter(line => {
    // The actual uploaded document uses these standalone editorial structures.
    if (line.startsWith('## ')) return false;
    if (line.startsWith('> ')) return false;
    if (line === '**【正片开始】**') return false;
    if (line === '*（注：部分内容由豆包工作 AI 生成）*') return false;
    return true;
  }).join('\n').replace(/\s/g, '');
  const rendered = turns.map(turn => `**[${formatTime(turn.start)}] ${turn.speaker}：** ${turn.text}`).join('\n').replace(/\s/g, '');
  assert.equal(rendered, dialogueOnly);
});

test('every source heading retains its timestamp, speaker, and order', () => {
  const heads = [...raw.matchAll(/^\*\*\[(\d\d:\d\d:\d\d)\] ([^：]+)：\*\*/gm)];
  assert.equal(heads.length, turns.length);
  for (let i = 0; i < heads.length; i++) {
    assert.equal(formatTime(turns[i].start), heads[i][1]);
    assert.equal(turns[i].speaker, heads[i][2]);
  }
});

test('all 682 turns appear once across all 49 topics, including the final second', () => {
  assert.equal(assigned.size, 49);
  const rendered = [...assigned.values()].flat();
  assert.equal(rendered.length, 682);
  assert.equal(new Set(rendered).size, 682);
  assert.deepEqual(rendered, turns);
  for (const topic of TOPICS) {
    assert.ok(assigned.get(topic.id).length > 0, topic.id);
    assert.equal(assigned.get(topic.id)[0].start, topic.start, `${topic.id} starts at a real dialogue boundary`);
  }
  assert.equal(rendered.at(-1).start, META.duration);
  assert.equal(rendered.at(-1).text, '嗯，谢谢。');
});

test('source annotations remain separate from interview speech', () => {
  const notes = turns.flatMap(turn => turn.notes || []);
  assert.equal(notes.length, 5);
  assert.equal(notes.filter(note => note.kind === 'editorial').length, 4);
  assert.ok(notes.some(note => note.text.includes('部分内容由豆包工作 AI 生成')));
  assert.ok(turns.every(turn => !turn.text.includes('【校订说明】')));
  assert.ok(turns.some(turn => turn.text.includes('〔存疑：')));
});

test('a phrase present only in the full dialogue can find its topic', () => {
  const topic = TOPICS.find(t => t.time === '00:01:32');
  assert.equal(matchesTopic(topic, '每组12个'), false);
  assert.equal(matchesTopic(topic, '每组12个', assigned.get(topic.id)), true);
});
