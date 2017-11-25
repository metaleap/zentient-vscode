import * as vs from 'vscode'

import * as zvsterms from './vsc-terminals'
import * as zfavdirs from './edtitle-favdirs'
import * as zfavtermcmds from './edtitle-favtermcmds'
import * as zvsproj from './vsc-workspace'
import * as zprocs from './procs'

export let dataDir: string

let disps: vs.Disposable[]

export function deactivate() {
    zprocs.onDeactivate()
    zfavtermcmds.onDeactivate()
    zfavdirs.onDeactivate()
}

export function activate(vsctx: vs.ExtensionContext) {
    dataDir = vsctx.storagePath
    disps = vsctx.subscriptions

    zprocs.onActivate()
    zvsterms.onActivate()

    zfavdirs.onActivate()
    zfavtermcmds.onActivate()

    zvsproj.onActivate()
}

export function regDisp(disp: vs.Disposable) {
    disps.push(disp)
}
