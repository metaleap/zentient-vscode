import * as vs from 'vscode'
import vsproj = vs.workspace
import vswin = vs.window

import * as z from './zentient'
import * as zconn from './conn'


export function* onInit (isrespawn :boolean = false) {
    for (const ed of vswin.visibleTextEditors)
        onFileOpen(ed.document)
    if (!isrespawn) {
        yield vsproj.onDidOpenTextDocument(onFileOpen)
        yield vsproj.onDidCloseTextDocument(onFileClose)
    }
}


function onFileClose (doc :vs.TextDocument) {
    if (z.docOK(doc))
        zconn.sendMsg(zconn.MSG_FILE_CLOSE+doc.fileName)
}


function onFileOpen (doc :vs.TextDocument) {
    if (z.docOK(doc))
        zconn.sendMsg(zconn.MSG_FILE_OPEN+doc.fileName)
}
