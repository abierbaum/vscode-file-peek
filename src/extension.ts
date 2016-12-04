import * as vscode from 'vscode'

import * as fs   from 'fs'
import * as _    from 'lodash'
import {detect}  from 'async'
import * as css from 'css'
import * as less from 'less'
//TODO: Add Sass support

import { SourceMapConsumer } from 'source-map'



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

/**
 * @typedef RuleAndMap
 * @type {object}
 * @property {string} file - Stylesheet file.
 * @property {css.Rule} rule - CSS rule.
 * @property {Object|null} map - sourcemap object (null if compiled from css to css).
 */
interface RuleAndMap {
  file: string;
  rule: css.Rule;
  map: SourceMap.RawSourceMap;
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext): void {

  const config: vscode.WorkspaceConfiguration =
    vscode.workspace.getConfiguration('css_peek')

  const active_languages: Array<string> =
    (config.get('activeLanguages') as Array<string>)

  const search_file_extensions: Array<string> =
    (config.get('searchFileExtensions') as Array<string>)

  const peek_filter: vscode.DocumentFilter[] = active_languages.map((language: string) => (
    {
      language: language,
      scheme: 'file'
    }
  ))

  // Register the definition provider
  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider(peek_filter,
      new PeekCSSDefinitionProvider(search_file_extensions))
  )
}

// this method is called when your extension is deactivated
export function deactivate(): void {
}

/**
 * Provide the lookup so we can peek into the files.
 */
class PeekCSSDefinitionProvider implements vscode.DefinitionProvider {
  protected fileSearchExtensions: string[] = [];

  constructor(fileSearchExtensions: string[] = []) {
    this.fileSearchExtensions = fileSearchExtensions
  }

  /**
   * Pre-Process and return CSS based on the file extension of filename.
   * If the extension is css, or parsing faile, just return the same text and fail silently
   * @param {string} file - file_name to find extension and parser appropriately
   * @param {string} file_text - contents of the file
   * @return {CompiledCSS} Object containing `css` prop as compiled CSS and `map` prop and sourcemap 
   */
  async compileCSS(file: string, file_text: string): Promise<CompiledCSS> {
    switch (_.last(file.split('.'))) {
      case 'less':
        try {
          const parsed_less: Less.RenderOutput = await less.render(file_text, { filename: file, sourceMap: {} })
          return Object.assign({}, parsed_less, { map: JSON.parse(parsed_less.map) })
        } catch (error) {
          return { css: file_text, map: null }
        }
      default:
        return { css: file_text, map: null }
    }
  }

  /**
   * Check if selector exists in style file. 
   * Throws an error if it can't find the rule.
   * @throws {Error} Can't parse or find rule in CSS
   * @param {string} file - file_name to parse and check for css selector
   * @param {string} word - CSS selector
   * @return {Promise<RuleAndMap>} the file, css Rule and the sourcemap (or null if no sourcemap) 
   */
  async findRuleAndMapInFile(file: string, word: string): Promise<RuleAndMap> {
    try {
      const file_text: string = fs.readFileSync(file, 'utf8')
      const compiled_css: CompiledCSS = await this.compileCSS(file, file_text)
      const parsed_css: css.Stylesheet = css.parse(compiled_css.css, { silent: true, source: file }) // css Stylesheet type


      if (!parsed_css) throw new Error('No CSS ?')
      if (parsed_css.type !== 'stylesheet') throw new Error('CSS isn\'t a stylesheet')
      if (!parsed_css.stylesheet.rules) throw new Error('no CSS rules')

      const rule: css.Rule = parsed_css.stylesheet.rules.find((rule: css.Rule) => {
        return rule.type == 'rule' && (_.includes(rule.selectors, '.' + word, 0) || _.includes(rule.selectors, '#' + word, 0)) // TODO: don't generalize class and ID selector
      })

      if (!rule) throw new Error('CSS rule not found')
      return { file: file, rule: rule, map: compiled_css.map }
    } catch (e) {
      // console.log(e);
      // throw e
    }
  }

  
  /**
   * Look through all style files (from fileSearchExtensions configuration) for the given selector.
   * 
   * @param {string} selector - the CSS selector (class or ID) to find.
   * @returns {Promise<RuleAndMap>} file, css Rule and map (if found)
   * 
   * @memberOf PeekFileDefinitionProvider
   */
  async findRuleAndMap(selector: string): Promise<RuleAndMap> {

    const file_searches: any = await Promise.all(this.fileSearchExtensions.map(type => vscode.workspace.findFiles(`**/*${type}`, '')))
    let potential_fnames: string[] = _.flatten(file_searches).map(uri => (uri as any).fsPath)
    
    // BUG WORKAROUND
    // If there are a lot of files to parse and test, then filter node_modules and bower_components files to reduce number of files to test
    // If we have too many files to test, this currently fails and we get no definition, that's why we do this
    if(potential_fnames.length >= 30)
      potential_fnames = potential_fnames.filter(file => !/node_modules/gi.test(file)).filter(file => !/bower_components/gi.test(file))

    potential_fnames.map(file => this.findRuleAndMapInFile(file, selector))

    let ruleAndMap: RuleAndMap = null

    let found_fname: string = await (new Promise((resolve, reject) => detect(potential_fnames, async (file, callback) => {
      try {
        ruleAndMap = await this.findRuleAndMapInFile(file, selector)
        callback(null, true)
      } catch (error) {
        // findRuleAndMapInFile error
        console.log('error')
      }
    }, function (err, result) {
      resolve(result)
    })) as Promise<string>)

    

    return ruleAndMap
  }

  
  /**
   * Find the selector given the document and the current cursor position.
   * This is found by iterating forwards and backwards from the position to find a valid CSS class/id
   * 
   * @param {vscode.TextDocument} document - The Document to check
   * @param {vscode.Position} position - The current cursor position
   * @returns {string} The valid CSS class/ID
   * 
   * @memberOf PeekFileDefinitionProvider
   */
  findSelector(document: vscode.TextDocument, position: vscode.Position): string {
    const line: string = document.lineAt(position).text

    let startRange: vscode.Position = position
    let endRange: vscode.Position = position

    while (startRange.character > 0 && line.charAt(startRange.character - 1) != ' ' && line.charAt(startRange.character - 1) != '\'' && line.charAt(startRange.character - 1) != '"')
      startRange = startRange.translate(0, -1)

    while (endRange.character < line.length - 1 && line.charAt(endRange.character) != ' ' && line.charAt(endRange.character) != '\'' && line.charAt(endRange.character) != '"')
      endRange = endRange.translate(0, +1)

    return document.getText(new vscode.Range(startRange, endRange))
  }


  
  /**
   * Provide the definition. This is a required method for {@link vscode.DefinitionProvider}
   * 
   * @param {vscode.TextDocument} document
   * @param {vscode.Position} position
   * @param {vscode.CancellationToken} token
   * @returns {Promise<vscode.Definition>}
   * 
   * @memberOf PeekFileDefinitionProvider
   */
  async provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Promise<vscode.Definition> {
    const selector: string = this.findSelector(document, position)
    const ruleAndMap: RuleAndMap = await this.findRuleAndMap(selector)

    if (ruleAndMap) {
      let position: vscode.Position = null
      if (ruleAndMap.map) {
        const smc: SourceMap.SourceMapConsumer = new SourceMapConsumer(ruleAndMap.map)
        const srcPosition: SourceMap.Position = smc.originalPositionFor({ line: ruleAndMap.rule.position.start.line, column: ruleAndMap.rule.position.start.column })
        position = new vscode.Position(srcPosition.line - 1 || 0, srcPosition.column)
      } else {
        position = new vscode.Position(ruleAndMap.rule.position.start.line - 1 || 0, ruleAndMap.rule.position.start.column)
      }

      return new vscode.Location(vscode.Uri.file(ruleAndMap.file), position)
    }

    return null
  }
}
