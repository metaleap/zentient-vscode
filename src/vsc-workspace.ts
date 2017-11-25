import * as vs from 'vscode'
import vsproj = vs.workspace
import vswin = vs.window

import * as node_path from 'path'

import * as z from './zentient'
import * as zprocs from './procs'
import * as zcfg from './vsc-settings'
import * as u from './util'

export function onActivate() {
    z.regDisp(vsproj.onDidOpenTextDocument(onTextDocumentOpened))

    for (const td of vsproj.textDocuments)
        onTextDocumentOpened(td)
}

export function onTextDocumentOpened(e: vs.TextDocument) {
    let langid = e.languageId,
        progname = zcfg.langProg(langid)
    if (!progname) {
        const langid2 = u.strTrimPrefix(node_path.extname(e.fileName), '.')
        const progname2 = zcfg.langProg(langid2)
        if (progname2) {
            progname = progname2
            langid = langid2
        }
    }
    if (progname) {
        const proc = zprocs.proc(langid)
        if (!proc)
            vswin.showWarningMessage(`Could not run Zentient backend program '${progname}' for ${langid} files`)
    }
}
