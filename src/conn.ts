import * as vs from 'vscode'
import vsproj = vs.workspace
import vswin = vs.window

import * as z from './zentient'
import * as zpage from './page'
import * as u from './util'

import * as node_proc from 'child_process'
import * as node_scanio from 'readline'



export const    enum Response   { None, OneLine }

export const    MSG_ZEN_STATUS      = "ZS:",
                MSG_ZEN_LANGS       = "ZL:",
                MSG_QUERY_CAPS      = "QC:",
                MSG_QUERY_DIAGS     = "QD:",
                MSG_DO_FMT          = "DF:",
                MSG_DO_RENAME       = "DR:",
                MSG_FILES_OPENED    = "FO:",
                MSG_FILES_CLOSED    = "FC:",
                MSG_FILES_WRITTEN   = "FW:",

                errMsgDead          = "Zentient backend no longer running. To attempt restart, type `zen respawn` in the Command Palette."



let proc:           node_proc.ChildProcess  = null,
    procio:         node_scanio.ReadLine    = null,
    shutDown:       boolean                 = false,
    wasEverLive:    boolean                 = false,
    vsreg:          boolean                 = false



function dispose () {
    if (procio) { procio.removeAllListeners()  ;  procio.close()  ;  procio = null }
    if (proc)  {  proc.removeAllListeners()  ;  try { proc.kill() } catch (_) {}  ;  proc = null  }
}

export function onExit () {
    shutDown = true  ;  dispose()
}

export function reInit (isrespawn: boolean = false) {
    if (isrespawn) dispose()
        else z.regCmd('zen.dbg.respawn', onCmdRespawn)
    if (!vsproj.rootPath) {
        z.out("Won't start Zentient backend because this window has no folder open.")
        return
    }

    //  LAUNCH the backend process!
    const opt = { cwd: vsproj.rootPath, maxBuffer: 1024*1024*4 }
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
    z.regCmd('zen.dbg.sendreq', onCmdUserSendReq)
    z.regCmd('zen.dbg.msg.zs', onCmdReqStatusSummary)
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
            return zpage.openUriInNewEd(zpage.zenProtocolUrlFromQueryMsg('raw', '', userqueryinput + ".json", userqueryinput))
        //  get going
        return requestJson(userqueryinput).then (
            (resp: any)=> z.out(resp, z.Out.ClearAndNewLn),
            (fail: Error)=> { z.outThrow(fail, "onCmdUserSendReq") } )
    })
}

function onCmdReqStatusSummary () {
    zpage.openUriInNewEd(zpage.zenProtocolUrlFromQueryMsg('raw', '', MSG_ZEN_STATUS + ".json", MSG_ZEN_STATUS))
}

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
        const onreturn = (jsonresp: any)=> {
            // by convention, we don't send purely-a-string responses except to denote a reportable error
            if (typeof jsonresp === 'string')
                onfailure(jsonresp)
                    else onresult(jsonresp)
        }
        const onflush = (err: any)=> {
            if (err) onfailure(err)
                else procio.once('line', (jsonln)=> { try {
                    return onreturn(JSON.parse(jsonln) as any)
                } catch (err) { console.log(jsonln)  ;  z.outThrow(err, "requestJson:onflush:once.line") } })
        }
        if (zids && reqdata)
            queryln = queryln + zids.join(',') + ':' + JSON.stringify(reqdata, undefined, '')
        if (!proc.stdin.write(queryln+'\n'))
            proc.stdin.once('drain', onflush)
        else
            process.nextTick(onflush)
        console.log("[REQJSON]\t" + queryln)
    })
}

function thenDead () {
    return u.thenFail(errMsgDead)
}
