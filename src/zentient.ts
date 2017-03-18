import * as vs from 'vscode'

import * as zfs from './filetools'

export let disps   :vs.Disposable[]        //  this global gets pointed to `vs.ExtensionContext.subscriptions` to collect all disposables for auto-cleanup


export function activate (vsctx :vs.ExtensionContext) {
    disps = vsctx.subscriptions
    zfs.onActivate()
    console.log("hi from zentient")
}


export function regCmd (command :string, handler :(_:any)=>any) {
    disps.push(vs.commands.registerCommand(command, handler))
}
