var example = require('./example_js.js');
require('../../src/extension.ts');

var val = {
   html_template: './example.html',
   style_template: './example.scss',
   example: './example.html',
   sass_full: './my_style.scss',
   sass_short: './my_style',
   example_short: './example',
   js_short: './example_js',
   ts_short: './example_ts',

   alt_ext_my_style: './my_style.css',
   alt_ext_stylesheet: './stylesheet.scss',
};

class TestClass {
   something(val: string): string {
      return val;
   }
}