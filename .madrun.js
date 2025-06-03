import {run} from 'madrun';

export default {
    'test': () => `tape test/*.js 'rules/**/*.spec.js'`,
    'coverage': () => 'c8 npm test',
    'lint': () => 'putout .',
    'fix:lint': () => run('lint', '--fix'),
    'report': () => 'c8 report --reporter=lcov',
    'watcher': () => 'nodemon -w test -w lib --exec',
    'watch:test': async () => await run('watcher', `"${await run('test')}"`),
    'watch:lint': async () => await run('watcher', await run('lint')),
    'update:dist': () => [
        'mkdir -p dist2',
        'cd dist2',
        'ipull https://quick-lint-js.com/demo/dist/quick-lint-js-vscode.wasm',
        'ipull https://raw.githubusercontent.com/quick-lint/quick-lint-js/master/website/wasm/quick-lint-js.js',
        'cd ..',
        'putout dist2 --rulesdir rules --fix',
        'rm -rf dist',
        'mv dist2 dist',
    ].join(' && '),
};
