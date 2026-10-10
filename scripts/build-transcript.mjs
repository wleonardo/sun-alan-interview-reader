import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parseTranscript, assignBlocks } from '../docs/parser.js';
import { TOPICS, META } from '../docs/content.js';

const path = new URL('../docs/transcript.md', import.meta.url);
const source = readFileSync(path);
const raw = source.toString('utf8');
const parsed = parseTranscript(raw, META.duration);
const heads = [...raw.matchAll(/^\*\*\[(\d\d:\d\d:\d\d)\] ([^：]+)：\*\*/gm)];
if (parsed.blocks.length !== heads.length || parsed.outOfRange) throw new Error('Source turn count did not survive parsing.');
const assigned = assignBlocks(parsed.blocks, TOPICS);
if ([...assigned.values()].flat().length !== heads.length) throw new Error('A dialogue turn was not assigned to a topic.');
if ([...assigned.values()].some(blocks => !blocks.length)) throw new Error('A topic has no dialogue.');
const transcript = {
  name: '完整逐字稿.md', bundled: true, revision: 'uploaded-20261010-1',
  sourceSha256: createHash('sha256').update(source).digest('hex'),
  turnCount: parsed.blocks.length,
  blocks: parsed.blocks,
};
writeFileSync(new URL('../docs/transcript.js', import.meta.url), '// Derived only from the user-uploaded transcript; original file: transcript.md.\nexport const BUNDLED_TRANSCRIPT = ' + JSON.stringify(transcript) + ';\n');
console.log(JSON.stringify({ turns: parsed.blocks.length, topicsCovered: assigned.size, finalTurn: parsed.blocks.at(-1).start, editorialNotes: parsed.blocks.reduce((n, b) => n + (b.notes?.length || 0), 0), maxTurnsPerTopic: Math.max(...[...assigned.values()].map(blocks => blocks.length)) }));
