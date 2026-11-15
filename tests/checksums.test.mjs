import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const expected=JSON.parse(readFileSync(new URL('data/checksums.json',root)));
for(const [file,digest] of Object.entries(expected)){
 const actual=createHash('sha256').update(readFileSync(new URL(file,root))).digest('hex');
 assert.equal(actual,digest,`${file} changed since checksums.json was written; regenerate with scripts/write_checksums.py after reviewing the change`);
}
console.log(`Checksums match for ${Object.keys(expected).length} data files.`);
