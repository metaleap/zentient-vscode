import * as vs from 'vscode'
import vsproj = vs.workspace
import vswin = vs.window

import * as z from './zentient'
import * as zpage from './page'
import * as u from './util'

import * as node_proc from 'child_process'
import * as node_scanio from 'readline'



export const    enum Response   { None, OneLine }

export const    REQ_ZEN_STATUS      = "ZS:",
                REQ_ZEN_LANGS       = "ZL:",
                REQ_ZEN_CONFIG      = "ZC:",
                REQ_QUERY_CAPS      = "QC:",
                REQ_QUERY_DIAGS     = "QD:",
                REQ_QUERY_TOOL      = "Qt:",
                REQ_INTEL_CMPL      = "IC:",
                REQ_INTEL_CMPLDOC   = "ID:",
                REQ_INTEL_DEFLOC    = "IL:",
                REQ_INTEL_TDEFLOC   = "IT:",
                REQ_INTEL_IMPLS     = "IM:",
                REQ_INTEL_REFS      = "IR:",
                REQ_INTEL_HOVER     = "IH:",
                REQ_INTEL_HILITES   = "II:",
                REQ_INTEL_SYM       = "IS:",
                REQ_INTEL_WSYM      = "IW:",
                REQ_TOOLS_INTEL     = "Ti:",
                REQ_TOOL_INTEL      = "TI:",
                REQ_TOOLS_QUERY     = "Tq:",
                REQ_TOOL_QUERY      = "TQ:",
                REQ_DO_FMT          = "DF:",
                REQ_DO_RENAME       = "DR:",
                REQ_FILES_OPENED    = "FO:",
                REQ_FILES_CLOSED    = "FC:",
                REQ_FILES_WRITTEN   = "FW:",

                errMsgDead          = "Zentient backend no longer running. To attempt restart, type `zen respawn` in the Command Palette."



export  let waitingJson = false



let proc:           node_proc.ChildProcess  = null,
    procio:         node_scanio.ReadLine    = null,
    shutDown:       boolean                 = false,
    wasEverLive:    boolean                 = false,
    vsreg:          boolean                 = false



function dispose () {
    if (procio) { procio.removeAllListeners()  ;  procio.close()  ;  procio = null }
    if (proc)  {  proc.removeAllListeners()  ;  try { proc.kill() } catch (_) {}  ;  proc = null  }
    waitingJson = false
}

export function onExit () {
    shutDown = true  ;  dispose()
}

export function reInit (isrespawn: boolean = false) {
    waitingJson = false
    if (isrespawn) dispose()
        else z.regCmd('zen.dbg.respawn', onCmdRespawn)
    if ((!vsproj.workspaceFolders) || vsproj.workspaceFolders.length!==1) {
        z.out("Editor has multiple or no folders opened, thus won't start Zentient backend, hence most Zentient commands won't function.")
        return
    }else {
        z.setRootDir(vsproj.workspaceFolders[0].uri.fsPath)
    }

    //  LAUNCH the backend process!
    const opt = { cwd: z.vsProjRootDir, maxBuffer: 1024*1024*4 }
    if (!(proc = node_proc.spawn('zentient', [z.dataDir], opt)))  {  onFail()  ;  return  } // currently: spawn won't return null/undefined, so won't enter the if in any event. but hey, better null-proof foreign apis!
    proc.on('error', onError)
    proc.on('close', onExitOrClose)
    proc.on('exit', onExitOrClose)

    // if spawn failed, proc.pid seems to be `undefined` rather than a "bad int" like 0 or -1
    if (! (proc.pid && proc.stdin && proc.stdin.writable && proc.stdout && proc.stdout.readable && proc.stderr && proc.stderr.readable) ) {  onFail()  ;  return  }
    if (! (procio = node_scanio.createInterface({ input: proc.stdout, terminal: false, historySize: 0 })) ) {  onFail()  ;  return  }

    procio.setMaxListeners(23)
    wasEverLive = true
    z.out("➜➜ Zentient backend started..")

    if (!vsreg) {
        z.disps.push(  vsproj.registerTextDocumentContentProvider("zen", {provideTextDocumentContent: zpage.loadZenProtocolContent})  )
        vsreg = true
    }
    z.regCmd('zen.dbg.req', onCmdUserSendReq)
    z.regCmd('zen.dbg.req.zs', onCmdReqStatusSummary)
    // z.regCmd('zen.dbg.req.tool', onCmdReqTool)
}


function onCmdRespawn () {
    z.triggerRespawn()
}


function onCmdUserSendReq () {
    if (isDead()) return thenDead()
    return vswin.showInputBox().then((userqueryinput)=> {
        if (!userqueryinput) return u.thenHush()
        //  help me out a lil when i fire off diag/dbg requests manually:
        if (userqueryinput.length===2) userqueryinput = userqueryinput.toUpperCase() + ':'
        if (userqueryinput.length>2 && userqueryinput[2]===':')
            // restore this if/when we go back to the below `z.out()` result-in-output-panel way:
            // userqueryinput = userqueryinput.substr(0, 2).toUpperCase() + userqueryinput.substr(2)
            return zpage.openUriInNewEd(zpage.zenProtocolUrlFromQueryReq('raw', userqueryinput + ".json", userqueryinput))
        //  get going
        return requestJson(userqueryinput).then (
            (resp: any)=> z.out(resp, z.Out.ClearAndNewLn),
            (fail: Error)=> { z.outThrow(fail, "onCmdUserSendReq") } )
    })
}

function onCmdReqStatusSummary () {
    zpage.openUriInNewEd(zpage.zenProtocolUrlFromQueryReq('raw', REQ_ZEN_STATUS + ".json", REQ_ZEN_STATUS))
}

// function onCmdReqTool () {
//     const   ed = vswin.activeTextEditor, td = ed.document,
//             pos1 = td.offsetAt(ed.selection.start).toString(), pos2 = td.offsetAt(ed.selection.end).toString(),
//             tools = [   `callees ${td.fileName}`
//                     ,   `callers ${td.fileName}`
//                     ,   `callstack ${td.fileName}`
//                     ,   `definition ${td.fileName}`
//                     ,   `describe ${td.fileName}`
//                     ,   `freevars ${td.fileName}`
//                     ,   `implements ${td.fileName}`
//                     ,   `peers ${td.fileName}`
//                     ,   `pointsto ${td.fileName}`
//                     ,   `referrers ${td.fileName}`
//                     ,   `what ${td.fileName}`
//                     ,   `whicherrs ${td.fileName}`
//                     ]
//     vswin.showQuickPick(tools).then((pick)=> { if (pick) {
//         const upick = encodeURIComponent('guru -json -scope github.com/metaleap/...,-github.com/metaleap/go-opengl/...,-github.com/metaleap/go-geo-names/...,-github.com/metaleap/go-misctools/... '
//                             + pick + ':#' + pos1 + ((pos1===pos2)  ?  ''  :  (',#' + pos2)))
//         zpage.openUriInNewEd(zpage.zenProtocolUrlFromQueryReq('raw', null, upick, REQ_QUERY_TOOL + upick))
//     } })
// }

function onError (err: Error) {
    if (err) z.out(err.stack)
    onFail()
}

function onExitOrClose () {
    onFail()
}

function onFail () {
    if (proc) {
        dispose()
        const msg = "Zentient backend " + (wasEverLive  ?  "terminated unexpectedly."  :  "could not be started.")
        vswin.showErrorMessage(z.out(msg), "Respawn Backend Process").then((btn)=> { if (btn) z.triggerRespawn() })
    }
}


export function isAlive ()
:boolean {
    return proc && procio && !shutDown
}

export function isDead ()
:boolean {
    return shutDown || !(proc && procio)
}



export function requestJson (queryln: string, zids: string[] = undefined, reqdata: any = undefined) {
    if (isDead()) return Promise.reject(new Error(errMsgDead))
    return new Promise<any>((onresult, onfailure)=> {
        if (!onfailure) onfailure = z.outThrow
        const onreturn = (jsonresp: any)=> {
            // by convention, we don't send purely-a-string responses except to denote a reportable error
            if (typeof jsonresp === 'string')
                onfailure(jsonresp)
                    else if (onresult) onresult(jsonresp)
        }
        const onflush = (err: any)=> {
            if (err) {  waitingJson = false  ;  z.outThrow(err, "requestJson:onflush:err")  /*onfailure(err)*/  }
                else procio.once('line', (jsonln)=> {  waitingJson = false  ;  try {
                    return onreturn(JSON.parse(jsonln) as any)
                } catch (err) { console.log(jsonln)  ;  z.outThrow(err, "requestJson:onflush:once.line") } }) // rethrow instead of onfailure because this would be a bug in the backend
        }
        if (zids && reqdata)
            queryln = queryln + zids.join(',') + ':' + JSON.stringify(reqdata, undefined, '')
        if (queryln && queryln.length) {
            waitingJson = true
            if (!proc.stdin.write(queryln+'\n'))
                proc.stdin.once('drain', onflush)
            else
                process.nextTick(onflush)
            if (queryln.length<1234 || true) console.log("[REQJSON]\t" + queryln)
        }
    })
}

function thenDead () {
    return u.thenFail(errMsgDead)
}
