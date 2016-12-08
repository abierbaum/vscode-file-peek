// 
// Note: This example test is leveraging the Mocha test framework.
// Please refer to their documentation on https://mochajs.org/ for help.
//

// The module 'assert' provides assertion methods from node
import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import * as myExtension from '../src/extension';

import * as fs from 'fs';


// Defines a Mocha test suite to group tests of similar kind together
describe("Extension Tests", () => {

	let document: vscode.TextDocument;

	before(done => {
		vscode.workspace.openTextDocument(`${vscode.workspace.rootPath}/example.html`)
			.then(doc => {
				document = doc;
				done();
			}, error => {
				done();
			})
	})

	// Defines a Mocha unit test
	describe("findSelector", () => {
		const classTestPos: vscode.Position = new vscode.Position(4, 19);
		const idTestIDPos: vscode.Position = new vscode.Position(4, 38);
		const idCommonPos: vscode.Position = new vscode.Position(4, 43);

		const invalidPos: vscode.Position = new vscode.Position(1000, 19);
		const notAnAttributePos: vscode.Position = new vscode.Position(4, 30);
		const notAnAttributePos2: vscode.Position = new vscode.Position(4, 53);

		it("can find the right id selector in a simple 'testID' case", () => {
			assert.ok(document);
			const selector: { attribute: String; value: String; } = myExtension.PeekCSSDefinitionProvider.findSelector(document, idTestIDPos);
			assert.equal(selector.attribute, "id");
			assert.equal(selector.value, "testID");
		})

		it("can find the right class selector in a simple 'test' case", () => {
			assert.ok(document);
			const selector: { attribute: String; value: String; } = myExtension.PeekCSSDefinitionProvider.findSelector(document, classTestPos);
			assert.equal(selector.attribute, "class");
			assert.equal(selector.value, "test");
		})

		xit("can find the right id selector in a complex 'common' case (common name for class and id)", () => {
			assert.ok(document);
			const selector: { attribute: String; value: String; } = myExtension.PeekCSSDefinitionProvider.findSelector(document, classTestPos);
			assert.equal(selector.attribute, "id");
			assert.equal(selector.value, "common");
		})

		it("throws an error for an invalid position", () => {
			assert.ok(document);			
			assert.throws(() => {
				const selector: { attribute: String; value: String; } = myExtension.PeekCSSDefinitionProvider.findSelector(document, notAnAttributePos);
			}, /Not a Valid CSS selector/)
			assert.throws(() => {
				const selector: { attribute: String; value: String; } = myExtension.PeekCSSDefinitionProvider.findSelector(document, notAnAttributePos2);
			}, /Not a Valid CSS selector/)
		})
	});

	describe("compileCss", () => {

		it("can return css for a css file", done => {
			fs.readFile(`${vscode.workspace.rootPath}/stylesheet.css`, 'utf8', (err, data) => {
				if (!err) {
					myExtension.PeekCSSDefinitionProvider.compileCSS(`${vscode.workspace.rootPath}/stylesheet.css`, data).then(css => {
						assert.equal(css.css, data);
						assert.equal(css.map, null);
						done();
					}).catch(reason => {
						done(reason);
					})
				} else {
					done(err);
				}
			});
		});

		xit("can return css for a less file", done => {
			fs.readFile(`${vscode.workspace.rootPath}/stylesheet.css`, 'utf8', (err, data) => {
				if (!err) {
					myExtension.PeekCSSDefinitionProvider.compileCSS(`${vscode.workspace.rootPath}/stylesheet.less`, data).then(css => {
						assert.equal(css.css, data);
						// assert.equal(css.map, null);
						done();
					}).catch(e => {
						assert.fail();
						done();
					})
				} else {
					console.error("could not open css file");
					done();
				}
			});
		});

	});

	describe("findRuleAndMapInFile", () => {

		const selector: { attribute: string; value: string; } = {
			attribute: "class",
			value: "test"
		}
		const invalidSelector = Object.assign({}, selector, { value: "this_does-not-exist" });

		const rule = {
			type: 'rule',
			selectors: ['.test'],
			declarations: [
				{
					type: 'declaration',
					property: 'background-color',
					value: '#fff',
					position: {
						end: {
							column: 25,
							line: 6
						},
						start: {
							column: 3,
							line: 6
						},
						source: `${vscode.workspace.rootPath}/stylesheet.css`
					}
				}
			],
			position: {
				end: {
					column: 2,
					line: 7
				},
				start: {
					column: 1,
					line: 5
				},
				source: `${vscode.workspace.rootPath}/stylesheet.css`
			}
		}


		it("fails on an invalid file", done => {
			myExtension.PeekCSSDefinitionProvider.findRuleAndMapInFile(`${vscode.workspace.rootPath}/file_does_not_exist.css`, selector).then(ruleAndMap => {
				done(new Error("didn't fail"));
			}).catch(reason => {
				assert.equal(reason.message, "ENOENT: no such file or directory, open '" + `${vscode.workspace.rootPath}/file_does_not_exist.css` + "'")
				done();
			});
		})

		it("fails if the stylesheet is empty", done => {
			myExtension.PeekCSSDefinitionProvider.findRuleAndMapInFile(`${vscode.workspace.rootPath}/empty_stylesheet.css`, selector).then(ruleAndMap => {
				done("didn't fail");
			}).catch(reason => {
				assert.equal(reason.message, "CSS rule not found in " + `${vscode.workspace.rootPath}/empty_stylesheet.css`)
				done();
			});
		})

		it("fails when the selector doesn't exist in the stylesheet", done => {
			
			myExtension.PeekCSSDefinitionProvider.findRuleAndMapInFile(`${vscode.workspace.rootPath}/stylesheet.css`, invalidSelector).then(ruleAndMap => {
				done(new Error("didn't fail"));
			}).catch(reason => {
				assert.equal(reason.message, "CSS rule not found in " + `${vscode.workspace.rootPath}/stylesheet.css`)
				done();
			});
		})

		it("can find a simple rule in a css file", done => {
			myExtension.PeekCSSDefinitionProvider.findRuleAndMapInFile(`${vscode.workspace.rootPath}/stylesheet.css`, selector).then(ruleAndMap => {
				assert.ok(ruleAndMap);
				assert.equal(ruleAndMap.file, `${vscode.workspace.rootPath}/stylesheet.css`);
				assert.equal(ruleAndMap.map, null);
				assert.deepEqual(ruleAndMap.rule, rule);
				done();
			}).catch(reason => {
				done(reason);
			})

		})

	})

	describe("findRuleAndMap", () => {
		const definitionProvider: myExtension.PeekCSSDefinitionProvider = new myExtension.PeekCSSDefinitionProvider(["css", "less", "scss"]);

		const selector: { attribute: string; value: string; } = {
			attribute: "class",
			value: "test"
		}
		const invalidSelector = Object.assign({}, selector, { value: "this_does-not-exist" });

		const rule = {
			type: 'rule',
			selectors: ['.test'],
			declarations: [
				{
					type: 'declaration',
					property: 'background-color',
					value: '#fff',
					position: {
						end: {
							column: 25,
							line: 6
						},
						start: {
							column: 3,
							line: 6
						},
						source: `${vscode.workspace.rootPath}/stylesheet.css`
					}
				}
			],
			position: {
				end: {
					column: 2,
					line: 7
				},
				start: {
					column: 1,
					line: 5
				},
				source: `${vscode.workspace.rootPath}/stylesheet.css`
			}
		}

		it("returns null if no rule found for the given selector", done => {
				definitionProvider.findRuleAndMap(invalidSelector).then(ruleAndMap => {
					assert.ifError(ruleAndMap);
					done();
				}).catch(reason => {
					done(reason);
				})
		})

		it("can find a simple rule in a css file", done => {
				definitionProvider.findRuleAndMap(selector).then(ruleAndMap => {
					assert.ok(ruleAndMap);
					assert.equal(ruleAndMap.file, `${vscode.workspace.rootPath}/stylesheet.css`);
					assert.equal(ruleAndMap.map, null);
					assert.deepEqual(ruleAndMap.rule, rule);
					done();
				}).catch(reason => {
					done(reason);
				})
		})

	})

	

});