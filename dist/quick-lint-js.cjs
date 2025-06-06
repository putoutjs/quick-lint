// Copyright (C) 2020  Matthew "strager" Glazar
// See end of file for extended copyright information.

'use strict';

const process = require('node:process');

const {TextEncoder, TextDecoder} = require('node:util');
const noop = () => {};
const isFn = (a) => typeof a === 'function';

// TODO(strager): Make this configurable.
// For build instructions, see website/wasm/README.md.
class DocumentLinterDisposed extends Error {}
module.exports.DocumentLinterDisposed = DocumentLinterDisposed;

class ProcessCrashed extends Error {}
module.exports.ProcessCrashed = ProcessCrashed;

class ProcessAborted extends ProcessCrashed {}
module.exports.ProcessAborted = ProcessAborted;

class ProcessCrashedWithUnknownError extends ProcessCrashed {
    constructor(originalError) {
        super(originalError.stack);
        this.originalError = originalError;
    }
}

module.exports.ProcessCrashedWithUnknownError = ProcessCrashedWithUnknownError;
// Unique object used by the setjmp/longjmp implementation.
class LongJumpToken {}
const LONG_JUMP_TOKEN = new LongJumpToken();

// HACK(strager): I don't know what this is for exactly.
let tempRet0 = 0;

// A compiled WebAssembly module.
class ProcessFactory {
    constructor(wasmModule) {
        this._wasmModule = wasmModule;
    }
    
    async createProcessAsync() {
        let cachedIndirectFunction = null;
        let cachedIndirectFunctionIndex = -1;
        
        function longjmp(env, value) {
            if (!value)
                value = 1;
            
            wasmInstance.exports.setThrew(env, value);
            throw LONG_JUMP_TOKEN;
        }
        
        function invoke(functionIndex, ...args) {
            // Accessing __indirect_function_table can be slow (a few
            // microseconds). Cache the result. At the time of writing, we expect
            // only one functionIndex to be used over and over for the web demo.
            let func;
            
            if (functionIndex === cachedIndirectFunctionIndex) {
                func = cachedIndirectFunction;
            } else {
                func = wasmInstance.exports.__indirect_function_table.get(functionIndex);
                cachedIndirectFunction = func;
                cachedIndirectFunctionIndex = functionIndex;
            }
            
            const oldStackPointer = wasmInstance.exports.stackSave();
            
            try {
                return func(...args);
            } catch(e) {
                wasmInstance.exports.stackRestore(oldStackPointer);
                
                if (e === LONG_JUMP_TOKEN) {
                    const env = 1; // TODO(strager): Why this particular value?
                    wasmInstance.exports.setThrew(env, /*value=*/0);
                    
                    return 0; // FIXME(strager): What should we return for invoke_ii?
                }
                
                throw e;
            }
        }
        
        const wasmInstance = await WebAssembly.instantiate(this._wasmModule, {
            env: {
                // Called by setjmp.
                invoke_ii: invoke,
                invoke_iii: invoke,
                invoke_iiii: invoke,
                invoke_iiiii: invoke,
                invoke_v: invoke,
                invoke_vi: invoke,
                invoke_vii: invoke,
                invoke_viii: invoke,
                invoke_viiii: invoke,
                // Called by longjmp. Different names are for different Emscripten
                
                // versions and configurations.
                _emscripten_throw_longjmp: longjmp,
                emscripten_longjmp: longjmp,
                emscripten_longjmp_jmpbuf: longjmp,
                
                getTempRet0: () => tempRet0,
                setTempRet0: (temp) => {
                    tempRet0 = temp;
                },
            },
            wasi_snapshot_preview1: {
                fd_close: () => {
                    throw Error('Not implemented: fd_close');
                },
                fd_read: () => {
                    throw Error('Not implemented: fd_read');
                },
                fd_seek: () => {
                    throw Error('Not implemented: fd_seek');
                },
                
                environ_get: () => 0,
                
                environ_sizes_get: (outEnvironc, outEnvironBufSize) => {
                    const heap = wasmInstance.exports.memory.buffer;
                    
                    new Uint32Array(heap, outEnvironc)[0] = 0;
                    new Uint32Array(heap, outEnvironBufSize)[0] = 0;
                    
                    return 0;
                },
                
                proc_exit: () => {
                    throw new ProcessAborted('quick-lint-js process exited');
                },
                
                fd_write: (fd, iovsData, iovsSize, outWrittenSize) => {
                    const heap = wasmInstance.exports.memory.buffer;
                    const iovs = new Uint32Array(heap, iovsData, iovsSize * 8);
                    let bytesWritten = 0;
                    
                    for (let i = 0; i < iovsSize; ++i) {
                        const bufferPointer = iovs[i * 2 + 0];
                        const bufferSize = iovs[i * 2 + 1];
                        const buffer = new Uint8Array(heap, bufferPointer, bufferSize);
                        
                        // TODO(strager): Visual Studio Code doesn't like writing to stdout.
                        // Should we use console instead?
                        process.stdout.write(buffer);
                        bytesWritten += buffer.byteLength;
                    }
                    
                    new Uint32Array(heap, outWrittenSize)[0] = bytesWritten;
                    return 0;
                },
            },
        });
        
        wasmInstance.exports._initialize();
        return new Process(wasmInstance);
    }
}

module.exports.ProcessFactory = ProcessFactory;
let nextProcessIDForDebugging = 1;

// A WebAssembly instance.
//
// If a Process crashes, every DocumentForWebDemo
// associated with its creating Process is tainted.
class Process {
    constructor(wasmInstance) {
        this._idForDebugging = nextProcessIDForDebugging++;
        this._wasmInstance = wasmInstance;
        this._crashedException = null;
        
        const process = this;
        
        function wrap(name) {
            if (!Object.prototype.hasOwnProperty.call(wasmInstance.exports, name))
                throw TypeError(`WASM does not export function: ${name}`);
            
            const func = wasmInstance.exports[name];
            
            return (...args) => {
                try {
                    module.exports.maybeInjectFault(process, name);
                    try {
                        return func(...args);
                    } catch(e) {
                        throw new ProcessCrashedWithUnknownError(e);
                    }
                } catch(e) {
                    if (e instanceof ProcessCrashed)
                        process._taint(e);
                    
                    throw e;
                }
            };
        }
        
        this._heap = wasmInstance.exports.memory.buffer;
        
        this._malloc = wrap('malloc');
        this._free = wrap('free');
        this._listLocales = wrap('qljs_list_locales');
        this._webDemoCreateDocument = wrap('qljs_web_demo_create_document');
        this._webDemoDestroyDocument = wrap('qljs_web_demo_destroy_document');
        this._webDemoLint = wrap('qljs_web_demo_lint');
        this._webDemoSetLanguageOptions = wrap('qljs_web_demo_set_language_options');
        this._webDemoSetLocale = wrap('qljs_web_demo_set_locale');
        this._webDemoSetText = wrap('qljs_web_demo_set_text');
        this._webDemoSetConfig = wrap('qljs_web_demo_set_config');
    }
    
    isTainted() {
        return this._crashedException !== null;
    }
    
    _taint(exception) {
        this._crashedException = exception;
        
        function tainted() {
            throw this._crashedException;
        }
        
        // Reduce memory usage.
        this._wasmInstance = null;
        this._heap = null;
        // Make future calls crash and also reduce memory usage.
        this._malloc = tainted;
        this._free = tainted;
        this._listLocales = tainted;
        this._webDemoCreateDocument = tainted;
        this._webDemoDestroyDocument = tainted;
        this._webDemoLint = tainted;
        this._webDemoSetLanguageOptions = tainted;
        this._webDemoSetLocale = tainted;
        this._webDemoSetText = tainted;
    }
    
    toString() {
        return `Process(id=${this._idForDebugging})`;
    }
    
    async createDocumentForWebDemoAsync() {
        return new DocumentForWebDemo(this);
    }
    
    listLocales() {
        const localePointerList = new Uint32Array(this._heap, this._listLocales());
        const locales = [];
        
        for (let i = 0; localePointerList[i]; ++i) {
            locales.push(decodeUTF8CString(new Uint8Array(this._heap, localePointerList[i])));
        }
        
        return locales;
    }
}

class DocumentForWebDemo {
    constructor(process) {
        this._process = process;
        this._wasmDoc = this._process._webDemoCreateDocument();
    }
    
    setLanguageOptions(languageOptions) {
        this._process._webDemoSetLanguageOptions(this._wasmDoc, languageOptions);
    }
    
    setLocale(locale) {
        const utf8Locale = encodeUTF8String(locale, this._process);
        
        try {
            this._process._webDemoSetLocale(this._wasmDoc, utf8Locale.pointer);
        } finally {
            utf8Locale.dispose();
        }
    }
    
    setText(text) {
        const utf8Text = encodeUTF8String(text, this._process);
        
        try {
            this._process._webDemoSetText(this._wasmDoc, utf8Text.pointer, utf8Text.byteSize);
        } finally {
            utf8Text.dispose();
        }
    }
    
    lint() {
        const diagnosticsPointer = this._process._webDemoLint(this._wasmDoc);
        return this._parseDiagnostics(diagnosticsPointer);
    }
    
    setConfig(configDocument) {
        this._process._webDemoSetConfig(this._wasmDoc, configDocument._wasmDoc);
    }
    
    _parseDiagnostics(diagnosticsPointer) {
        const rawDiagnostics = new Uint8Array(this._process._heap, diagnosticsPointer);
        
        const rawDiagnosticsU32 = new Uint32Array(this._process._heap, diagnosticsPointer);
        
        const rawDiagnosticsPtr = new Uint32Array(this._process._heap, diagnosticsPointer);
        
        // struct qljs_web_demo_diagnostic {
        //   const char* message;
        //   char code[6];
        //   qljs_vscode_severity severity;
        //   int begin_offset;
        //   int end_offset;
        // };
        const ERROR = {
            message: 0,
            code: 4,
            severity: 3,
            begin_offset: 4,
            end_offset: 5,
            
            _byte_size: 6 * 4,
            _ptr_size: 6,
            _u32_size: 6,
        };
        
        const diagnostics = [];
        
        for (let i = 0;; ++i) {
            const messagePtr = rawDiagnosticsPtr[i * ERROR._ptr_size + ERROR.message];
            
            if (!messagePtr)
                break;
            
            diagnostics.push({
                code: decodeUTF8CString(rawDiagnostics.subarray(i * ERROR._byte_size + ERROR.code)),
                message: decodeUTF8CString(new Uint8Array(this._process._heap, messagePtr)),
                severity: rawDiagnosticsU32[i * ERROR._u32_size + ERROR.severity],
                begin: rawDiagnosticsU32[i * ERROR._u32_size + ERROR.begin_offset],
                end: rawDiagnosticsU32[i * ERROR._u32_size + ERROR.end_offset],
            });
        }
        
        return diagnostics;
    }
    
    dispose() {
        this._process._webDemoDestroyDocument(this._wasmDoc);
        this._wasmDoc = null;
    }
}

module.exports.DiagnosticSeverity = {
    ERROR: 1,
    WARNING: 2,
};

module.exports.LanguageOptions = {
    NONE: 0,
    
    JSX: 1 << 0,
    TYPESCRIPT: 1 << 1,
    CONFIG_JSON: 1 << 2,
};

// Writes a null-terminated string into the process's heap.
function encodeUTF8String(string, process) {
    const maxUTF8BytesPerUTF16CodeUnit = Math.ceil(Math.max(
        3 / 1, // U+0000..U+ffff: 1..3 UTF-8 bytes, 1 UTF-16 code unit
        5 / 2, // U+10000..: 5 UTF-8 bytes, 2 UTF-16 code units
    ));
    
    const maxSize = string.length * maxUTF8BytesPerUTF16CodeUnit + 1;
    const textUTF8Pointer = process._malloc(maxSize);
    
    try {
        const encoder = new TextEncoder();
        let textUTF8Size;
        const u8Array = new Uint8Array(process._heap, textUTF8Pointer, maxSize);
        
        if (isFn(encoder.encodeInto)) {
            const encodeResult = encoder.encodeInto(string, u8Array);
            
            if (encodeResult.read !== string.length)
                throw Error(`Assertion failure: expected encodeResult.read (${encodeResult.read}) to equal string.length (${string.length})`);
            
            textUTF8Size = encodeResult.written;
        } else {
            const encoded = encoder.encode(string);
            u8Array.set(encoded);
            textUTF8Size = encoded.length;
        }
        
        u8Array[textUTF8Size] = 0;
        // Null terminator.
        
        return {
            pointer: textUTF8Pointer,
            byteSize: textUTF8Size,
            dispose,
        };
    } catch(e) {
        dispose();
        throw e;
    }
    
    function dispose() {
        process._free(textUTF8Pointer);
    }
}

function decodeUTF8CString(bytes) {
    const nullTerminatorIndex = bytes.indexOf(0);
    
    if (nullTerminatorIndex < 0)
        throw Error('null terminator not found in C string');
    
    return new TextDecoder().decode(bytes.subarray(
        0,
        nullTerminatorIndex,
    ));
}

// This function is called when functions in this module call C++ functions.
//
// Replace this function with a function which throws an exception to simulate
// errors such as segfaults and OOMs.
module.exports.maybeInjectFault = noop;
// quick-lint-js finds bugs in JavaScript programs.
// Copyright (C) 2020  Matthew "strager" Glazar
//
// This file is part of quick-lint-js.
//
// quick-lint-js is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// quick-lint-js is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with quick-lint-js.  If not, see <https://www.gnu.org/licenses/>.
