import * as vs from 'vscode'
import vsproj = vs.workspace
import vswin = vs.window

import * as z from './zentient'
import * as zproj from './proj'
import * as u from './util'

import * as node_proc from 'child_process'
import * as node_scanio from 'readline'


export const    enum Response           { None, OneLine }
export const    MSG_ZEN_STATUS          = "ZS:",
                MSG_ZEN_LANGS           = "ZL:",
                MSG_CAPS                = "CA:",
                MSG_CUR_DIAGS           = "CD:",
                MSG_DO_FMT              = "DF:",
                MSG_FILE_OPEN           = "FO:",
                MSG_FILE_CLOSE          = "FC:",
                MSG_FILE_WRITE          = "FW:"

const           errMsgDead              = "Zentient backend no longer running. To attempt restart, type `zen respawn` in the Command Palette."


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
    if (! (proc.pid && proc.stdin && proc.stdin.writable && proc.stdout && proc.stdout.readable && proc.stderr && proc.stderr.readable) ) {
        onFail()
        return
    }
    if (! (procio = node_scanio.createInterface({ input: proc.stdout, terminal: false, historySize: 0 })) ) {
        onFail()
        return
    }

    wasEverLive = true
    z.out("➜➜ Zentient backend started..")

    if (!vsreg) {
        z.disps.push(  vsproj.registerTextDocumentContentProvider("zen", {provideTextDocumentContent: loadZenProtocolContent})  )
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
            return z.openUriInNewEd(zenProtocolUrlFromQueryMsg('raw', '', userqueryinput + ".json", userqueryinput))
        //  get going
        return requestJson(userqueryinput).then (
            (resp: any)=> z.out(resp, z.Out.ClearAndNewLn),
            (fail: Error)=> { z.outThrow(fail, "onCmdUserSendReq") } )
    })
}

function onCmdReqStatusSummary () {
    z.openUriInNewEd(zenProtocolUrlFromQueryMsg('raw', '', MSG_ZEN_STATUS + ".json", MSG_ZEN_STATUS))
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

type RespCmd = { Title: string , Exists: boolean , Hint: string }

//  All zen:// requests end up here to retrieve text
function loadZenProtocolContent (uri: vs.Uri)
:vs.ProviderResult<string> {
    if (isDead()) throw new Error(errMsgDead)
    switch (uri.authority) {
        case 'raw':
            const outfmt = (obj: any)=>
                '\n' + JSON.stringify(obj, null, '\t\t') + '\n\n'
            return requestJson(uri.query).then (
                (resp: any)=> outfmt(resp),
                (fail: Error)=> {  z.outThrow(fail, "loadZenProtocolContent'raw") }
            )
        case 'cap':
            return requestJson(uri.query).then((resp: { [_zid: string]: RespCmd[] })=> {
                let     s = ""
                const   c = uri.query.split(':')[2],
                        mult = c==='diag'
                for (const zid in resp) if (zid && z.langs[zid]) {
                    const custtool = zproj.cfgTool(zid, c)
                    s += "<h2>" + uri.path.split('/')[2] + " for: <code>" + z.langs[zid].join('</code>, <code>') +"</code></h2>"
                    if (!resp[zid])
                        s += "<p>(<i>Not supported</i>)</p>"
                    else {
                        s += "<p>For " + uri.fragment + ", the Zentient backend looks for the following tools" + (mult  ?  ""  :  " in this order") + ":</p><ul>"
                        if ((!resp[zid].length) && (!custtool)) s+= "<li><i>(none / not applicable)</i></li>"
                            else {
                                if (!mult)
                                    s+= "<li>(Custom: " + (custtool  ?  ("<code>"+custtool+"</code>")  :  ("<b>none</b>")) + ")<ul><li>(<i>change this slot via the <code>zen.tool." + c + "." + zid + "</code> setting in your <code>settings.json</code></i>)</li></ul></li>"
                                for (const c of resp[zid])
                                    try {
                                        s+= "<li><code>" + c.Title + "</code><ul><li>"
                                        s+= (c.Exists  ?  "<i>available</i>"  :  ("<b>not available:</b> to install, " + u.strReEnclose('`', '`', '<code>', '</code>', c.Hint)))
                                        s+= "</li></ul></li>"
                                    } catch (_) { // HACKILY HANDLED FOR NOW: why is c[foo] undefined but not c, during very-early-init?!
                                        throw "Zentient backend still (re)initializing.. please retry shortly"
                                    }
                            }
                        if (mult) s += "</ul><p>and merges their outputs.</p>"
                            else s += "</ul><p>and invokes the first one found to be available.</p>"
                    }
                }
                return s
            },
            (fail)=> z.outThrow(fail, "loadZenProtocolContent'cap")
            )
        default:
            throw new Error(uri.authority)
    }
}


export function requestJson (queryln: string) {
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
                else procio.once('line', (jsonln)=> onreturn(JSON.parse(jsonln) as any))
        }
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

export function zenProtocolUrlFromQueryMsg (handler: string, dirpath: string, displaypath: string, querymsg: string) {
    return 'zen://' + handler + '/' + (dirpath ? dirpath : Date.now().toString()) + '/' + displaypath + '?' + querymsg
}
