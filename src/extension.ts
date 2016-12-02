import * as vscode from 'vscode';

import * as fs   from 'fs';
import * as path from 'path';
const _ = require('lodash');
const css = require('css');


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

  let config = vscode.workspace.getConfiguration('css_peek');
  let active_languages = (config.get('activeLanguages') as Array<string>);
  let search_file_extensions = (config.get('searchFileExtensions') as Array<string>);

  const peek_filter: vscode.DocumentFilter[] = active_languages.map((language) => {
    return {
      language: language,
      scheme: 'file'
    };
  });

  // Register the definition provider
  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider(peek_filter,
      new PeekFileDefinitionProvider(search_file_extensions))
  );
}

// this method is called when your extension is deactivated
export function deactivate() {
}


/**
 * Provide the lookup so we can peek into the files.
 */
class PeekFileDefinitionProvider implements vscode.DefinitionProvider {
  protected fileSearchExtensions: string[] = [];

  constructor(fileSearchExtensions: string[] = []) {
    this.fileSearchExtensions = fileSearchExtensions;
  }

  async provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Promise<vscode.Definition> {
    
    const word = document.getText(document.getWordRangeAtPosition(position));
    
    const working_dir = path.dirname(document.fileName);

    const potential_fnames: any = _(await vscode.workspace.findFiles("**/*.css", "")).map(f => f.fsPath)
    // const potential_fnames: any = _(await vscode.workspace.findFiles("**/*.css", "")).map(f => f.fsPath).reject(f => /node_modules/ig.test(f) || /bower_components/ig.test(f)).value();

    let found_fname = potential_fnames.find(file => {
      const file_text = fs.readFileSync(file, "utf8");
      let parsed_css = null;
      try {
        parsed_css = css.parse(file_text)
        if (!parsed_css) throw new Error("No CSS ?")
        if (parsed_css.type !== "stylesheet") throw new Error("CSS isn't a stylesheet")
        if (!parsed_css.stylesheet.rules) throw new Error("no CSS rules")

        let rule = parsed_css.stylesheet.rules.find(rule => {
          return rule.type == "rule" && (_.includes(rule.selectors, "." + word, 0) || _.includes(rule.selectors, "#" + word, 0)) // TODO: don't generalize class and ID selector
        })

        if (!rule) throw new Error("CSS rule not found")
        return true;

      } catch (error) {
        //Error in parsing CSS
      }
      return false;
    });

    found_fname = found_fname || potential_fnames[0];

    if (found_fname) {
      console.log('found: ' + found_fname);
      const file_text = fs.readFileSync(found_fname, "utf8");
      let position = null;
      let parsed_css = null;
      try {
        parsed_css = css.parse(file_text)
        if (!parsed_css) throw new Error("No CSS ?")
        if (parsed_css.type !== "stylesheet") throw new Error("CSS isn't a stylesheet")
        if (!parsed_css.stylesheet.rules) throw new Error("no CSS rules")

        let rule = parsed_css.stylesheet.rules.find(rule => {
          return rule.type == "rule" && (_.includes(rule.selectors, "." + word, 0) || _.includes(rule.selectors, "#" + word, 0)) // TODO: don't generalize class and ID selector
        })

        if (!rule) throw new Error("CSS rule not found")

        position = new vscode.Position(rule.position.start.line, rule.position.start.column);

      } catch (error) {
        //Error in parsing CSS
        position = new vscode.Position(0, 1);
        // console.log(parsed_css);
        console.error(error);
      }
      
      return new vscode.Location(vscode.Uri.file(found_fname), position);
    }

    return null;
  }
}
