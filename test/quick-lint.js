'use strict';

const tryToCatch = require('try-to-catch');
const montag = require('montag');
const {test} = require('supertape');

const {lint} = require('..');

test('quick-lint: no args', async (t) => {
    const [error] = await tryToCatch(lint);
    
    t.equal(error.message, `☝️ Looks like 'typeof source': 'undefined', expected 'source' to be 'string'`);
    t.end();
});

test('quick-lint: no async', async (t) => {
    const result = await lint(montag`
        function x() {
            await m();
        }
    `);
    
    const expected = [{
        rule: 'parser (quick-lint-js)',
        message: `'await' is only allowed in async functions`,
        position: {
            line: 2,
            column: 4,
        },
    }, {
        rule: 'parser (quick-lint-js)',
        message: 'use of undeclared variable: m',
        position: {
            line: 2,
            column: 10,
        },
    }];
    
    t.deepEqual(result, expected);
    t.end();
});
