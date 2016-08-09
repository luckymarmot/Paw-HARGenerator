if (
    typeof registerDynamicValueClass === 'undefined' ||
    typeof InputField === 'undefined'
) {
    let mocks = require('./PawMocks.js')
    module.exports = {
        registerCodeGenerator: mocks.registerCodeGenerator,
        InputField: mocks.InputField,
        bundle: mocks.bundle
    }
}
else {
    /* eslint-disable no-undef */
    module.exports = {
        registerCodeGenerator: registerCodeGenerator,
        InputField: InputField,
        bundle: bundle
    }
    /* eslint-enable no-undef */
}
