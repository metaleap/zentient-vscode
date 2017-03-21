import * as vs from 'vscode'
import vsproj = vs.workspace
import vswin = vs.window

import * as z from './zentient'
import * as zconn from './conn'


export function onInit (disps :vs.Disposable[]) {
    for (const ed of vswin.visibleTextEditors)
        onFileOpen(ed.document)
    disps.push(vsproj.onDidOpenTextDocument(onFileOpen))
    disps.push(vsproj.onDidCloseTextDocument(onFileClose))
}


function onFileClose (doc :vs.TextDocument) {
    if (z.docOK(doc))
        zconn.sendMsg(zconn.MSG_FILE_CLOSE+doc.fileName)
}


function onFileOpen (doc :vs.TextDocument) {
    if (z.docOK(doc))
        zconn.sendMsg(zconn.MSG_FILE_OPEN+doc.fileName)
}
