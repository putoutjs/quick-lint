import {createTest} from '@putout/test';
import * as plugin from './index.js';

const test = createTest(import.meta.url, {
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
