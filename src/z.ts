import * as vs from 'vscode'

export let disps: vs.Disposable[],
    dataDir: string

export function deactivate() {
}

export function activate(vsctx: vs.ExtensionContext) {
    dataDir = vsctx.storagePath
    disps = vsctx.subscriptions
}

export function regDisp(disp: vs.Disposable) {
    disps.push(disp)
}
