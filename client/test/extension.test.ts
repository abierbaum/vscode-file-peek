// 
// Note: This example test is leveraging the Mocha test framework.
// Please refer to their documentation on https://mochajs.org/ for help.
//

// The module 'assert' provides assertion methods from node
import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';

import {
  TextDocument as ServerTextDocument
} from 'vscode-languageserver';

import findSelector from './../../server/src/core/findSelector';
import { create } from './../../server/src/logger';


// Defines a Mocha test suite to group tests of similar kind together
describe("Extension Tests", () => {

	let document: vscode.TextDocument;
	let document2: ServerTextDocument;

	before(done => {
		console.log('before')
		create(console as any);
		vscode.workspace.openTextDocument(`${vscode.workspace.rootPath}/example.html`)
			.then(doc => {
				document = doc;
				document2 = ServerTextDocument.create(doc.uri.toString(), doc.languageId, doc.version, doc.getText());
				done();
			}, error => {
				done(error);
			})
	})

	// Defines a Mocha unit test
	describe("findSelector", () => {
		const classTestPos: vscode.Position = new vscode.Position(4, 19);
		const idTestIDPos: vscode.Position = new vscode.Position(4, 38);
		// const idCommonPos: vscode.Position = new vscode.Position(4, 43);

		// const invalidPos: vscode.Position = new vscode.Position(1000, 19);
		const notAnAttributePos: vscode.Position = new vscode.Position(4, 30);
		const notAnAttributePos2: vscode.Position = new vscode.Position(4, 53);

		it("can find the right id selector in a simple 'testID' case", () => {
			assert.ok(document);
			const selector: { attribute: String; value: String; } = findSelector(document2, idTestIDPos);
			assert.equal(selector.attribute, "id");
			assert.equal(selector.value, "testID");
		})

		it("can find the right class selector in a simple 'test' case", () => {
			assert.ok(document);
			const selector: { attribute: String; value: String; } = findSelector(document2, classTestPos);
			assert.equal(selector.attribute, "class");
			assert.equal(selector.value, "test");
		})

		//TODO: Add test case for HTML tags

		it("throws an error for an invalid position", () => {
			assert.ok(document);			
			let selector: { attribute: String; value: String; } = findSelector(document2, notAnAttributePos);
			assert.equal(selector, null);
			selector = findSelector(document2, notAnAttributePos2);
			assert.equal(selector, null);
		})
	});

	//TODO: Add tests to actually query the definition from the document and ensure definitions are found

});