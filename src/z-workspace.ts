import * as vs from 'vscode'
import vsproj = vs.workspace

import * as z from './zentient'
import * as zcfg from './vsc-settings'
import * as zipc_req from './ipc-req'


let fileEventsPending: WorkspaceChangesByLang = {}


type WorkspaceChangesByLang = { [_langid: string]: WorkspaceChanges }

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

function fevts(langId: string) {
    let infos = fileEventsPending[langId]
    if (!infos)
        fileEventsPending[langId] = infos = { ClosedFiles: [], OpenedFiles: [], WrittenFiles: [] }
    return infos
}

function uriOk(obj: { uri: vs.Uri }) {
    return obj && obj.uri && obj.uri.scheme === 'file' && obj.uri.fsPath
}

function onTextDocumentClosed(td: vs.TextDocument) {
    if (td && (!td.isUntitled) && uriOk(td) && zcfg.langOk(td.languageId))
        fevts(td.languageId).ClosedFiles.push(td.uri.fsPath)
}

function onTextDocumentWritten(td: vs.TextDocument) {
    if (td && (!td.isUntitled) && uriOk(td) && zcfg.langOk(td.languageId))
        fevts(td.languageId).WrittenFiles.push(td.uri.fsPath)
}

function onTextDocumentOpened(td: vs.TextDocument) {
    if (td && (!td.isUntitled) && uriOk(td) && zcfg.langOk(td.languageId))
        fevts(td.languageId).OpenedFiles.push(td.uri.fsPath)
}

function onWorkspaceFolders(evt: vs.WorkspaceFoldersChangeEvent) {
    if (evt && ((evt.added && evt.added.length) || (evt.removed && evt.removed.length))) {
        const upd: WorkspaceChanges = { AddedDirs: [], RemovedDirs: [] }
        for (const dir of evt.added)
            if (dir && uriOk(dir))
                upd.AddedDirs.push(dir.uri.fsPath)
        for (const dir of evt.removed)
            if (dir && uriOk(dir))
                upd.RemovedDirs.push(dir.uri.fsPath)

        for (const langid of zcfg.langs())
            zipc_req.forLang<void>(langid, zipc_req.IpcIDs.PROJ_CHANGED, upd)
    }
}

export function maybeSendFileEvents() {
    let hasany = false
    const fevts = fileEventsPending
    for (const _checkifany in fevts) { hasany = true; fileEventsPending = {}; break }
    if (hasany)
        for (const langid in fevts)
            zipc_req.forLang<void>(langid, zipc_req.IpcIDs.PROJ_CHANGED, fevts[langid])
}

function sendInitialWorkspaceInfos() {
    const dirs: string[] = []
    for (const dir of vsproj.workspaceFolders)
        if (uriOk(dir))
            dirs.push(dir.uri.fsPath)

    const infos: WorkspaceChangesByLang = {}
    for (const langid of zcfg.langs())
        infos[langid] = { OpenedFiles: [], AddedDirs: dirs }

    for (const td of vsproj.textDocuments)
        if ((!td.isUntitled) && uriOk(td) && td.languageId && infos[td.languageId])
            infos[td.languageId].OpenedFiles.push(td.uri.fsPath)

    for (const langid in infos)
        zipc_req.forLang<void>(langid, zipc_req.IpcIDs.PROJ_CHANGED, infos[langid])
}
