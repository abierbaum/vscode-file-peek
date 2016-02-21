import * as vscode from 'vscode';

import * as fs   from 'fs';
import * as path from 'path';

/**
 * Setup to support typescript and javascript source code.
 */
const PEEK_FILTER: vscode.DocumentFilter[] = [
   {
      language: 'typescript',
      scheme:   'file'
   }, {
      language: 'javascript',
      scheme:   'file'
   }
];

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "vscode-file-peek" is now active!');

   /*
   vscode.languages.getLanguages().then((languages: string[]) => {
      console.log("Known languages: " + languages);
   });
   */

   // Register the definition provider
   context.subscriptions.push(vscode.languages.registerDefinitionProvider(PEEK_FILTER, new PeekFileDefinitionProvider()));
}

// this method is called when your extension is deactivated
export function deactivate() {
}


/**
 * Provide the lookup so we can peek into the files.
 */
class PeekFileDefinitionProvider implements vscode.DefinitionProvider {

   provideDefinition(document: vscode.TextDocument,
                     position: vscode.Position,
                     token: vscode.CancellationToken): vscode.Definition {
      // todo: make this method operate async
      let working_dir = path.dirname(document.fileName);
      let word        = document.getText(document.getWordRangeAtPosition(position));
      let line        = document.lineAt(position);

      //console.log('====== peek-file definition lookup ===========');
      //console.log('word: ' + word);
      //console.log('line: ' + line.text);

      // We are looking for strings with filenames
      // - simple hack for now we look for the string with our current word in it on our line
      //   and where our cursor position is inside the string
      let re_str = `\"(.*?${word}.*?)\"|\'(.*?${word}.*?)\'`;
      let match = line.text.match(re_str);

      //console.log('re_str: ' + re_str);
      //console.log("   Match: ", match);

      if (null !== match)
      {
         let potential_fname = match[1] || match[2];
         let match_start = match.index;
         let match_end   = match.index + potential_fname.length;

         // Verify the match string is at same location as cursor
         if((position.character >= match_start) &&
            (position.character <= match_end))
         {
            let full_path   = path.resolve(working_dir, potential_fname);

            //console.log(" Match: ", match);
            //console.log(" Fname: " + potential_fname);
            //console.log("  Full: " + full_path);

            if(fs.existsSync(full_path)) {
               return new vscode.Location(vscode.Uri.file(full_path), new vscode.Position(0, 1));
            }
         }
      }

      return null;
   }
}
