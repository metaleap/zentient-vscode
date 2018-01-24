import * as vs from 'vscode'
import vsproj = vs.workspace
import vswin = vs.window

import * as u from './util'

import * as zcaddies from './z-caddies'
import * as zcfg from './vsc-settings'
import * as zdiag from './z-diag'
import * as zextras from './z-extras'
import * as zfavdirs from './edtitle-favdirs'
import * as zfavtermcmds from './edtitle-favtermcmds'
import * as zipc_pipeio from './ipc-pipe-io'
import * as zipc_req from './ipc-req'
import * as zmenu from './z-menu'
import * as zproj from './z-workspace'
import * as zsrc from './z-src'
import * as zvscmd from './vsc-commands'
import * as zvsdbg from './vsc-dbg-launch'
import * as zvslang from './vsc-langs'
import * as zvspage from './vsc-pageview'
import * as zvsterms from './vsc-terminals'
import * as zvstree from './vsc-trees'


export const Z = "ℤ",
    _Z_ = "⟨ℤ⟩" // ❬❭

export let regDisp: (...disps: vs.Disposable[]) => number

let out: vs.OutputChannel


export function deactivate() {
    zipc_pipeio.onDeactivate()
}

export function activate(vsctx: vs.ExtensionContext) {
    regDisp = vsctx.subscriptions.push

    zfavdirs.onActivate()
    zvsterms.onActivate()
    zfavtermcmds.onActivate()
    regDisp(out = vswin.createOutputChannel(_Z_))
    logWelcomeMsg()

    zmenu.onActivate() // only registers commands
    zextras.onActivate() // dito
    zdiag.onActivate() // only creates diag collections
    zvslang.onActivate() // only registers intellisense provider functions
    zvspage.onActivate()

    if (0 > 1) zvstree.onActivate()
    zvscmd.ensure('zen.internal.objSnap', onReqObjSnap)
    zvscmd.ensure('zen.internal.openFileAt', zsrc.openSrcFileAtPos)

    zproj.onActivate() // on-file/dir/editor events
    zvsdbg.onActivate()
    zproj.fireUp()
    zcaddies.onActivate()
}

export function findTextEditor(filePath: string) {
    return vswin.visibleTextEditors.find(te => te && te.document && te.document.uri && te.document.uri.fsPath === filePath)
}

export function findTextFile(filePath: string) {
    return vsproj.textDocuments.find(d => d && d.uri && d.uri.fsPath === filePath)
}

export function log(message: any, warn = false, autoShowWarn = true) {
    if (!message) return

    const msg = (typeof message === 'string') ? message : (message + '\t▶▶▶\t' + JSON.stringify(message, null, "  "))
    out.appendLine(warn ? `❗ ${msg}` : msg)
    out.appendLine('————————————————')
    if (warn) {
        putStatus(msg, 6789)
        if (autoShowWarn)
            vswin.showErrorMessage(msg)
    }
}

export function logWarn(message: any, autoShowWarn = true) {
    log(message, true, autoShowWarn)
}

function logWelcomeMsg() {
    const msglns = ["No languages configured for Zentient in any 'settings.json's 'zen.langProgs' section."]
    const langprogs = zcfg.langProgs()
    for (const langid in langprogs)
        msglns.push(`➜ for '${langid}' files: `
            + ((langprogs[langid]) ? `'${langprogs[langid]}'` : "(disabled in your 'settings.json')"))
    if (msglns.length > 1)
        msglns[0] = "Hi, Zentient will run:"
    log(msglns.join('\n'))
}

export function putStatus(text: string, milliSeconds: number = 2345) {
    regDisp(vswin.setStatusBarMessage(text, milliSeconds))
}

let lastobjsnappath = 'go.proj.'
function onReqObjSnap() {
    vswin.showInputBox({ ignoreFocusOut: true, prompt: "objSnapPath?", value: lastobjsnappath }).then(objsnappath => {
        if (objsnappath) {
            lastobjsnappath = objsnappath
            const idx = objsnappath.indexOf('.')
            if (idx)
                zipc_req.forLang<void>(objsnappath.slice(0, idx), zipc_req.IpcIDs.OBJ_SNAPSHOT, objsnappath)
        }
    })
}

export function onRoughlyEverySecondOrSo() {
    zcaddies.deColorizeOlderIcons()
}

export function openJsonDocumentEditorFor(value: any) {
    return vsproj.openTextDocument({
        language: 'json', content: JSON.stringify(value, undefined, "\t")
    }).then(td => { vswin.showTextDocument(td, vs.ViewColumn.Two) }, u.onReject)
}

export function tryOpenUri(url: string) {
    try {
        const uri = vs.Uri.parse(url)
        if (uri.scheme === 'zentient')
            zvspage.openUriInViewer(uri)
        else {
            vs.commands.executeCommand('vscode.open', uri, vs.ViewColumn.Two)
            if (!u.osNormie())
                log(`➜ Navigated to: ${url}`)
        }
    } catch (e) { logWarn(e, true) }
}
