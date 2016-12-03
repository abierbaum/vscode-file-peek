import * as vscode from 'vscode';

import * as fs   from 'fs';
import * as path from 'path';
import * as _    from 'lodash';
import {detect}  from 'async';
import * as css from 'css';
import * as less from 'less';
import { SourceMapConsumer } from 'source-map';
//TODO: Add Sass support


/**
 * @typedef CompiledCSS
 * @type {object}
 * @property {string} css - compiled CSS string.
 * @property {Object|null} map - sourcemap object (null if compiled from css to css).
 */
interface CompiledCSS {
  css: string;
  map: SourceMap.RawSourceMap;
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext): void {

  const config: vscode.WorkspaceConfiguration =
    vscode.workspace.getConfiguration('css_peek');

  const active_languages: Array<string> =
    (config.get('activeLanguages') as Array<string>);

  const search_file_extensions: Array<string> =
    (config.get('searchFileExtensions') as Array<string>);

  const peek_filter: vscode.DocumentFilter[] = active_languages.map((language: string) => (
    {
      language: language,
      scheme: 'file'
    }
  ));

  // Register the definition provider
  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider(peek_filter,
      new PeekFileDefinitionProvider(search_file_extensions))
  );
}

// this method is called when your extension is deactivated
export function deactivate(): void {
}

/**
 * Provide the lookup so we can peek into the files.
 */
class PeekFileDefinitionProvider implements vscode.DefinitionProvider {
  protected fileSearchExtensions: string[] = [];

  constructor(fileSearchExtensions: string[] = []) {
    this.fileSearchExtensions = fileSearchExtensions;
  }

  /**
   * Pre-Process and return CSS based on the file extension of filename.
   * If the extension is css, or parsing faile, just return the same text and fail silently
   * @param {string} file - file_name to find extension and parser appropriately
   * @param {string} file_text - contents of the file
   * @return {CompiledCSS} Object containing `css` prop as compiled CSS and `map` prop and sourcemap 
   */
  async compileCSS(file: string, file_text: string): Promise<CompiledCSS> {
    switch (_.last(file.split("."))) {
      case "less":
        try {
          const parsed_less: Less.RenderOutput = await less.render(file_text,  { filename: file, sourceMap: {} });
          return Object.assign({}, parsed_less, { map: JSON.parse(parsed_less.map) });
        } catch (error) {
          return { css: file_text, map: null };
        }
      default:
        return { css: file_text, map: null };
    }
  }

  /**
   * Check if selector exists in style file. 
   * Throws an error if it can't find the rule.
   * @throws {Error} Can't parse or find rule in CSS
   * @param {string} file - file_name to parse and check for css selector
   * @param {string} word - CSS selector
   * @return {Object} Object containing `rule` prop as the CSS rule and `map` prop and sourcemap 
   */
  async findRule(file: string, word: string): Promise<{rule: css.Rule; map: SourceMap.RawSourceMap;}>{ 
    try {
      const file_text: string = fs.readFileSync(file, "utf8");
      const compiled_css: CompiledCSS = await this.compileCSS(file, file_text);
      const parsed_css: css.Stylesheet = css.parse(compiled_css.css, { silent: true, source: file }); // css Stylesheet type


      if (!parsed_css) throw new Error("No CSS ?")
      if (parsed_css.type !== "stylesheet") throw new Error("CSS isn't a stylesheet")
      if (!parsed_css.stylesheet.rules) throw new Error("no CSS rules")

      const rule: css.Rule = parsed_css.stylesheet.rules.find((rule: css.Rule) => {
        return rule.type == "rule" && (_.includes(rule.selectors, "." + word, 0) || _.includes(rule.selectors, "#" + word, 0)) // TODO: don't generalize class and ID selector
      })

      if (!rule) throw new Error("CSS rule not found")
      return { rule: rule, map: compiled_css.map };
    } catch (e){
      throw e
    }
  }

  async provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Promise<vscode.Definition> {

    const word: string = document.getText(document.getWordRangeAtPosition(position));

    const file_searches: any = await Promise.all(this.fileSearchExtensions.map(type => vscode.workspace.findFiles(`**/*${type}`, "")));
    const potential_fnames: string[] = _.flatten(file_searches).map(uri => (uri as any).fsPath);

    let found_fname: string = await (new Promise((resolve, reject) => detect(potential_fnames, async (file, callback) => {
      try {
        await this.findRule(file, word);
        callback(null, true);
      } catch(error){
        console.log(error);
      }
    }, function (err, result) {
      resolve(result);
    })) as Promise<string>);

    found_fname = found_fname || potential_fnames[0];

    if (found_fname) {
      console.log('found: ' + found_fname);
      let position: vscode.Position = null;
      try {
        const rule: {rule: css.Rule; map: SourceMap.RawSourceMap;} = await this.findRule(found_fname, word);
        if (rule.map) {
          const smc: SourceMap.SourceMapConsumer = new SourceMapConsumer(rule.map);
          const srcPosition: SourceMap.Position = smc.originalPositionFor({ line: rule.rule.position.start.line, column: rule.rule.position.start.column });
          position = new vscode.Position(srcPosition.line - 1 || 0, srcPosition.column);
        } else {
          position = new vscode.Position(rule.rule.position.start.line - 1 || 0, rule.rule.position.start.column);
        }
      } catch(error){
        position = new vscode.Position(0, 1);
      }

      return new vscode.Location(vscode.Uri.file(found_fname), position);
    }

    return null;
  }
}
