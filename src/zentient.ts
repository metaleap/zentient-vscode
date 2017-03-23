import * as vs from 'vscode'
import vscmd = vs.commands
import vsproj = vs.workspace
import vslang = vs.languages
import vswin = vs.window

import * as u from './util'
import * as zhooks from './edhooks'
import * as zproj from './proj'
import * as zconn from './conn'
import * as ztools from './tools'

import * as node_fs from 'fs'



export const enum   Out     { NewLn, Clear, ClearAndNewLn, NoNewLn }

export type         Langs   = { [key: string]: string[] }



export let  disps:      vs.Disposable[],
            vsOut:      vs.OutputChannel,
            vsTerm:     vs.Terminal,
            dataDir:    string

export let  zLangs:     Langs


let exeWatch:   node_fs.FSWatcher   = null,
    regcmds:    string[]            = []


//  VSC EXTENSION INTERFACE


export function deactivate () {
    cleanUpRespawnWatcher()
    zconn.onExit()
}

export function activate (vsctx: vs.ExtensionContext) {
    //  housekeeping
    disps = vsctx.subscriptions
    disps.push(vsOut = vswin.createOutputChannel('ZEN'))
    vsOut.appendLine("Init..")

    dataDir = vsctx.storagePath
    //  launch & wire up zentient process
    zconn.reInit()

    //  set up aux tools/utils not related to IntelliSense backend process
    const reinitTerm = ()=> disps.push(vsTerm = vswin.createTerminal("ZEN"))
    reinitTerm()
    disps.push(vswin.onDidCloseTerminal((term: vs.Terminal)=> {
        if (term===vsTerm) reinitTerm()
    }))
    ztools.onActivate()

    if (zconn.isAlive())
        onAlive()
}

function onAlive () {
    vslang.getLanguages().then( (vslangs: string[])=> {
        //  query backend about language support, then wire up IntelliSense hooks
        zconn.requestJson(zconn.MSG_ZEN_LANGS).then((jsonobj: Langs)=> {
            zLangs = jsonobj
            for (const zid in zLangs)
                zLangs[zid] = zLangs[zid].filter((lid: string)=> vslangs.includes(lid))
            out("Will contribute functionality for language IDs:\n\t❬", Out.NoNewLn)
                for (const lid of edLangs()) out("  " + lid, Out.NoNewLn)
                    out("  ❭")

            disps.push(...zproj.onAlive())
            disps.push(...zhooks.onAlive())
        }, vswin.showErrorMessage)
    })
    setupRespawnWatcher()
}

function cleanUpRespawnWatcher () {
    if (exeWatch) {  exeWatch.removeAllListeners()  ;  exeWatch.close()  ;  exeWatch = null  }
}

//  no-op on other machines, on mine: live-reloads the backend whenever it's recompiled
function setupRespawnWatcher () {
    const exepath = '/home/roxor/dev/go/bin/zentient' // yep, no `which`, *just* for me
    if (u.isFile(exepath))
        exeWatch = node_fs.watch(exepath, {persistent: false}, triggerRespawn)
}

export function triggerRespawn () {
    cleanUpRespawnWatcher()
    zconn.reInit(true)
    if (zconn.isAlive()) onAlive()
}



//  SHARED API FOR OUR OTHER MODULES


export function* edLangs () {
    for (const zid in zLangs) for (const lid of zLangs[zid]) yield lid
}

export function fileOK (doc: vs.TextDocument) {
    return doc.uri.scheme==='file' && langOK(doc)
}

export function fileLangZid (doc: vs.TextDocument) {
    return doc.uri.scheme==='file'  ?  langZid(doc)  :  undefined
}

export function langOK (langish: string|{languageId:string}) {
    return langZid(langish)  ?  true  :  false
}

export function langZid (langish: string|{languageId:string}) {
    if (typeof langish !== 'string') langish = langish.languageId
    for (const zid in zLangs) if (zLangs[zid].includes(langish)) return zid
    return undefined
}


export function openUriInNewEd (uri: vs.Uri|string) {
    const u: vs.Uri = typeof uri !== 'string'  ?  uri  :  vs.Uri.parse(uri)
    return vsproj.openTextDocument(u).then(vswin.showTextDocument , vswin.showErrorMessage)
}

export function openUriInViewer (uri: vs.Uri|string) {
    const u: vs.Uri = typeof uri !== 'string'  ?  uri  :  vs.Uri.parse(uri)
    return vscmd.executeCommand('vscode.previewHtml', u)
}


export function out (val: any, opt: Out = Out.NewLn) {
    const msg = typeof val === 'string'  ?  val  :  JSON.stringify(val)
    vsOut.show(true)
    if (opt===Out.Clear || opt===Out.ClearAndNewLn) vsOut.clear()
    if (opt===Out.NewLn || opt===Out.ClearAndNewLn) vsOut.appendLine(msg)
        else vsOut.append(msg)
    return msg
}


export function regCmd (command: string, handler: (_:any)=>any) {
    if (!regcmds.includes(command)) {
        disps.push(vscmd.registerCommand(command, handler))
        regcmds.push(command)
    }
}

export function regEdCmd (command: string, handler: (_:vs.TextEditor,__:vs.TextEditorEdit,...___:any[])=>void) {
    if (!regcmds.includes(command)) {
        disps.push(vscmd.registerTextEditorCommand(command, handler))
        regcmds.push(command)
    }
}
