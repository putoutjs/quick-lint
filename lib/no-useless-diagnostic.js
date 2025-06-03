const USE_OF_UNDECLARED_VARIABLE = 'E0057';

export const noUselessDiagnostic = ({code, message}) => {
    return code !== USE_OF_UNDECLARED_VARIABLE || message.includes('await');
};
