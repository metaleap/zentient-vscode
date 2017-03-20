import * as vs from 'vscode'
import vswin = vs.window

import * as zproj from './proj'
import * as zconn from './conn'
import * as ztools from './tools'

type Langs = { [key :string]: string[] }

export let  disps   :vs.Disposable[],
            vsOut   :vs.OutputChannel,
            vsTerm  :vs.Terminal,
            dataDir :string

export let  langs   :Langs


//  EXTENSION INTERFACE

export function deactivate () {
    zconn.onExit()
}

export function activate (vsctx :vs.ExtensionContext) {
    disps = vsctx.subscriptions
    disps.push(vsOut = vswin.createOutputChannel('ZEN'))
    vsOut.appendLine("Init..")

    dataDir = vsctx.storagePath
    zconn.onInit()

    const reinitTerm = ()=> disps.push(vsTerm = vswin.createTerminal("ZEN"))
    reinitTerm()
    disps.push(vswin.onDidCloseTerminal((term :vs.Terminal)=> {
        if (term===vsTerm) reinitTerm()
    }))
    ztools.onActivate()
    zproj.onInit(disps)

    zconn.requestJson(zconn.MSG_ZEN_LANGS).then((jsonobj :Langs)=> {
        langs = jsonobj
        vsOut.append("Will contribute IntelliSense for languages:")
        for (const zid in langs) for (const lid of langs[zid]) vsOut.append(" " + lid)
    })
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

export function thenDo (fn :()=>any) {
    return new Promise((ondone)=> { fn() ; ondone() })
}

export function thenFail (reason :string) {
    return Promise.reject<string>(reason)
}

export function thenHush () {
    return Promise.resolve<string>(null)
}
