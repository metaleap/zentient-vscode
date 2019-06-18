import * as vs from 'vscode'
import vsproj = vs.workspace
import vswin = vs.window

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
    LiveFiles?: { [_filePath: string]: string }
}

export function onActivate() {
    z.regDisp(
        vswin.onDidChangeActiveTextEditor(onTextEditorChanged),
        vsproj.onDidCloseTextDocument(onTextDocumentClosed),
        vsproj.onDidOpenTextDocument(onTextDocumentOpened),
        vsproj.onDidSaveTextDocument(onTextDocumentWritten),
        vsproj.onDidChangeWorkspaceFolders(onWorkspaceFolders)
    )
}

function fEvts(langId: string) {
    let infos = fileEventsPending[langId]
    if (!infos)
        fileEventsPending[langId] = infos = { ClosedFiles: [], OpenedFiles: [], WrittenFiles: [] }
    return infos
}

export function fireUp() {
    for (const td of vsproj.textDocuments)
        if (uriOk(td))
            zipc_pipeio.proc(undefined, td.languageId)
}

export function uriOk(obj: { uri: vs.Uri }) {
    return obj && obj.uri && obj.uri.scheme === 'file' && (obj.uri.fsPath ? true : false)
}

function onTextDocumentClosed(td: vs.TextDocument) {
    if (td && (!td.isUntitled) && uriOk(td) && zcfg.languageIdOk(td)) {
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
    if (td && (!td.isUntitled) && uriOk(td) && zcfg.languageIdOk(td)) {
        const fevts = fEvts(td.languageId)
        if (!fevts.WrittenFiles.includes(td.uri.fsPath))
            fevts.WrittenFiles.push(td.uri.fsPath)
        zdiag.refreshVisibleDiags(td.languageId, fevts.WrittenFiles)
    }
}

function onTextDocumentOpened(td: vs.TextDocument) {
    if (td && (!td.isUntitled) && uriOk(td) && zcfg.languageIdOk(td)) {
        const fevts = fEvts(td.languageId)
        if (fevts.ClosedFiles.includes(td.uri.fsPath))
            fevts.ClosedFiles = fevts.ClosedFiles.filter(fp => fp !== td.uri.fsPath)
        if (!fevts.OpenedFiles.includes(td.uri.fsPath))
            fevts.OpenedFiles.push(td.uri.fsPath)
        zdiag.refreshVisibleDiags(td.languageId, [])
    }
}

function onTextEditorChanged(te: vs.TextEditor) {
    if (te && uriOk(te.document) && (!te.document.isUntitled) && zcfg.languageIdOk(te.document))
        zipc_pipeio.setLast(te.document.languageId, te.document.fileName)
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
    let dirtyedlangs: string[] = []
    const fevts = fileEventsPending
    fileEventsPending = {}

    const livelangs = zcfg.liveLangs()
    if (livelangs.length > 0) {
        for (const ed of vswin.visibleTextEditors)
            if (ed && ed.document && ed.document.isDirty && ed.document.fileName && ed.document.languageId
                && !(ed.document.isUntitled || dirtyedlangs.includes(ed.document.languageId)))
                dirtyedlangs.push(ed.document.languageId)
        if (dirtyedlangs.length)
            for (const langid of dirtyedlangs)
                if (!fevts[langid])
                    fevts[langid] = {}
    }

    for (const langid in fevts) {
        const fe = fevts[langid];
        if (dirtyedlangs.includes(langid))
            for (const ed of vswin.visibleTextEditors)
                if (ed && ed.document && ed.document.isDirty && ed.document.fileName && ed.document.languageId && !ed.document.isUntitled) {
                    if (fe.ClosedFiles && fe.ClosedFiles.length && fe.ClosedFiles.includes(ed.document.fileName))
                        fe.ClosedFiles = fe.ClosedFiles.filter(f => f !== ed.document.fileName)
                    if (fe.WrittenFiles && fe.WrittenFiles.length && fe.WrittenFiles.includes(ed.document.fileName))
                        fe.WrittenFiles = fe.WrittenFiles.filter(f => f !== ed.document.fileName)
                    if (!fe.LiveFiles)
                        fe.LiveFiles = {}
                    fe.LiveFiles[ed.document.fileName] = ed.document.getText()
                }
        zipc_req.forLang<void>(langid, zipc_req.IpcIDs.PROJ_CHANGED, fe)
    }
}

export function sendInitialWorkspaceInfos(langId: string) {
    const infos: WorkspaceChanges = { OpenedFiles: [], AddedDirs: [] }
    for (const dir of vsproj.workspaceFolders)
        if (uriOk(dir))
            infos.AddedDirs.push(dir.uri.fsPath)

    for (const td of vsproj.textDocuments)
        if ((!td.isUntitled) && uriOk(td) && td.languageId && td.languageId === langId)
            infos.OpenedFiles.push(td.uri.fsPath)

    zipc_req.forLang<void>(langId, zipc_req.IpcIDs.PROJ_CHANGED, infos)
}

export function writesPending(langId: string) {
    return fEvts(langId).WrittenFiles.length > 0
}
