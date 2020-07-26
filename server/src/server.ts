"use strict";

import fs = require("fs");
import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  TextDocumentSyncKind,
  TextDocumentPositionParams,
  Definition,
  InitializeParams,
  TextDocument,
} from "vscode-languageserver";
import { Uri, StylesheetMap, Selector } from "./types";

import findSelector from "./core/findSelector";
import {
  findSymbols,
  findDefinition,
  getLanguageService,
  isLanguageServiceSupported,
} from "./core/findDefinition";
import { create } from "./logger";

// Creates the LSP connection
const connection = createConnection(ProposedFeatures.all);

// Create a manager for open text documents
const documents = new TextDocuments();

// Create a map of styleSheet URIs to the stylesheet text content
const styleSheets: StylesheetMap = {};

// The workspace folder this server is operating on
let workspaceFolder: string | null;

// A list of languages that suport the lookup definition (by default, only html)
let peekFromLanguages: string[];

documents.onDidOpen((event) => {
  connection.console.log(
    `[Server(${process.pid}) ${workspaceFolder}] Document opened: ${event.document.uri}`
  );
  if (isLanguageServiceSupported(event.document.languageId)) {
    const languageService = getLanguageService(event.document);
    const stylesheet = languageService.parseStylesheet(event.document);
    styleSheets[event.document.uri] = {
      document: event.document,
      stylesheet,
    };
  }
});
documents.listen(connection);

documents.onDidChangeContent((event) => {
  connection.console.log(
    `[Server(${process.pid}) ${workspaceFolder}] Document changed: ${event.document.uri}`
  );
  if (isLanguageServiceSupported(event.document.languageId)) {
    const languageService = getLanguageService(event.document);
    const stylesheet = languageService.parseStylesheet(event.document);
    styleSheets[event.document.uri] = {
      document: event.document,
      stylesheet,
    };
  }
});

connection.onInitialize((params) => {
  create(connection.console);
  workspaceFolder = params.rootUri;
  peekFromLanguages = params.initializationOptions.peekFromLanguages;
  connection.console.log(
    `[Server(${process.pid}) ${workspaceFolder}] Started and initialize received`
  );
  setupInitialStyleMap(params);
  connection.console.log(
    `[Server(${process.pid}) ${workspaceFolder}] Setup the stylesheet lookup map`
  );

  return {
    capabilities: {
      textDocumentSync: {
        openClose: true,
        change: TextDocumentSyncKind.Full,
      },
      definitionProvider: true,
      workspaceSymbolProvider: true,
    },
  };
});

function setupInitialStyleMap(params: InitializeParams) {
  const styleFiles = params.initializationOptions.stylesheets;

  styleFiles.forEach((fileUri: Uri) => {
    const languageId = fileUri.fsPath.split(".").slice(-1)[0];
    const text = fs.readFileSync(fileUri.fsPath, "utf8");
    const document = TextDocument.create(fileUri.uri, languageId, 1, text);
    const languageService = getLanguageService(document);
    const stylesheet = languageService.parseStylesheet(document);
    styleSheets[fileUri.uri] = {
      document,
      stylesheet,
    };
  });
}

connection.onDefinition(
  (textDocumentPositon: TextDocumentPositionParams): Definition => {
    const documentIdentifier = textDocumentPositon.textDocument;
    const position = textDocumentPositon.position;

    const document = documents.get(documentIdentifier.uri);

    // Ignore defintiion requests from unsupported languages
    if (peekFromLanguages.indexOf(document.languageId) === -1) {
      return null;
    }

    const selector: Selector = findSelector(document, position);
    if (!selector) {
      return null;
    }

    return findDefinition(selector, styleSheets);
  }
);

connection.onWorkspaceSymbol(({ query }) => {
  const selectors: Selector[] = [
    {
      attribute: "class",
      value: query,
    },
    {
      attribute: "id",
      value: query,
    },
  ];

  return selectors.reduce(
    (p, selector) => [...p, ...findSymbols(selector, styleSheets)],
    []
  );
});

connection.listen();
