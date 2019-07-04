/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const vscode_languageserver_1 = require("vscode-languageserver");
const findSelector_1 = require("./core/findSelector");
const findDefinition_1 = require("./core/findDefinition");
const logger_1 = require("./logger");
// Creates the LSP connection
let connection = vscode_languageserver_1.createConnection(vscode_languageserver_1.ProposedFeatures.all);
// Create a manager for open text documents
let documents = new vscode_languageserver_1.TextDocuments();
// Create a map of styleSheet URIs to the stylesheet text content
let styleSheets = {};
// The workspace folder this server is operating on
let workspaceFolder;
// A list of languages that suport the lookup definition (by default, only html)
let peekFromLanguages;
// A list of file extensions to lookup for style definitions (defaults to .css, .scss and .less)
let fileSearchExtensions;
documents.onDidOpen((event) => {
    connection.console.log(`[Server(${process.pid}) ${workspaceFolder}] Document opened: ${event.document.uri}`);
    if (fileSearchExtensions.indexOf('.' + event.document.languageId) > -1) {
        const uri = event.document.uri;
        const languageId = event.document.languageId;
        const text = event.document.getText();
        const document = vscode_languageserver_1.TextDocument.create(uri, languageId, 1, text);
        const languageService = findDefinition_1.getLanguageService(document);
        const stylesheet = languageService.parseStylesheet(document);
        styleSheets[event.document.uri] = {
            document,
            stylesheet
        };
    }
});
documents.listen(connection);
documents.onDidChangeContent((event) => {
    connection.console.log(`[Server(${process.pid}) ${workspaceFolder}] Document changed: ${event.document.uri}`);
    if (fileSearchExtensions.indexOf('.' + event.document.languageId) > -1) {
        const uri = event.document.uri;
        const languageId = event.document.languageId;
        const text = event.document.getText();
        const document = vscode_languageserver_1.TextDocument.create(uri, languageId, 1, text);
        const languageService = findDefinition_1.getLanguageService(document);
        const stylesheet = languageService.parseStylesheet(document);
        styleSheets[event.document.uri] = {
            document,
            stylesheet
        };
    }
});
connection.onInitialize((params) => {
    logger_1.create(connection.console);
    workspaceFolder = params.rootUri;
    peekFromLanguages = params.initializationOptions.peekFromLanguages;
    fileSearchExtensions = params.initializationOptions.fileSearchExtensions;
    connection.console.log(`[Server(${process.pid}) ${workspaceFolder}] Started and initialize received`);
    setupStyleMap(params);
    connection.console.log(`[Server(${process.pid}) ${workspaceFolder}] Setup a stylesheet lookup map`);
    return {
        capabilities: {
            textDocumentSync: {
                openClose: true,
                change: vscode_languageserver_1.TextDocumentSyncKind.Full
            },
            definitionProvider: true
        }
    };
});
function setupStyleMap(params) {
    const styleFiles = params.initializationOptions.stylesheets;
    styleFiles.forEach((fileUri) => {
        const languageId = fileUri.fsPath.split('.').slice(-1)[0];
        const text = fs.readFileSync(fileUri.fsPath, 'utf8');
        const document = vscode_languageserver_1.TextDocument.create(fileUri.uri, languageId, 1, text);
        const languageService = findDefinition_1.getLanguageService(document);
        const stylesheet = languageService.parseStylesheet(document);
        styleSheets[fileUri.uri] = {
            document,
            stylesheet
        };
    });
}
connection.onDefinition((textDocumentPositon) => {
    const documentIdentifier = textDocumentPositon.textDocument;
    const position = textDocumentPositon.position;
    const document = documents.get(documentIdentifier.uri);
    // Ignore defintiion requests from unsupported languages
    if (peekFromLanguages.indexOf(document.languageId) === -1) {
        return null;
    }
    const selector = findSelector_1.default(document, position);
    if (!selector) {
        return null;
    }
    return findDefinition_1.findDefinition(selector, styleSheets);
});
connection.listen();
//# sourceMappingURL=server.js.map
