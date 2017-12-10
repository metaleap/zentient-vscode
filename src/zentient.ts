import * as vs from 'vscode'
import vswin = vs.window

import * as zcfg from './vsc-settings'
import * as zextras from './z-extras'
import * as zfavdirs from './edtitle-favdirs'
import * as zfavtermcmds from './edtitle-favtermcmds'
import * as zmenu from './z-menu'
import * as zprocs from './procs'
import * as zvslang from './vsc-langs'
import * as zvsproj from './vsc-workspace'
import * as zvsterms from './vsc-terminals'
import * as zvstree from './vsc-trees'


export const Z = "⟨ℤ⟩"

export let regDisp: (...disps: vs.Disposable[]) => number

let out: vs.OutputChannel


export function deactivate() {
    zprocs.onDeactivate()
}

export function activate(vsctx: vs.ExtensionContext) {
    regDisp = vsctx.subscriptions.push

    zmenu.onActivate()
    zfavdirs.onActivate()
    zvsterms.onActivate()
    zfavtermcmds.onActivate()

    regDisp(out = vswin.createOutputChannel(Z)) // ❬❭
    logWelcomeMsg()
    zvsproj.onActivate()
    zvslang.onActivate()
    zextras.onActivate()
    zvstree.onActivate()
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
    for (const langid in langprogs) {
        msglns.push(`➜ for '${langid}' files: '${langprogs[langid]}'`)
    }
    if (msglns.length > 1) {
        msglns[0] = "Hi, Zentient will run:"
    }
    log(msglns.join('\n'))
}

export function putStatus(text: string, milliSeconds: number = 2345) {
    regDisp(vswin.setStatusBarMessage(text, milliSeconds))
}
