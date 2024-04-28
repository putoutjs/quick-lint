#!/usr/bin/env node
import {readFile} from 'node:fs/promises';
import process from 'node:process';
import {lint} from '../lib/quick-lint.js';

const fileName = process.argv[2];

if (!fileName) {
    console.log('quick-lint [file name]');
    process.exit(0);
}

const source = await readFile(fileName, 'utf-8');
const places = await lint(source);

console.log(places);
