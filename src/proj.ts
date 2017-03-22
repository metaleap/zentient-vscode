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
        yield vsproj.onDidSaveTextDocument(onFileWrite)
    }
}


function onFileOpen (file :vs.TextDocument) {
    const langzid = z.fileLangZid(file)
    if (langzid)
        zconn.sendMsg(zconn.MSG_FILE_OPEN+langzid+':'+ensureRelPath(file))
}

function onFileWrite (file :vs.TextDocument) {
    const langzid = z.fileLangZid(file)
    if (langzid)
        zconn.sendMsg(zconn.MSG_FILE_WRITE+langzid+':'+ensureRelPath(file))
}


function ensureRelPath (file :vs.TextDocument) {
    let relpath :string = file['zrelpath']
    if (!relpath)
        file['zrelpath'] = relpath = vsproj.asRelativePath(file.fileName)
    return relpath
}
