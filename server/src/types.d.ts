import { Stylesheet } from 'vscode-css-languageservice';
import { TextDocument } from 'vscode-languageserver/lib/main';

export type StylesheetMap = {
  [key: string]: {
    document: TextDocument,
    stylesheet: Stylesheet
  }
}

// Based off the `vscode` `Uri` namespace
export type Uri = {
  /**
   * The actual Uri string representation
   */
  readonly uri: string;

  /**
   * The string representing the corresponding file system path of this Uri.
   *
   * Will handle UNC paths and normalize windows drive letters to lower-case. Also
   * uses the platform specific path separator. Will *not* validate the path for
   * invalid characters and semantics. Will *not* look at the scheme of this Uri.
   */
  readonly fsPath: string;
}

export type Selector = { attribute: string, value: string }