"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_css_languageservice_1 = require("vscode-css-languageservice");
const logger_1 = require("./../logger");
let languageServices = {
    css: vscode_css_languageservice_1.getCSSLanguageService(),
    scss: vscode_css_languageservice_1.getSCSSLanguageService(),
    less: vscode_css_languageservice_1.getLESSLanguageService()
};
function isLanguageServiceSupported(serviceId) {
    return !!languageServices[serviceId];
}
exports.isLanguageServiceSupported = isLanguageServiceSupported;
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
function findSymbols(selector, stylesheetMap) {
    logger_1.console.log('Searching for symbol');
    const foundSymbols = [];
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
        try {
            const symbols = getLanguageService(document).findDocumentSymbols(document, stylesheet);
            logger_1.console.log('Found ' + symbols.length + ' symbols in ' + uri);
            symbols.forEach((symbol) => {
                if (symbol.name.indexOf("&") !== -1) {
                    // TODO: Handle nesting
                }
                if (symbol.name.search(re) !== -1) {
                    foundSymbols.push(symbol);
                }
                else if (!classOrIdSelector) {
                    // Special case for tag selectors - match "*" as the rightmost character
                    if (/\*\s*$/.test(symbol.name)) {
                        foundSymbols.push(symbol);
                    }
                }
            });
        }
        catch (e) {
            logger_1.console.log(e.stack);
        }
    });
    return foundSymbols;
}
exports.findSymbols = findSymbols;
function findDefinition(selector, stylesheetMap) {
    return findSymbols(selector, stylesheetMap).map(({ location }) => location);
}
exports.findDefinition = findDefinition;
//# sourceMappingURL=findDefinition.js.map