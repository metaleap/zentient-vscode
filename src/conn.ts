import * as vs from 'vscode'
import vsproj = vs.workspace
import vswin = vs.window

import * as z from './zentient'
import * as u from './util'

import * as node_path from 'path'
import * as node_proc from 'child_process'
import * as node_scanio from 'readline'


export const    enum Response           { None, OneLine }
export const    MSG_ZEN_STATE           = "ZS:",
                MSG_ZEN_LANGS           = "ZL:",
                MSG_FILE_OPEN           = "FO:",
                MSG_FILE_CLOSE          = "FC:"

const           errMsgDead              = "`zentient` backend no longer running. To restart it, `Reload Window`.",
                errMsgPipesWeirdDrain   = "DRAIN THE PIPES.."


let proc        :node_proc.ChildProcess = null
let procio      :node_scanio.ReadLine   = null
let shutDown    :boolean                = false
let wasEverLive :boolean                = false



function dispose () {
    if (procio) { procio.removeAllListeners()  ;  procio.close()  ;  procio = null }
    if (proc)  {  proc.kill()  ;  proc = null  }
}

export function onExit () {
    shutDown = true  ;  dispose()
}

export function onInit () {
    if (!vsproj.rootPath) {
        z.out("Won't start `zentient` backend because this window has no folder open.")
        return
    }

    //  LAUNCH the backend process!
    const opt = { cwd: vsproj.rootPath, maxBuffer: 1024*1024*4 }
    if (!(proc = node_proc.spawn('zentient', [z.dataDir], opt))) {
        onFail()
        return
    }
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
    z.out("`zentient` backend started.")

    z.disps.push(  vsproj.registerTextDocumentContentProvider("zen", {provideTextDocumentContent: loadZenUriContent})  )
    z.regCmd('zen.dbg.sendreq', onCmdUserSendReq)
    z.regCmd('zen.dbg.msg.zs', onCmdReqStateSummary)
}


function onCmdUserSendReq () {
    if (!proc) return thenDead()
    return vswin.showInputBox().then((userqueryinput)=> {
        if (!userqueryinput) return u.thenHush()
        //  help me out a lil when i fire off diag/dbg requests manually:
        if (userqueryinput.length===2) userqueryinput = userqueryinput + ':'
        if (userqueryinput.length>2 && userqueryinput[2]===':')
            userqueryinput = userqueryinput.substr(0, 2).toUpperCase() + userqueryinput.substr(2)
        //  get going
        return requestJson(userqueryinput).then (
            (resp :any)=> { z.out(resp, z.Out.ClearAndNewLn) },
            (fail :Error)=> vswin.showErrorMessage(fail.message) )
    })
}

function onCmdReqStateSummary () {
    z.openUriInNewEd('zen://raw/zs.json?foo bar')
}

function onError (err :Error) {
    z.out(`${err.stack}`)
    onFail()
}

function onExitOrClose () {
    onFail()
}

function onFail () {
    if (proc) {
        dispose()
        const msg = "`zentient` backend " + (wasEverLive ? "terminated unexpectedly. To restart it," : "could not be started. To retry,") + " `Reload Window`."
        vswin.showErrorMessage(z.out(msg))
    }
}

function loadZenUriContent (uri :vs.Uri) :vs.ProviderResult<string> {
    switch (uri.authority) {
        case 'raw':     //  raw/zs.json?foo bar
            const msg = u.sliceUntilLast('.', node_path.basename(uri.path)).toUpperCase()
            return requestJson(msg + ':' + uri.query).then (
                (resp :any)=> JSON.stringify(resp),
                (fail :Error)=> vswin.showErrorMessage(fail.message)
            )
        default:
            throw new Error(uri.authority)
    }
}

export function requestJson (queryln :string) {
    if (!proc) return Promise.reject(new Error(errMsgDead))
    return new Promise<any>((onresult, onfailure)=> {
        const onflush = (err :any)=> {
            if (err) onfailure(err)
                else procio.once('line', (jsonln)=> onresult(JSON.parse(jsonln) as any))
        }
        if (!proc.stdin.write(queryln+'\n', onflush))
            onfailure(new Error(errMsgPipesWeirdDrain))
    })
}

export function sendMsg (msgln :string) {
    if (!proc) return thenDead()
    return new Promise<void>((onresult, onfailure)=> {
        const onflush = (err :any)=> {
            if (err) onfailure(err)
                else onresult()
        }
        if (!proc.stdin.write(msgln+'\n', onflush))
            onfailure(new Error(errMsgPipesWeirdDrain))
    })
}

function thenDead () {
    return u.thenFail(errMsgDead)
}
