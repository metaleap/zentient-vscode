import * as node_fs from 'fs';
import * as ts from 'typescript';

const filePathDts = "node_modules/vscode/vscode.d.ts" // "node_modules/@types/vscode/index.d.ts"
const dtsfile = ts.createSourceFile(filePathDts, node_fs.readFileSync(filePathDts).toString(), ts.ScriptTarget.ES2020, true, ts.ScriptKind.TS)
const dtsjson = JSON.stringify(dtsfile, function (this, key, val) {
    return (key === 'parent' || (key === 'text' && !this.parent)) ? undefined : val
}, 4)
node_fs.writeFileSync("files/vscode.d.ts.json", dtsjson)
