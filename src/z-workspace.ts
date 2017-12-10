import * as vs from 'vscode'
import vsproj = vs.workspace

import * as z from './zentient'
import * as zcfg from './vsc-settings'
import * as zipc_req from './ipc-req'


export interface WorkspaceChanges {
    AddedDirs?: string[]
    RemovedDirs?: string[]
    OpenedFiles?: string[]
    ClosedFiles?: string[]
    WrittenFiles?: string[]
}

export function onActivate() {
    sendInitialWorkspaceInfos()

    z.regDisp(vsproj.onDidCloseTextDocument(onTextDocumentClosed))
    z.regDisp(vsproj.onDidOpenTextDocument(onTextDocumentOpened))
    z.regDisp(vsproj.onDidSaveTextDocument(onTextDocumentWritten))
    z.regDisp(vsproj.onDidChangeWorkspaceFolders(onWorkspaceFolders))
}

function uriOk(obj: { uri: vs.Uri }) {
    return obj && obj.uri && obj.uri.scheme === 'file' && obj.uri.fsPath
}

function onTextDocumentClosed(td: vs.TextDocument) {
    if (td && !td.isUntitled)
        console.log("FCLOSE:\t" + td.fileName)
}

function onTextDocumentWritten(td: vs.TextDocument) {
    if (td && !td.isUntitled)
        console.log("FSAVE:\t" + td.fileName)
}

function onTextDocumentOpened(td: vs.TextDocument) {
    if (td && !td.isUntitled)
        console.log("FOPEN:\t" + td.fileName)
}

function onWorkspaceFolders(evt: vs.WorkspaceFoldersChangeEvent) {
    console.log(evt)
}

function sendInitialWorkspaceInfos() {
    const dirs: string[] = []
    for (const dir of vsproj.workspaceFolders)
        if (uriOk(dir))
            dirs.push(dir.uri.fsPath)

    const infos: { [_langid: string]: WorkspaceChanges } = {}
    for (const langid of zcfg.langs())
        infos[langid] = { OpenedFiles: [], AddedDirs: dirs }

    for (const td of vsproj.textDocuments)
        if ((!td.isUntitled) && uriOk(td) && td.languageId && infos[td.languageId])
            infos[td.languageId].OpenedFiles.push(td.uri.fsPath)

    for (const langid in infos)
        zipc_req.forLang<void>(langid, zipc_req.IpcIDs.proj_Changed, infos[langid], () => { })
}
