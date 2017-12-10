import * as vs from 'vscode'
import vswin = vs.window

import * as u from './util'

import * as zcfg from './vsc-settings'
import * as zextras from './z-extras'
import * as zfavdirs from './edtitle-favdirs'
import * as zfavtermcmds from './edtitle-favtermcmds'
import * as zipc_pipeio from './ipc-pipe-io'
import * as zipc_req from './ipc-req'
import * as zmenu from './z-menu'
import * as zproj from './z-workspace'
import * as zvscmd from './vsc-commands'
import * as zvslang from './vsc-langs'
import * as zvsterms from './vsc-terminals'
import * as zvstree from './vsc-trees'


export const Z = "⟨ℤ⟩"

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

    regDisp(out = vswin.createOutputChannel(Z)) // ❬❭
    logWelcomeMsg()
    zipc_pipeio.onActivate()
    zmenu.onActivate()
    zproj.onActivate()
    zvslang.onActivate()
    zextras.onActivate()
    if (0 > 1) zvstree.onActivate()

    zvscmd.ensure('zen.internal.objsnap', onReqObjSnap)
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
            + ((langprogs[langid]) ? `'${langprogs[langid]}'` : "(disabled)"))
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
                zipc_req.forLang<void>(objsnappath.slice(0, idx), zipc_req.IpcIDs.obj_Snapshot, objsnappath)
        }
    })
}

export function tryOpenUri(url: string) {
    try {
        vs.commands.executeCommand('vscode.open', vs.Uri.parse(url), vs.ViewColumn.Two)
        if (!u.osNormie())
            log(`➜ Navigated to: ${url}`)
    } catch (e) { logWarn(e, true) }
}
