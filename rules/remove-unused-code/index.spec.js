'use strict';

const {createTest} = require('@putout/test');
const plugin = require('.');

const test = createTest(__dirname, {
    plugins: [
        ['remove-unused-code', plugin],
    ],
});

test('putout-quick-lint: remove-unused-code: report', (t) => {
    t.report('remove-unused-code', `Remove unused code`);
    t.end();
});

test('putout-quick-lint: remove-unused-code: transform', (t) => {
    t.transform('remove-unused-code');
    t.end();
});
