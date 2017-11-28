import * as vs from 'vscode'
import vsproj = vs.workspace
import vswin = vs.window

import * as z from './zentient'
import * as zprocs from './procs'


export function onActivate() {
    z.regDisp(vsproj.onDidOpenTextDocument(onTextDocumentOpened))
    z.regDisp(vswin.onDidChangeActiveTextEditor(onTextEditorActivated))

    for (const td of vsproj.textDocuments)
        onTextDocumentOpened(td)
}

function onTextDocumentOpened(td: vs.TextDocument) {
    if (td && td.languageId)        //  spawn the provider for this language early..
        zprocs.proc('', td.languageId)  // ..if one (A) exists and (B) isn't already up & running
}

function onTextEditorActivated(te: vs.TextEditor) {
    if (te)
        onTextDocumentOpened(te.document)
}
