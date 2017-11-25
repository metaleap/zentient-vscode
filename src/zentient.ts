import * as vs from 'vscode'
import vswin = vs.window

import * as zcfg from './vsc-settings'
import * as zfavdirs from './edtitle-favdirs'
import * as zfavtermcmds from './edtitle-favtermcmds'
import * as zprocs from './procs'
import * as zvsproj from './vsc-workspace'
import * as zvsterms from './vsc-terminals'

export let dataDir: string,
    regDisp: (...disps: vs.Disposable[]) => number

let out: vs.OutputChannel

export function deactivate() {
    zprocs.onDeactivate()
    zfavtermcmds.onDeactivate()
    zfavdirs.onDeactivate()
}

export function activate(vsctx: vs.ExtensionContext) {
    dataDir = vsctx.storagePath
    regDisp = vsctx.subscriptions.push
    regDisp(out = vswin.createOutputChannel("⟨ℤ⟩"))

    zprocs.onActivate()
    zvsterms.onActivate()

    zfavdirs.onActivate()
    zfavtermcmds.onActivate()

    zvsproj.onActivate()
    logWelcomeMsg()
}

export function log(msg: any) {
    console.log(msg)
    if (typeof msg !== 'string')
        msg = JSON.stringify(msg, null, "   ")
    out.appendLine(msg)
}

function logWelcomeMsg() {
    out.show(true)
    const msglns = ["No languages configured for Zentient in any 'settings.json's 'zen.langProgs' section."]
    const langprogs = zcfg.langProgs()
    for (const langid in langprogs) {
        msglns.push(`➜ for '${langid}' files: '${langprogs[langid]}'`)
    }
    if (msglns.length > 1) {
        msglns[0] = "Hi, Zentient will run:"
    }
    out.appendLine(msglns.join('\n'))
}
