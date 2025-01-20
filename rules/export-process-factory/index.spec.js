'use strict';

const {createTest} = require('@putout/test');
const plugin = require('.');

const test = createTest(__dirname, {
    plugins: [
        ['export-process-factory', plugin],
    ],
});

test('putout-quick-lint: export-process-factory: report', (t) => {
    t.report('export-process-factory', `export ProcessFactory`);
    t.end();
});

test('putout-quick-lint: export-process-factory: transform', (t) => {
    t.transform('export-process-factory');
    t.end();
});

test('putout-quick-lint: export-process-factory: no report: exported', (t) => {
    t.noReport('exported');
    t.end();
});
