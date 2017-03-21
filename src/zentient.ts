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

export let  langIDs :Langs



//  VSC EXTENSION INTERFACE

export function deactivate () {
    zconn.onExit()
}

export function activate (vsctx :vs.ExtensionContext) {
    //  housekeeping
    disps = vsctx.subscriptions
    disps.push(vsOut = vswin.createOutputChannel('ZEN'))
    vsOut.appendLine("Init..")

    dataDir = vsctx.storagePath
    //  launch & wire up zentient process
    zconn.onInit()

    //  set up aux tools/utils not related to IntelliSense backend process
    const reinitTerm = ()=> disps.push(vsTerm = vswin.createTerminal("ZEN"))
    reinitTerm()
    disps.push(vswin.onDidCloseTerminal((term :vs.Terminal)=> {
        if (term===vsTerm) reinitTerm()
    }))
    ztools.onActivate()

    //  query backend about language support, then wire up IntelliSense hooks
    zconn.requestJson(zconn.MSG_ZEN_LANGS).then((jsonobj :Langs)=> {
        langIDs = jsonobj
        out("Will contribute IntelliSense for language IDs:\n\t❬", false)
        for (const zid in langIDs) for (const lid of langIDs[zid]) out("  " + lid, false)
        out("  ❭")

        zproj.onInit(disps)
    })
}



//  SHARED API FOR OUR OTHER MODULES


export function docOK (doc :vs.TextDocument) {
    return doc.uri.scheme==='file' && langOK(doc)
}


export function langOK (langish :string|{languageId:string}) {
    if (typeof langish !== 'string') langish = langish.languageId
    for (const zid in langIDs) if (langIDs[zid].includes(langish)) return true
    return false
}


export function out (msg :string, ln :boolean = true, clear :boolean = false) {
    vsOut.show(true)
    if (clear) vsOut.clear()
    if (ln) vsOut.appendLine(msg)
        else vsOut.append(msg)
    return msg
}

export function regCmd (command :string, handler :(_:any)=>any) {
    disps.push(vs.commands.registerCommand(command, handler))
}
