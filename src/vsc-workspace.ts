import * as vs from 'vscode'
import vsproj = vs.workspace

import * as node_path from 'path'

import * as z from './zentient'
import * as zprocs from './procs'
import * as u from './util'

export function onActivate() {
    for (const td of vsproj.textDocuments)
        onTextDocumentOpened(td)
    z.regDisp(vsproj.onDidOpenTextDocument(onTextDocumentOpened))
}

function onTextDocumentOpened(e: vs.TextDocument) {
    const langid1 = e.languageId,
        langid2 = u.strTrimPrefix(node_path.extname(e.fileName), '.')
    let hasproc = zprocs.ensureProc(langid1)
    console.log(langid1 + ": " + hasproc)
    if (!hasproc) {
        hasproc = zprocs.ensureProc(langid2)
        console.log(langid2 + ": " + hasproc)
    }
}
