'use strict';

const {join} = require('node:path');
const {readFile} = require('node:fs/promises');
const once = require('once');

const {
    LanguageOptions,
    ProcessFactory: QuickLint,
} = require('../dist/quick-lint-js.js');

const {noUselessDiagnostic} = require('./no-useless-diagnostic');
const {createToPlaces} = require('./create-to-place');

const {JSX, TYPESCRIPT} = LanguageOptions;
const isString = (a) => typeof a === 'string';
const WASM_PATH = join(__dirname, '..', 'dist', 'quick-lint-js-vscode.wasm');

const initWasm = once(async () => {
    const wasmCode = await readFile(WASM_PATH);
    return await WebAssembly.compile(wasmCode);
});

const getLangOptions = ({isTS, isJSX}) => {
    const ts = isTS ? TYPESCRIPT : 0;
    const jsx = isJSX ? JSX : 0;
    
    return ts | jsx;
};

module.exports = async (source, overrides = {}) => {
    const {
        isTS,
        isJSX,
        isFixMessages = true,
    } = overrides;
    
    check(source);
    
    const wasm = await initWasm();
    const quickLint = new QuickLint(wasm);
    const quickLintProcess = await quickLint.createProcessAsync();
    const linter = await quickLintProcess.createDocumentForWebDemoAsync();
    
    linter.setLanguageOptions(getLangOptions({
        isTS,
        isJSX,
    }));
    linter.setText(source);
    
    const diagnostics = linter.lint();
    
    linter.dispose();
    
    const toPlaces = createToPlaces(source);
    
    const places = diagnostics
        .filter(noUselessDiagnostic)
        .map(toPlaces);
    
    if (!isFixMessages)
        return places;
    
    return places.map(fixMessage);
};

function fixMessage(place) {
    const {message} = place;
    
    if (message === 'use of undeclared variable: await')
        place.message = `'await' is only allowed in async functions`;
    
    return place;
}

function check(source) {
    if (!isString(source))
        throw Error(`☝️ Looks like 'typeof source': '${typeof string}', expected 'source' to be 'string'`);
}
