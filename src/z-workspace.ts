import * as vs from 'vscode'
import vsproj = vs.workspace

import * as z from './zentient'
import * as zcfg from './vsc-settings'
import * as zdiag from './z-diag'
import * as zipc_pipeio from './ipc-pipe-io'
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

function fEvts(langId: string) {
    let infos = fileEventsPending[langId]
    if (!infos)
        fileEventsPending[langId] = infos = { ClosedFiles: [], OpenedFiles: [], WrittenFiles: [] }
    return infos
}

export function uriOk(obj: { uri: vs.Uri }) {
    return obj && obj.uri && obj.uri.scheme === 'file' && obj.uri.fsPath
}

function onTextDocumentClosed(td: vs.TextDocument) {
    if (td && (!td.isUntitled) && uriOk(td) && zcfg.langOk(td.languageId)) {
        if (zipc_pipeio.last && zipc_pipeio.last.filePath === td.fileName)
            zipc_pipeio.setLast(zipc_pipeio.last.langId, undefined)
        const fevts = fEvts(td.languageId)
        if (fevts.OpenedFiles.includes(td.uri.fsPath))
            fevts.OpenedFiles = fevts.OpenedFiles.filter(fp => fp !== td.uri.fsPath)
        if (!fevts.ClosedFiles.includes(td.uri.fsPath))
            fevts.ClosedFiles.push(td.uri.fsPath)
        zdiag.refreshVisibleDiags(td.languageId, fevts.ClosedFiles)
    }
}

function onTextDocumentWritten(td: vs.TextDocument) {
    if (td && (!td.isUntitled) && uriOk(td) && zcfg.langOk(td.languageId)) {
        const fevts = fEvts(td.languageId)
        if (!fevts.WrittenFiles.includes(td.uri.fsPath))
            fevts.WrittenFiles.push(td.uri.fsPath)
        zdiag.refreshVisibleDiags(td.languageId, fevts.WrittenFiles)
    }
}

function onTextDocumentOpened(td: vs.TextDocument) {
    if (td && (!td.isUntitled) && uriOk(td) && zcfg.langOk(td.languageId)) {
        const fevts = fEvts(td.languageId)
        if (fevts.ClosedFiles.includes(td.uri.fsPath))
            fevts.ClosedFiles = fevts.ClosedFiles.filter(fp => fp !== td.uri.fsPath)
        fevts.OpenedFiles.push(td.uri.fsPath)
        zdiag.refreshVisibleDiags(td.languageId, [])
    }
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

export function writesPending(langId: string) {
    return fEvts(langId).WrittenFiles.length > 0
}
