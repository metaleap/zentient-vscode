import * as vs from 'vscode'
import vsproj = vs.workspace
import vswin = vs.window

import * as z from './zentient'

import * as cproc from 'child_process'
import * as ipc from 'readline'



let proc        :cproc.ChildProcess         = null
let procio      :ipc.ReadLine               = null
let shutDown    :boolean                    = false
let wasEverLive :boolean                    = false



function dispose () {
    if (procio) { procio.removeAllListeners()  ;  procio.close()  ;  procio = null }
    if (proc)  {  proc.kill()  ;  proc = null  }
}

export function onExit () {
    shutDown = true  ;  dispose()
}

export function onInit () {
    if (!vsproj.rootPath) {  z.out("Won't start `zentient` process because this window has no folder open.")  ;  return  }
    if (!(proc = cproc.spawn('zentient', [], { cwd: vsproj.rootPath }))) {  onFail()  ;  return  }
    proc.on('error', onError)   ;   proc.on('close', onExitOrClose)   ;   proc.on('exit', onExitOrClose)
    // if spawn failed, proc.pid seems to be `undefined` rather than a "bad int" like 0 or -1
    if (! (proc.pid && proc.stdin && proc.stdin.writable && proc.stdout && proc.stdout.readable && proc.stderr && proc.stderr.readable) ) {
        onFail()  ;  return
    }
    if (! (procio = ipc.createInterface({ input: proc.stdout, output: proc.stdin, terminal: false, historySize: 0 }))) {
        onFail()  ;  return
    }

    wasEverLive = true
    // procio.once('line', (bla)=> console.log(bla))
    // proc.stdin.write("crikey mr\n", 'utf-8')
    z.out("`zentient` process started.")

    z.regCmd('zen.dbg.sendquery', onCmdSendQuery)
}

function onCmdSendQuery () {
    if (!proc) return thenDead()
    return vswin.showInputBox().then( (query)=> {
        if (!proc) return thenDead()
        if (!query) return Promise.resolve<string>(null)
        return new Promise<string>((resolve, reject)=> {
            if (!proc.stdin.write(query+'\n', 'utf-8'))
                reject("DRAIN")
            else
                procio.once('line', (resultline)=> resolve(resultline))
        }).then(vswin.showInformationMessage, vswin.showErrorMessage)
    }, console.log)
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
