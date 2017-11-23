import * as vs from 'vscode'

import * as zvsterms from './vsc-terminals'
import * as zfavdirs from './edtitle-favdirs'
import * as zfavtermcmds from './edtitle-favtermcmds'

export let dataDir: string

let disps: vs.Disposable[]

export function deactivate() {
    zfavtermcmds.onDeactivate()
    zfavdirs.onDeactivate()
}

export function activate(vsctx: vs.ExtensionContext) {
    dataDir = vsctx.storagePath
    disps = vsctx.subscriptions

    zvsterms.onActivate()

    zfavdirs.onActivate()
    zfavtermcmds.onActivate()
}

export function regDisp(disp: vs.Disposable) {
    disps.push(disp)
}
