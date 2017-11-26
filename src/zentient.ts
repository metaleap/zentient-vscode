import * as vs from 'vscode'
import vswin = vs.window

import * as zcfg from './vsc-settings'
import * as zfavdirs from './edtitle-favdirs'
import * as zfavtermcmds from './edtitle-favtermcmds'
import * as zcorecmds from './z-core-cmds'
import * as zprocs from './procs'
import * as zvsproj from './vsc-workspace'
import * as zvsterms from './vsc-terminals'

export let regDisp: (...disps: vs.Disposable[]) => number

let out: vs.OutputChannel

export function deactivate() {
    zprocs.onDeactivate()
}

export function activate(vsctx: vs.ExtensionContext) {
    regDisp = vsctx.subscriptions.push

    zcorecmds.onActivate()
    zfavdirs.onActivate()
    zvsterms.onActivate()
    zfavtermcmds.onActivate()

    regDisp(out = vswin.createOutputChannel("⟨ℤ⟩")) // ❬❭
    logWelcomeMsg()
    zvsproj.onActivate()
}

export function log(msg: any) {
    if (!msg) return

    if (typeof msg !== 'string')
        msg = JSON.stringify(msg, null, "   ")
    out.appendLine(msg)
    out.appendLine('————————————————')
    out.show(true)
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
