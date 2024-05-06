'use strict';

const USE_OF_UNDECLARED_VARIABLE = 'E0057';

module.exports.noUselessDiagnostic = ({code, message}) => {
    return code !== USE_OF_UNDECLARED_VARIABLE || message.includes('await');
};
