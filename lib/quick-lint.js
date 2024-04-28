'use strict';

const {join} = require('node:path');
const {readFile} = require('node:fs/promises');
const once = require('once');
const {ProcessFactory: QuickLint} = require('../dist/quick-lint-js.js');

const isString = (a) => typeof a === 'string';
const WASM_PATH = join(__dirname, '..', 'dist', 'quick-lint-js-vscode.wasm');

const initWasm = once(async () => {
    const wasmCode = await readFile(WASM_PATH);
    return await WebAssembly.compile(wasmCode);
});

module.exports.lint = async (source) => {
    check(source);
    
    const wasm = await initWasm();
    const quickLint = new QuickLint(wasm);
    const quickLintProcess = await quickLint.createProcessAsync();
    const linter = await quickLintProcess.createDocumentForWebDemoAsync();
    
    linter.setText(source);
    const diagnostics = linter.lint();
    linter.dispose();
    
    const toPlaces = createToPlaces(source);
    
    return diagnostics.map(toPlaces);
};

const createToPlaces = (source) => ({begin, message}) => {
    let line = 1;
    let column = 0;
    let i = 0;
    
    while (++i < begin) {
        ++column;
        
        if (source.at(i) === '\n') {
            ++line;
            column = 0;
        }
    }
    
    const place = {
        rule: 'parser (quick-lint-js)',
        message,
        position: {
            line,
            column,
        },
    };
    
    return place;
};

function check(source) {
    if (!isString(source))
        throw Error(`☝️ Looks like 'typeof source': '${typeof string}', expected 'source' to be 'string'`);
}
