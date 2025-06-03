import {template, operator} from 'putout';

const {insertAfter, compare} = operator;
const exportProcessFactory = template.ast('module.exports.ProcessFactory = ProcessFactory;');

export const report = () => `export ProcessFactory`;

export const fix = (path) => {
    insertAfter(path, exportProcessFactory);
};

export const traverse = ({push}) => ({
    ClassDeclaration(path) {
        if (path.node.id.name !== 'ProcessFactory')
            return;
        
        const next = path.getNextSibling();
        
        if (compare(next, exportProcessFactory))
            return;
        
        push(path);
    },
});
