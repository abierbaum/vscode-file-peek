"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_css_languageservice_1 = require("vscode-css-languageservice");
const logger_1 = require("./../logger");
let languageServices = {
    css: vscode_css_languageservice_1.getCSSLanguageService(),
    scss: vscode_css_languageservice_1.getSCSSLanguageService(),
    less: vscode_css_languageservice_1.getLESSLanguageService()
};
function getLanguageService(document) {
    let service = languageServices[document.languageId];
    if (!service) {
        logger_1.console.log('Document type is ' + document.languageId + ', using css instead.');
        service = languageServices['css'];
    }
    return service;
}
exports.getLanguageService = getLanguageService;
function getSelection(selector) {
    switch (selector.attribute) {
        case 'id':
            return '#' + selector.value;
        case 'class':
            return '.' + selector.value;
        default:
            return selector.value;
    }
}
function findDefinition(selector, stylesheetMap) {
    logger_1.console.log('Searching for definition');
    const locations = [];
    let selection = getSelection(selector);
    const classOrIdSelector = selector.attribute === 'class' || selector.attribute === 'id';
    if (selection[0] === ".") {
        selection = "\\" + selection;
    }
    if (!classOrIdSelector) {
        // Tag selectors must have nothing, whitespace, or a combinator before it.
        selection = "(^|[\\s>+~])" + selection;
    }
    const re = new RegExp(selection + "(\\[[^\\]]*\\]|:{1,2}[\\w-()]+|\\.[\\w-]+|#[\\w-]+)*\\s*$", classOrIdSelector ? "" : "i");
    Object.keys(stylesheetMap)
        .forEach(uri => {
        const { document, stylesheet } = stylesheetMap[uri];
        const symbols = getLanguageService(document).findDocumentSymbols(document, stylesheet);
        logger_1.console.log('Found ' + symbols.length + ' symbols in ' + uri);
        symbols.forEach((symbol) => {
            if (symbol.name.indexOf("&") !== -1) {
                // TODO: Handle nesting
            }
            if (symbol.name.search(re) !== -1) {
                locations.push(symbol.location);
            }
            else if (!classOrIdSelector) {
                // Special case for tag selectors - match "*" as the rightmost character
                if (/\*\s*$/.test(symbol.name)) {
                    locations.push(symbol.location);
                }
            }
        });
    });
    return locations;
}
exports.findDefinition = findDefinition;
//# sourceMappingURL=findDefinition.js.map