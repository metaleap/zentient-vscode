import * as vs from 'vscode'
import vswin = vs.window

import * as zcfg from './vsc-settings'
import * as zfavdirs from './edtitle-favdirs'
import * as zfavtermcmds from './edtitle-favtermcmds'
import * as zipc_cmds from './ipc-cmds'
import * as zprocs from './procs'
import * as zvsproj from './vsc-workspace'
import * as zvsterms from './vsc-terminals'

export let dataDir: string,
    regDisp: (...disps: vs.Disposable[]) => number

let out: vs.OutputChannel

export function deactivate() {
    zprocs.onDeactivate()
}

export function activate(vsctx: vs.ExtensionContext) {
    dataDir = vsctx.storagePath
    regDisp = vsctx.subscriptions.push
    regDisp(out = vswin.createOutputChannel("⟨ℤ⟩"))

    zprocs.onActivate()
    zvsterms.onActivate()

    zfavdirs.onActivate()
    zfavtermcmds.onActivate()

    logWelcomeMsg()
    zvsproj.onActivate()
    zipc_cmds.onActivate()
}

export function log(msg: any) {
    out.show(true)
    if (typeof msg !== 'string')
        msg = JSON.stringify(msg, null, "   ")
    out.appendLine(msg)
    out.appendLine('————————————————')
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
