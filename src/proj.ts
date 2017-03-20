import * as vs from 'vscode'
import vsproj = vs.workspace

import * as zconn from './conn'


export function onInit (disps :vs.Disposable[]) {
    vsproj.onDidOpenTextDocument(onFileOpen, undefined, disps)
}


function onFileOpen (doc :vs.TextDocument) {
    return zconn.request("FO"+doc.fileName, zconn.Response.None)
}
