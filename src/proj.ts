import * as vs from 'vscode'
import vsproj = vs.workspace

import * as zconn from './conn'


export function onInit (disps :vs.Disposable[]) {
    vsproj.onDidOpenTextDocument(onFileOpen, undefined, disps)
    vsproj.onDidCloseTextDocument(onFileClose, undefined, disps)
}


function onFileClose (doc :vs.TextDocument) {
    if (doc.uri.scheme === 'file')
        zconn.msg(zconn.MSG_FILE_CLOSE+doc.fileName, zconn.Response.None)
}


function onFileOpen (doc :vs.TextDocument) {
    if (doc.uri.scheme === 'file')
        zconn.msg(zconn.MSG_FILE_OPEN+doc.fileName, zconn.Response.None)
}
