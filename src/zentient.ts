import * as vs from 'vscode'
import vswin = vs.window

import * as zconn from './conn'
import * as zfiletools from './filetools'

export let  disps   :vs.Disposable[],
            vsOut   :vs.OutputChannel



//  EXTENSION INTERFACE

export function deactivate () {
    zconn.onExit()
}

export function activate (vsctx :vs.ExtensionContext) {
    disps = vsctx.subscriptions
    disps.push( vsOut = vswin.createOutputChannel('ZEN') )

    zconn.onInit()
    zfiletools.onActivate()
}




//  SHARED API FOR OTHER ZENTIENT MODULES

export function out (msg :string) {
    vsOut.show(true)
    vsOut.appendLine(msg)
    return msg
}

export function regCmd (command :string, handler :(_:any)=>any) {
    disps.push(vs.commands.registerCommand(command, handler))
}

export function thenCancel () {
    return Promise.reject(undefined)
}

export function thenDone () {
    return Promise.resolve()
}
