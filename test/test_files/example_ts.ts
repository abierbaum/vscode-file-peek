require('./example_js.js');
require('../../src/extension.ts');

var val = {
   html_template: './example.html',
   style_template: './example.scss'
};

class TestClass {
   something(val: string): string {
      return val;
   }
}