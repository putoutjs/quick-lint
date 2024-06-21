'use strict';

module.exports.createToPlaces = (source, {startLine}) => ({begin, message}) => {
    let line = startLine + 1;
    let column = 0;
    let i = 0;
    
    while (++i < begin) {
        ++column;
        
        if (source.at(i) === '\n') {
            ++line;
            column = 0;
        }
    }
    
    const place = {
        rule: 'parser (quick-lint-js)',
        message,
        position: {
            line,
            column: column + 1,
        },
    };
    
    return place;
};
