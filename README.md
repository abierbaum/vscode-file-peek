# Functionality

This extension extends HTML and ejs code editing with `Go To Definition` support for css (classes and IDs) found in strings within the source code.

This was heavliy based off a [file peeker extension](https://github.com/abierbaum/vscode-file-peek) built for VSCode and was heavily inspired by a similar feature in [Brackets](http://brackets.io/).

![working](images/working.gif)

The extension supports all the normal capabilities of symbol definition tracking, but does it for file names.  This includes:

 * Peek: load the file inline and make quick edits right there. (`Ctrl+Shift+F12`)
 * Go To: jump directly to the file or open it in a new editor (`F12`)
 * Hover: show the definition in a hover over the symbol (`Ctrl+hover`)

See editor docs for more details
 * [Visual Studio Code: Goto Definition](https://code.visualstudio.com/docs/editor/editingevolved#_go-to-definition)
 * [Visual Studio Code: Peek](https://code.visualstudio.com/docs/editor/editingevolved#_peek)

# Contributing

Contributions are greatly appreciated.  Please fork the repository and submit a pull request.

# Changelog

## 1.1.0
    
  * Update Icon

## 1.0.0

  * Shamelessly copied code from [https://github.com/abierbaum/vscode-file-peek](https://github.com/abierbaum/vscode-file-peek)
