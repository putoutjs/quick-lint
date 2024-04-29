class DocumentLinterDisposed extends Error {}
exports.DocumentLinterDisposed = DocumentLinterDisposed;

class ProcessFactory {
    constructor(wasmModule) {
        this._wasmModule = wasmModule;
    }
}
