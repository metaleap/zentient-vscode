import * as vs from 'vscode'
import vsproj = vs.workspace
import vswin = vs.window

import * as z from './zentient'

import * as node_proc from 'child_process'
import * as node_scanio from 'readline'



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
        z.out("Won't start `zentient` process because this window has no folder open.")
        return
    }

    const opt = { cwd: vsproj.rootPath, maxBuffer: 1024*1024*4 }
    console.log(vswin.visibleTextEditors.map((ed)=> ed.document.uri))
    if (!(proc = node_proc.spawn('zentient', [], opt))) {
        onFail()
        return
    }
    proc.on('error', onError)   ;   proc.on('close', onExitOrClose)   ;   proc.on('exit', onExitOrClose)

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
    z.out("`zentient` process started.")

    z.regCmd('zen.dbg.sendquery', onCmdSendQuery)
}

function onCmdSendQuery () {
    if (!proc) return thenDead()
    return vswin.showInputBox().then((userqueryinput)=> {
        if (!userqueryinput) return thenHush()
        return queryRaw(userqueryinput).then(vswin.showInformationMessage, vswin.showErrorMessage)
    })
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
        const msg = "`zentient` process " + (wasEverLive ? "terminated unexpectedly. To restart it," : "could not be started. To retry,") + " `Reload Window`."
        vswin.showErrorMessage(z.out(msg))
    }
}

export function queryRaw (queryln :string) {
    if (!proc) return thenDead()
    return new Promise<string>((onresult, onfailure)=> {
        const onflush = (err :any)=> {
            if (err) onfailure(err)
                else procio.once('line', onresult)
        }
        if (!proc.stdin.write(queryln+'\n', onflush))
            onfailure("DRAIN THE PIPES?!")
    })
}

function thenDead () {
    return Promise.reject<string>( "`zentient` process no longer running. To restart it, `Reload Window`." )
}

function thenHush () {
    return Promise.resolve<string>(null)
}
