let VSCODE_WASM_MODULE_PATH_BROWSER = "dist/quick-lint-js-vscode.wasm";
let VSCODE_WASM_MODULE_PATH_NODE_JS =
  "../public/demo/dist/quick-lint-js-vscode.wasm";

 class DocumentLinterDisposed extends Error {}
 exports.DocumentLinterDisposed = DocumentLinterDisposed;

async function createProcessFactoryAsync() {
  if (typeof window === "undefined") {
    // Node.js.
    let fs = require("fs");
    let path = require("path");

    let wasmCode = await fs.promises.readFile(
      path.join(__dirname, VSCODE_WASM_MODULE_PATH_NODE_JS)
    );
    let wasmModule = await WebAssembly.compile(wasmCode);
    return new ProcessFactory(wasmModule);
  } else {
    // Browser.
    let wasmModule = await WebAssembly.compileStreaming(
      fetch(VSCODE_WASM_MODULE_PATH_BROWSER)
    );
    return new ProcessFactory(wasmModule);
  }
}
exports.createProcessFactoryAsync = createProcessFactoryAsync;

 class ProcessFactory {
     constructor(wasmModule) {
         this._wasmModule = wasmModule;
     }
 }