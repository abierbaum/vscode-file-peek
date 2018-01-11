"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function default_1(selector) {
    switch (selector.attribute) {
        case 'id':
            return '#' + selector.value;
        case 'class':
            return '.' + selector.value;
        default:
            return selector.value;
    }
}
exports.default = default_1;
//# sourceMappingURL=selectorToString.js.map