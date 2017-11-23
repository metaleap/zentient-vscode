import * as vs from 'vscode'

import * as zvsterms from './vsc-terminals'
import * as ztermfavs from './vsc-edtitle-termfavs'

export let dataDir: string

let disps: vs.Disposable[]

export function deactivate() {
    ztermfavs.deactivate()
}

export function activate(vsctx: vs.ExtensionContext) {
    dataDir = vsctx.storagePath
    disps = vsctx.subscriptions

    zvsterms.onActivate()
    ztermfavs.onActivate()
}

export function regDisp(disp: vs.Disposable) {
    disps.push(disp)
}
