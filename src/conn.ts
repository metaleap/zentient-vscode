import * as vs from 'vscode'
import vsproj = vs.workspace
import vswin = vs.window

import * as z from './zentient'

import * as icp from 'child_process'



let proc        :icp.ChildProcess | null    = null
let shutDown    :boolean                    = false
let wasSpawned  :boolean                    = false



function can () {
    return proc && proc.stdin && proc.stdin.writable
}

function cant () {
    return !can
}

function dispose () {
    if (proc)  {  proc.kill()  ;  proc = null  }
}

export function onExit () {
    shutDown = true  ;  dispose()
}

export function onInit () {
    if (!vsproj.rootPath) {
        z.out("Won't start `zentient` process because this window has no folder open")
    } else if (proc = icp.spawn('zentient', [], { cwd: vsproj.rootPath })) {
        proc.on('error', onError)   ;   proc.on('close', onExitOrClose)   ;   proc.on('exit', onExitOrClose)
        if (proc.pid && proc.stdin && proc.stdin.writable && proc.stdout && proc.stdout.readable && proc.stderr && proc.stderr.readable) {
            wasSpawned = true
            z.out("`zentient` process started.")
            z.regCmd('zen.procsend', onCmdQuery)
        } else {
            onError({ name: "", message: "", stack: "NOW, that WAS unexpected." })
        }
    }
}

function onCmdQuery () {
    if (cant())
        return z.thenCancel()
    return vswin.showInputBox().then( (query)=> cant() ? z.thenCancel : proc.stdin.write(query, 'utf-8'))
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
        const msg = "`zentient` process " + (wasSpawned ? "terminated unexpectedly. To restart it," : "could not be started. To retry,") + " `Reload Window`."
        vswin.showErrorMessage(z.out(msg))
    }
}
