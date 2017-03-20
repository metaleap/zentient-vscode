import * as vs from 'vscode'
import vswin = vs.window

import * as zproj from './proj'
import * as zconn from './conn'
import * as zfstools from './filetools'

import * as node_path from 'path'


export let  disps   :vs.Disposable[],
            vsOut   :vs.OutputChannel,
            dataDir :string



//  EXTENSION INTERFACE

export function deactivate () {
    zconn.onExit()
}

export function activate (vsctx :vs.ExtensionContext) {
    disps = vsctx.subscriptions
    disps.push( vsOut = vswin.createOutputChannel('Zentient') )

    const   datadirpathparts = node_path.parse(vsctx.storagePath).dir.split(node_path.sep),
            i = datadirpathparts.indexOf("Code")
    if (i <= 0)
        dataDir = vsctx.storagePath
    else {
        datadirpathparts.splice(i, datadirpathparts.length, "zentient")
        dataDir = datadirpathparts.join(node_path.sep)
    }


    console.log(dataDir)
    zconn.onInit()
    zfstools.onActivate()
    zproj.onInit(disps)
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
