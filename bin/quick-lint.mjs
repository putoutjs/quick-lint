import {readFile} from 'fs/promises';
import {lint} from '../lib/quick-lint.js';

const fileName = process.argv[2];

if (!fileName) {
    console.log('quick-lint [file name]');
    process.exit(0);
}

const source = await readFile(fileName, "utf-8");
const places = await lint(source);

console.log(places);
