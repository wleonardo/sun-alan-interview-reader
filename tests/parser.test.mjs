import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTranscript, assignBlocks, parseTime, matchesTopic, formatTime } from '../docs/parser.js';
import { TOPICS, CHAPTERS, META } from '../docs/content.js';

test('49 topics cover the entire interview once and in order', () => {
  assert.equal(TOPICS.length, 49);
  assert.equal(CHAPTERS.length, 16);
  assert.equal(TOPICS[0].start, 0);
  assert.equal(TOPICS.at(-1).end, META.duration);
  assert.equal(new Set(TOPICS.map(t => t.id)).size, TOPICS.length);
  for (let i = 0; i < TOPICS.length; i++) {
    const t = TOPICS[i];
    assert.ok(t.end > t.start);
    assert.ok(CHAPTERS.some(c => c.id === t.chapter));
    if (i) assert.equal(TOPICS[i - 1].end, t.start);
  }
});

test('Markdown timestamps, bold speaker labels, and paragraphs', () => {
  const { blocks } = parseTranscript('# 文件说明\n\n**[00:01:32] 邵艾伦：**\n示例问题。\n\n另一段。\n\n[00:01:40] **孙宇晨**：示例回答。');
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].speaker, '邵艾伦');
  assert.equal(blocks[0].start, 92);
  assert.equal(blocks[0].text, '示例问题。\n\n另一段。');
  assert.equal(blocks[1].speaker, '孙宇晨');
  assert.equal(blocks[1].text, '示例回答。');
});

test('speaker-first labels and bare Markdown timestamp headings', () => {
  const { blocks } = parseTranscript('邵艾伦 00:05:15\n示例甲\n### [00:05:25]\n示例乙');
  assert.equal(blocks[0].speaker, '邵艾伦');
  assert.equal(blocks[1].speaker, '');
  assert.equal(blocks[1].text, '示例乙');
});

test('SRT preserves all cue contents and ignores cue sequence ids', () => {
  const { blocks, format } = parseTranscript('1\n00:01:32,100 --> 00:01:34,500\n邵艾伦：示例问题\n第二行\n\n2\n00:01:35,000 --> 00:01:38,000\n孙宇晨：示例回答\n');
  assert.equal(format, '字幕');
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].start, 92.1);
  assert.equal(blocks[0].end, 94.5);
  assert.equal(blocks[0].text, '示例问题\n第二行');
  assert.equal(blocks[1].speaker, '孙宇晨');
});

test('WebVTT supports voice tags, headers and cue settings', () => {
  const { blocks } = parseTranscript('WEBVTT\n\nintro\n00:10.000 --> 00:12.200 align:start position:10%\n<v Alan>示例发言</v>\n\n00:13.000 --> 00:15.000\n未标注身份');
  assert.equal(blocks[0].speaker, 'Alan');
  assert.equal(blocks[0].text, '示例发言');
  assert.equal(blocks[1].speaker, '');
});

test('quoted timestamps in a sentence do not split a dialogue turn', () => {
  const { blocks } = parseTranscript('[00:02:00] 孙宇晨：请参考 00:01:32 的例子。\n下一句提到 01:12:23，仍是同一段。');
  assert.equal(blocks.length, 1);
  assert.ok(blocks[0].text.includes('01:12:23'));
});

test('same timestamps keep input order, earlier timestamps sort stably', () => {
  const { blocks, reordered } = parseTranscript('[00:02:00] 甲\n[00:01:00] 乙\n[00:01:00] 丙');
  assert.equal(reordered, true);
  assert.deepEqual(blocks.map(b => b.text), ['乙', '丙', '甲']);
});

test('out-of-range segments are reported, not silently assigned', () => {
  const { blocks, outOfRange } = parseTranscript('[00:00:01] 甲\n[05:00:00] 乙');
  assert.equal(blocks.length, 1);
  assert.equal(outOfRange, 1);
});

test('empty, untimed and wholly out-of-range files fail with useful errors', () => {
  assert.throws(() => parseTranscript(''), /空/);
  assert.throws(() => parseTranscript('没有任何时间信息'), /时间戳/);
  assert.throws(() => parseTranscript('[05:10:00] 示例'), /时间戳/);
});

test('bad minutes and seconds are rejected', () => {
  assert.equal(parseTime('00:62:01'), null);
  assert.equal(parseTime('00:01:61'), null);
  assert.equal(parseTime('100:01'), 6001);
  assert.equal(parseTime('04:22:28'), META.duration);
  assert.equal(formatTime(META.duration), '04:22:28');
});

test('every valid segment is assigned exactly once, including boundaries', () => {
  const source = TOPICS.flatMap(t => [t.start, t.end - 0.1]).map((start, index) => ({ start, text: String(index), speaker: '' }));
  const map = assignBlocks(source, TOPICS);
  assert.equal([...map.values()].flat().length, source.length);
  for (const topic of TOPICS) assert.equal(map.get(topic.id).length, 2);
});

test('search covers titles, summaries, examples, and imported dialogue', () => {
  const topic = TOPICS.find(t => t.time === '00:01:32');
  assert.equal(matchesTopic(topic, 'Oura'), true);
  assert.equal(matchesTopic(topic, 'ai 重量'), true);
  assert.equal(matchesTopic(topic, '独有测试词'), false);
  assert.equal(matchesTopic(topic, '独有测试词', [{ speaker: '嘉宾', text: '这是独有测试词' }]), true);
});

test('import does not interpret or remove potentially hostile markup', () => {
  const { blocks } = parseTranscript('[00:00:55] 孙宇晨：<img src=x onerror=alert(1)>\n<script>test</script>');
  assert.equal(blocks[0].text, '<img src=x onerror=alert(1)>\n<script>test</script>');
});

test('editorial source summaries stay within each page budget', () => {
  const segmenter = new Intl.Segmenter('zh', { granularity: 'word' });
  for (const c of CHAPTERS) {
    const text = TOPICS.filter(t => t.chapter === c.id).map(t => [t.title, t.summary, t.detail, t.example, t.note].join(' ')).join(' ');
    const count = [...segmenter.segment(text)].filter(s => s.isWordLike).length;
    assert.ok(count <= 195, `chapter ${c.id}: ${count}`);
  }
});
