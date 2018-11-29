"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_html_languageservice_1 = require("vscode-html-languageservice");
const logger_1 = require("./../logger");
/**
 * Find the selector given the document and the current cursor position.
 * This is found by iterating forwards and backwards from the position to find a valid CSS class/id
 *
 * @param {vscode.TextDocument} document - The Document to check
 * @param {vscode.Position} position - The current cursor position
 * @returns {{attribute: string, value: string}} The valid CSS selector
 *
 * @memberOf PeekFileDefinitionProvider
 */
function findSelector(document, position) {
    const text = document.getText();
    const offset = document.offsetAt(position);
    let start = offset;
    let end = offset;
    while (start > 0 && text.charAt(start - 1) !== ' ' && text.charAt(start - 1) !== '\'' && text.charAt(start - 1) !== '"' && text.charAt(start - 1) !== '\n' && text.charAt(start - 1) !== '<')
        start -= 1;
    while (end < text.length && text.charAt(end) !== ' ' && text.charAt(end) !== '\'' && text.charAt(end) !== '"' && text.charAt(end) !== '\n' && text.charAt(end) !== '>')
        end += 1;
    const selectorWord = text.slice(start, end);
    let selector = null;
    const htmlScanner = vscode_html_languageservice_1.getLanguageService().createScanner(text);
    let attribute = null;
    let tokenType = htmlScanner.scan();
    while (tokenType !== vscode_html_languageservice_1.TokenType.EOS) {
        switch (tokenType) {
            case vscode_html_languageservice_1.TokenType.StartTag:
                attribute = null;
                if (selectorWord === htmlScanner.getTokenText())
                    selector = { attribute: null, value: selectorWord };
                break;
            case vscode_html_languageservice_1.TokenType.AttributeName:
                attribute = htmlScanner.getTokenText().toLowerCase();
                // Convert the attribute to a standard class attribute
                if (attribute === 'classname') {
                    attribute = 'class';
                }
                break;
            case vscode_html_languageservice_1.TokenType.AttributeValue:
                if (attribute === 'class' || attribute === 'id') {
                    if (htmlScanner.getTokenText().slice(1, -1).split(' ').indexOf(selectorWord) > -1) {
                        selector = { attribute, value: selectorWord };
                    }
                }
                break;
        }
        tokenType = htmlScanner.scan();
    }
    if (selector) {
        logger_1.console.log("Found CSS selector of type " + selector.attribute + " and value " + selector.value);
    }
    else {
        logger_1.console.log("Invalid Selector...");
    }
    return selector;
}
exports.default = findSelector;
//# sourceMappingURL=findSelector.js.map