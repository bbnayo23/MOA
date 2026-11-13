// Runnable check for the chat translator's language guess: `pnpm check`
import assert from 'node:assert/strict';
import { langOf, translate } from '../src/net/translate.ts';

assert.equal(langOf('안녕! 반가워 ㅋㅋ'), 'ko');
assert.equal(langOf('ok 좋아'), 'ko'); // any Hangul: Korean
assert.equal(langOf('今夜一緒に勉強する？'), 'ja');
assert.equal(langOf('図書館'), 'ja'); // kanji alone
assert.equal(langOf('see you at 7!'), 'en');
assert.equal(langOf('👋'), null);
assert.equal(langOf('!! 123'), null);

// nothing to translate: answered at once, without the network
globalThis.fetch = () => assert.fail('should not fetch');
assert.equal(await translate('👋', 'ja'), '👋');
assert.equal(await translate('see you at 7!', 'en'), 'see you at 7!');

console.log('translate rules ok');
