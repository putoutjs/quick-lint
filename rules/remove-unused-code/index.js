'use strict';

module.exports.report = () => `Remove unused code`;

module.exports.replace = () => ({
    'exports.createProcessFactoryAsync = __': '',
    'async function createProcessFactoryAsync(){}': '',
    'let VSCODE_WASM_MODULE_PATH_BROWSER = __': '',
    'let VSCODE_WASM_MODULE_PATH_NODE_JS = __': '',
});
