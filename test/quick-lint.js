'use strict';

const tryToCatch = require('try-to-catch');
const montag = require('montag');
const {test} = require('supertape');
const quickLint = require('..');

test('quick-lint: no args', async (t) => {
    const [error] = await tryToCatch(quickLint);
    
    t.equal(error.message, `☝️ Looks like 'typeof source': 'undefined', expected 'source' to be 'string'`);
    t.end();
});

test('quick-lint: no async', async (t) => {
    const result = await quickLint(montag`
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

test('quick-lint: ts', async (t) => {
    const options = {
        isTS: true,
    };
    
    const result = await quickLint(montag`
        interface X {}
    `, options);
    
    const expected = [];
    
    t.deepEqual(result, expected);
    t.end();
});

test('quick-lint: jsx', async (t) => {
    const options = {
        isJSX: true,
    };
    
    const result = await quickLint(montag`
        const a = <div>hello</div>;
    `, options);
    
    const expected = [];
    
    t.deepEqual(result, expected);
    t.end();
});

test('quick-lint: await: undeclared variable', async (t) => {
    const result = await quickLint(montag`
        () => await
    `);
    
    const expected = [{
        message: 'use of undeclared variable: await',
        position: {
            column: 5,
            line: 1,
        },
        rule: 'parser (quick-lint-js)',
    }];
    
    t.deepEqual(result, expected);
    t.end();
});

test('quick-lint: await: declared', async (t) => {
    const result = await quickLint(montag`
        const await = 5;
    `);
    
    const expected = [];
    
    t.deepEqual(result, expected);
    t.end();
});
