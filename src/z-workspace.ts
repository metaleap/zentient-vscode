import * as vs from 'vscode'
import vsproj = vs.workspace
import vswin = vs.window

import * as node_proc from 'child_process'
import * as node_path from 'path'

import * as z from './zentient'
import * as zcfg from './vsc-settings'
import * as zdiag from './z-diag'
import * as zipc from './ipc-protocol-msg-types'
import * as zipc_pipeio from './ipc-pipe-io'
import * as zipc_req from './ipc-req'


let fileEventsPending: WorkspaceChangesByLang = {}
let timeLastFileEvent: number = 0


type WorkspaceChangesByLang = { [_langid: string]: zipc.WorkspaceChanges }

export function onActivate() {
    z.vsCtx.subscriptions.push(
        vswin.onDidChangeActiveTextEditor(onTextEditorChanged),
        vsproj.onDidCloseTextDocument(onTextDocumentClosed),
        vsproj.onDidOpenTextDocument(onTextDocumentOpened),
        vsproj.onDidSaveTextDocument(onTextDocumentWritten),
        vsproj.onDidChangeWorkspaceFolders(onWorkspaceFolders),
        vsproj.onDidChangeTextDocument(onTextDocumentChanged)
    )
}

function fEvts(langId: string) {
    timeLastFileEvent = Date.now()
    let infos = fileEventsPending[langId]
    if (!infos)
        fileEventsPending[langId] = infos = { ClosedFiles: [], OpenedFiles: [], WrittenFiles: [], LiveFiles: {} }
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

function onTextDocumentChanged(evt: vs.TextDocumentChangeEvent) {
    const td = evt.document
    if (td && (!td.isUntitled) && uriOk(td) && td.languageId && zcfg.languageIdOk(td) && zcfg.liveLangs().includes(td.languageId)) {
        const fevts = fEvts(td.languageId)
        fevts.LiveFiles[td.fileName] = td.getText()
        if (fevts.WrittenFiles.includes(td.fileName))
            fevts.WrittenFiles = fevts.WrittenFiles.filter(fp => fp !== td.fileName)
    }
}

function onTextDocumentWritten(td: vs.TextDocument) {
    if (td && (!td.isUntitled) && uriOk(td)) {
        if (zcfg.languageIdOk(td)) {
            const fevts = fEvts(td.languageId)
            if (!fevts.WrittenFiles.includes(td.uri.fsPath))
                fevts.WrittenFiles.push(td.uri.fsPath)
            delete fevts.LiveFiles[td.uri.fsPath];
            if (!zcfg.liveLangs().includes(td.languageId))
                zdiag.refreshVisibleDiags(td.languageId, fevts.WrittenFiles)
        }

        if (td.fileName.startsWith("/home/_/c/")) {
            const filedirpath = node_path.dirname(td.fileName)
            if (td.fileName.endsWith(".ll"))
                try {
                    z.log("llmake:\n" + node_proc.execFileSync("llmake",
                        [node_path.basename(td.fileName)], { cwd: filedirpath }
                    ).toString())
                } catch (err) {
                    z.logWarn(err.toString())
                }
            if (td.fileName.endsWith(".c") || td.fileName.endsWith(".h"))
                try {
                    z.log("make:\n" + node_proc.execFileSync("make",
                        ["-s"], { cwd: filedirpath }
                    ).toString())
                } catch (err) {
                    z.logWarn(err.toString())
                }
        }
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
        const upd: zipc.WorkspaceChanges = { AddedDirs: [], RemovedDirs: [] }
        for (const dir of evt.added)
            if (dir && uriOk(dir))
                upd.AddedDirs.push(dir.uri.fsPath)
        for (const dir of evt.removed)
            if (dir && uriOk(dir))
                upd.RemovedDirs.push(dir.uri.fsPath)

        for (const langid of zcfg.langs())
            zipc_req.forLang<void>(langid, zipc.IDs.PROJ_CHANGED, upd)
    }
}

export function maybeSendFileEvents() {
    if ((Date.now() - timeLastFileEvent) < 123)
        return
    const fevts = fileEventsPending
    fileEventsPending = {}

    for (const langid in fevts) {
        const fe = fevts[langid];
        let isupd = (fe.ClosedFiles && fe.ClosedFiles.length > 0) || (fe.OpenedFiles && fe.OpenedFiles.length > 0) || (fe.WrittenFiles && fe.WrittenFiles.length > 0)
        if ((!isupd) && fe.LiveFiles)
            for (const _ in fe.LiveFiles) { isupd = true; break }
        if (isupd)
            zipc_req.forLang<void>(langid, zipc.IDs.PROJ_CHANGED, fe)
    }
}

export function sendInitialWorkspaceInfos(langId: string) {
    const infos: zipc.WorkspaceChanges = { OpenedFiles: [], AddedDirs: [] }
    for (const dir of vsproj.workspaceFolders)
        if (uriOk(dir))
            infos.AddedDirs.push(dir.uri.fsPath)

    for (const td of vsproj.textDocuments)
        if ((!td.isUntitled) && uriOk(td) && td.languageId && td.languageId === langId)
            infos.OpenedFiles.push(td.uri.fsPath)

    zipc_req.forLang<void>(langId, zipc.IDs.PROJ_CHANGED, infos)
}

export function writesPending(langId: string) {
    const fevt = fEvts(langId)
    return fevt.WrittenFiles.length > 0
}
