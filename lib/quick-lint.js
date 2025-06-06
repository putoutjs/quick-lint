import {join, dirname} from 'node:path';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import once from 'once';
import * as quicklint from '../dist/quick-lint-js.cjs';
import {noUselessDiagnostic} from './no-useless-diagnostic.js';
import {createToPlaces} from './create-to-place.js';

const {
    LanguageOptions,
    ProcessFactory: QuickLint,
} = quicklint;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const {JSX, TYPESCRIPT} = LanguageOptions;
const isString = (a) => typeof a === 'string';

const toUpperCase = (a) => {
    const {message} = a;
    
    return {
        ...a,
        message: message[0].toUpperCase() + message.slice(1),
    };
};

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

export default async (source, overrides = {}) => {
    const {
        isTS,
        isJSX,
        startLine = 0,
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
    
    const toPlaces = createToPlaces(source, {
        startLine,
    });
    
    const places = diagnostics
        .filter(noUselessDiagnostic)
        .map(toPlaces)
        .map(toUpperCase);
    
    if (!isFixMessages)
        return places;
    
    return places.map(fixMessage);
};

function fixMessage(place) {
    const {message} = place;
    
    if (message === 'Use of undeclared variable: await')
        place.message = `'await' is only allowed in async functions`;
    
    if (message === `Exporting requires 'default'`)
        place.message = `Use 'export const' instead of 'export'`;
    
    return place;
}

function check(source) {
    if (!isString(source))
        throw Error(`☝️ Looks like 'typeof source': '${typeof string}', expected 'source' to be 'string'`);
}
