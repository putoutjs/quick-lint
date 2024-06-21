# Quick Lint [![License][LicenseIMGURL]][LicenseURL] [![NPM version][NPMIMGURL]][NPMURL] [![Build Status][BuildStatusIMGURL]][BuildStatusURL] [![Coverage Status][CoverageIMGURL]][CoverageURL]

[NPMIMGURL]: https://img.shields.io/npm/v/@putout/quick-lint.svg?style=flat
[BuildStatusURL]: https://github.com/putoutjs/quick-lint/actions?query=workflow%3A%22Node+CI%22 "Build Status"
[BuildStatusIMGURL]: https://github.com/putoutjs/quick-lint/workflows/Node%20CI/badge.svg
[LicenseIMGURL]: https://img.shields.io/badge/license-MIT-317BF9.svg?style=flat
[NPMURL]: https://npmjs.org/package/@putout/quick-lint "npm"
[LicenseURL]: https://tldrlegal.com/license/mit-license "MIT License"
[CoverageURL]: https://coveralls.io/github/putoutjs/quick-lint?branch=master
[CoverageIMGURL]: https://coveralls.io/repos/putoutjs/quick-lint/badge.svg?branch=master&service=github

[quick-lint-js](https://quick-lint-js.com/) as library.

## Install

`npm i @putout/quick-lint --save`

## API

### quickLint(source: string, options: Options)

```ts
interface Options {
    isJSX: boolean;
    isTS: boolean;
    startLine: number;
}
```

```js
const quickLint = require('@putout/quick-lint');
const option = `
    function x() {
        await m();
    }
`;

quickLint(source, {
    isJSX: true,
    isTS: false,
    startLine: 0, // default
});

// returns
[{
    rule: 'parser (quick-lint-js)',
    message: '\'await\' is only allowed in async functions',
    position: {
        line: 2,
        column: 8,
    },
}, {
    rule: 'parser (quick-lint-js)',
    message: 'use of undeclared variable: m',
    position: {
        line: 2,
        column: 14,
    },
}];
```

## License

MIT
