import * as vs from 'vscode'
import vsproj = vs.workspace
import vswin = vs.window

import * as z from './zentient'

import * as icp from 'child_process'



let proc        :icp.ChildProcess | null    = null
let shutDown    :boolean                    = false
let wasEverLive :boolean                    = false



function dispose () {
    if (proc)  {  proc.kill()  ;  proc = null  }
}

export function onExit () {
    shutDown = true  ;  dispose()
}

export function onInit () {
    if (!vsproj.rootPath) {  z.out("Won't start `zentient` process because this window has no folder open.")  ;  return  }
    if (!(proc = icp.spawn('zentient', [], { cwd: vsproj.rootPath }))) {  onFail()  ;  return  }
    proc.on('error', onError)   ;   proc.on('close', onExitOrClose)   ;   proc.on('exit', onExitOrClose)
    // if spawn failed, proc.pid seems to be `undefined` rather than a "bad int" like 0 or -1
    if (! (proc.pid && proc.stdin && proc.stdin.writable && proc.stdout && proc.stdout.readable && proc.stderr && proc.stderr.readable) ) {
        onFail()  ;  return
    }

    wasEverLive = true
    z.out("`zentient` process started.")

    z.regCmd('zen.dbg.sendquery', onCmdSendQuery)
}

function onCmdSendQuery () {
    if (!proc) return thenDead()
    return vswin.showInputBox().then( (query)=> {
        if (!proc) return thenDead()
        if (!proc.stdin.write(query, 'utf-8'))
            return vswin.showErrorMessage("nodestreams want us to wait for 'drain'.. that's not on, up the buffer sizes stat!!")
        return vswin.showInformationMessage("Now the readln..")
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

function thenDead () {
    return vswin.showErrorMessage(z.out("`zentient` process no longer running. To restart it, `Reload Window`."))
}
