export const report = () => `Remove unused code`;

export const replace = () => ({
    'exports.createProcessFactoryAsync = __': '',
    'async function createProcessFactoryAsync(){}': '',
    'let VSCODE_WASM_MODULE_PATH_BROWSER = __': '',
    'let VSCODE_WASM_MODULE_PATH_NODE_JS = __': '',
});
