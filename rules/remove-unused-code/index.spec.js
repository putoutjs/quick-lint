import {createTest} from '@putout/test';
import * as plugin from './index.js';

const test = createTest(import.meta.url, {
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
