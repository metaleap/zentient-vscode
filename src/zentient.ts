import * as vs from 'vscode'
import vscmd = vs.commands
import vslang = vs.languages
import vswin = vs.window

import * as u from './util'
import * as zed from './vseditor'
import * as zproj from './proj'
import * as zconn from './conn'
import * as zgui from './vsgui'
import * as zlang from './lang'

import * as node_fs from 'fs'



export const enum   Out     { NewLn, Clear, ClearAndNewLn, NoNewLn }

export type         Langs   = u.KeyedStrings



export let  disps:      vs.Disposable[],
            dataDir:    string,
            vsOut:      vs.OutputChannel


export let  langs:      Langs               = {}


let exewatcher: node_fs.FSWatcher   = null,
    exepath:    string              = null,
    regcmds:    string[]            = [],
    tickbusy:   boolean             = false


//  VSC EXTENSION INTERFACE


export function deactivate () {
    cleanUpRespawnWatcher()
    zconn.onExit()
}

export function activate (vsctx: vs.ExtensionContext) {
    //  housekeeping
    disps = vsctx.subscriptions
    disps.push(vsOut = vswin.createOutputChannel("⟨ℤ⟩"))
    out("Init..")
    dataDir = vsctx.storagePath

    //  set up aux tools/utils not related to IntelliSense backend process
    zgui.onActivate(disps)

    //  launch & wire up zentient process
    zconn.reInit()
    if (zconn.isAlive())
        onAlive()

    setInterval(onTick, 789)
}


function onTick () {
    if (!tickbusy) { try { tickbusy = true
        zproj.onTick()  ;  zgui.onTick()
    } catch (err) {  vswin.showErrorMessage(err)  } finally {  tickbusy = false  } }
}


function onAlive () {
    vslang.getLanguages().then( (vslangs: string[])=> {
        //  query backend about language support, then wire up IntelliSense hooks
        zconn.requestJson(zconn.REQ_ZEN_LANGS).then((jsonobj: any)=> {
            langs = {}
            for (const zid in jsonobj) {
                jsonobj[zid] = jsonobj[zid].filter((lid: string)=> vslangs.includes(lid))
                if (jsonobj[zid].length) langs[zid] = jsonobj[zid]
            }
            out("Will contribute functionality for language IDs:\n\t\t❬", Out.NoNewLn)
                for (const lid of edLangs()) out("  " + lid, Out.NoNewLn)
                    out("  ❭")

            disps.push(...zproj.onAlive())
            disps.push(...zed.onAlive())
            zlang.onAlive()
        }, vswin.showErrorMessage)
    })
    setupRespawnWatcher()
}

function cleanUpRespawnWatcher () {
    if (exewatcher) {  exewatcher.removeAllListeners()  ;  exewatcher.close()  ;  exewatcher = null  }
}

//  no-op on other machines, on mine: live-reloads the backend whenever it's recompiled
function setupRespawnWatcher () {
    const   exepath1 = '/home/roxor/dev/go/bin/zentient',   // yep, no `which`, *just* for me
            exepath2 = 'd:\\go\\bin\\zentient.exe'
    if (exepath===null)
        exepath = u.isFile(exepath1)  ?  exepath1  :  u.isFile(exepath2)  ?  exepath2  :  ''
    if (exepath)
        exewatcher = node_fs.watch(exepath, {persistent: false}, triggerRespawn)
}

export function triggerRespawn (fswatchevent: string = 'change') {
    if (fswatchevent==='change' || !fswatchevent) {
        cleanUpRespawnWatcher()
        zconn.reInit(true)
        if (zconn.isAlive()) onAlive()
    }
}



//  SHARED API FOR OUR OTHER MODULES


export function* edLangs () {
    for (const zid in langs) for (const lid of langs[zid]) yield lid
}

export function fileOK (doc: vs.TextDocument) {
    return doc.uri.scheme==='file' && langOK(doc)
}

export function langOK (langish: string|{languageId:string}) {
    return langZid(langish)  ?  true  :  false
}

export function langZid (langish: string|{languageId:string}) {
    if (typeof langish !== 'string') langish = langish.languageId
    for (const zid in langs) if (langs[zid].includes(langish)) return zid
    return undefined
}



let isoutnewln = true
export function out (val: any, opt: Out = Out.NewLn, show: boolean = true) {
    let msg = typeof val === 'string'  ?  val  :  JSON.stringify(val, undefined, '\t\t')
    if (msg) {
        if (show) vsOut.show(true)
        if (opt===Out.Clear || opt===Out.ClearAndNewLn) {
            vsOut.clear() ; isoutnewln = true }
        if (isoutnewln) msg = u.strNowMinute() + '\t' + msg
        if (opt===Out.NewLn || opt===Out.ClearAndNewLn) {
            vsOut.appendLine(msg)  ;  isoutnewln = true
        } else {
            vsOut.append(msg)  ;  isoutnewln = false
        }
    }
    return msg
}

export function outStatus (val: any, show: boolean = false) {
    disps.push(vswin.setStatusBarMessage(val, 4444))
    return out(val, Out.NewLn, show)
}

export function outThrow (err: any, fnname: string = "") {
    console.log(fnname)
    console.log(err)
    out(err)
    throw err
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
