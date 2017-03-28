import * as vs from 'vscode'
import vsproj = vs.workspace
import vswin = vs.window

import * as z from './zentient'
import * as zconn from './conn'


let vsreg: boolean = false


export function cfgToolFmt (zid: string) {
    return vsproj.getConfiguration().get<string>("zen.tool.fmt." + zid)
}


export function* onAlive () {
    for (const ed of vswin.visibleTextEditors)
        onFileOpen(ed.document)
    if (!vsreg) { // might be respawn
        yield vsproj.onDidOpenTextDocument(onFileOpen)
        yield vsproj.onDidSaveTextDocument(onFileWrite)
        yield vsproj.onDidCloseTextDocument(onFileClose)
        vsreg = true
    }
}


function onFileEvent (file: vs.TextDocument, msg: string) {
    const langzid = z.fileLangZid(file)
    if (langzid) zconn.sendMsg(msg + langzid + ':' + vsproj.asRelativePath(file.fileName))
}

function onFileClose (file: vs.TextDocument) {
    //  for uri.scheme==='file', occurs only on real close, not on editor tab deactivate
    onFileEvent(file, zconn.MSG_FILE_CLOSE)
}

function onFileOpen (file: vs.TextDocument) {
    //  for uri.scheme==='file', occurs on open and whenever editor tab activate
    onFileEvent(file, zconn.MSG_FILE_OPEN)
}

function onFileWrite (file: vs.TextDocument) {
    onFileEvent(file, zconn.MSG_FILE_WRITE)
}
