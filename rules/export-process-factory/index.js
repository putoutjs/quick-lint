'use strict';

const {template, operator} = require('putout');

const {insertAfter, compare} = operator;
const exportProcessFactory = template.ast('module.exports.ProcessFactory = ProcessFactory;');

module.exports.report = () => `export ProcessFactory`;

module.exports.fix = (path) => {
    insertAfter(path, exportProcessFactory);
};

module.exports.traverse = ({push}) => ({
    ClassDeclaration(path) {
        if (path.node.id.name !== 'ProcessFactory')
            return;
        
        const next = path.getNextSibling();
        
        if (compare(next, exportProcessFactory))
            return;
        
        push(path);
    },
});
