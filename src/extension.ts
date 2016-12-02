import * as vscode from 'vscode';

import * as fs   from 'fs';
import * as path from 'path';
const _ = require('lodash');
const detect = require('async/detect');
const css = require('css');
const less = require('less');
const { SourceMapConsumer } = require('source-map');
//TODO: Add Sass support


interface CompiledCSS {
  css: string;
  map: Object;
}

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

  async compileCSS(file: string, file_text: string): Promise<CompiledCSS>{
    switch (_.last(file.split("."))) {
      case "less":
        try {
          const parsed_less = await less.render(file_text, { filename: file, sourceMap: {}});
          return Object.assign({}, parsed_less, { map: JSON.parse(parsed_less.map) });
        } catch (error) {
          return { css: file_text, map: null};
        }
      default:
        return { css: file_text, map: null};
    }
  }

  async provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Promise<vscode.Definition> {

    const word = document.getText(document.getWordRangeAtPosition(position));

    const file_searches = await Promise.all(this.fileSearchExtensions.map(type => vscode.workspace.findFiles(`**/*${type}`, "")));
    const potential_fnames = _.flatten(file_searches).map(uri => uri.fsPath);

    let found_fname: any = await new Promise((resolve, reject) => detect(potential_fnames, async (file, callback) => {
      const file_text = fs.readFileSync(file, "utf8");
      let parsed_css = null;
      try {
        
        const compiled_css: CompiledCSS = await this.compileCSS(file, file_text);
        parsed_css = css.parse(compiled_css.css, { silent: true, source: file })

        if (!parsed_css) throw new Error("No CSS ?")
        if (parsed_css.type !== "stylesheet") throw new Error("CSS isn't a stylesheet")
        if (!parsed_css.stylesheet.rules) throw new Error("no CSS rules")

        let rule = parsed_css.stylesheet.rules.find(rule => {
          return rule.type == "rule" && (_.includes(rule.selectors, "." + word, 0) || _.includes(rule.selectors, "#" + word, 0)) // TODO: don't generalize class and ID selector
        })

        if (!rule) throw new Error("CSS rule not found")

        callback(null, true);
        return true;

      } catch (error) {
        //Error in parsing CSS
      }
      return false;
    }, function(err, result){
      resolve(result);
    }));


    found_fname = found_fname || potential_fnames[0];

    if (found_fname) {
      console.log('found: ' + found_fname);
      const file_text = fs.readFileSync(found_fname, "utf8");
      let position = null;
      let parsed_css = null;
      try {
        const compiled_css: CompiledCSS = await this.compileCSS(found_fname, file_text);
        parsed_css = css.parse(compiled_css.css, { silent: true, source: found_fname })
        if (!parsed_css) throw new Error("No CSS ?")
        if (parsed_css.type !== "stylesheet") throw new Error("CSS isn't a stylesheet")
        if (!parsed_css.stylesheet.rules) throw new Error("no CSS rules")

        let rule = parsed_css.stylesheet.rules.find(rule => {
          return rule.type == "rule" && (_.includes(rule.selectors, "." + word, 0) || _.includes(rule.selectors, "#" + word, 0)) // TODO: don't generalize class and ID selector
        })

        if (!rule) throw new Error("CSS rule not found")

        if(compiled_css.map){
          const smc = new SourceMapConsumer(compiled_css.map);
          const srcPosition = smc.originalPositionFor({ line: rule.position.start.line, column: rule.position.start.column});
          position = new vscode.Position(srcPosition.line - 1 || 0, srcPosition.column);
        } else {
          position = new vscode.Position(rule.position.start.line - 1 || 0, rule.position.start.column);
        }

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
