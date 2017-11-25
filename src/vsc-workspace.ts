import * as vs from 'vscode'
import vsproj = vs.workspace

import * as z from './zentient'
import * as zprocs from './procs'


export function onActivate() {
    z.regDisp(vsproj.onDidOpenTextDocument(onTextDocumentOpened))

    for (const td of vsproj.textDocuments)
        onTextDocumentOpened(td)
}

export function onTextDocumentOpened(e: vs.TextDocument) {
    //  spawn the backend program for this language if one exists and isn't already up & running
    zprocs.proc(e.languageId)
}
