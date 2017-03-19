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
    const opt = { cwd: vsproj.rootPath, maxBuffer: 1024*1024*128 }
    if (!(proc = cproc.spawn('zentient', [], opt))) {  onFail()  ;  return  }
    proc.on('error', onError)   ;   proc.on('close', onExitOrClose)   ;   proc.on('exit', onExitOrClose)
    // if spawn failed, proc.pid seems to be `undefined` rather than a "bad int" like 0 or -1
    if (! (proc.pid && proc.stdin && proc.stdin.writable && proc.stdout && proc.stdout.readable && proc.stderr && proc.stderr.readable) ) {
        onFail()  ;  return
    }
    if (! (procio = ipc.createInterface({ input: proc.stdout, output: proc.stdin, terminal: false, historySize: 0 }))) {
        onFail()  ;  return
    }

    wasEverLive = true
    z.out("`zentient` process started.")

    z.regCmd('zen.dbg.sendquery', onCmdSendQuery)
}

export function query (queryln :string) {
    if (!proc) return thenDead()
    return new Promise<string>((resolve, reject)=> {
        const onflush = (err :any)=> {
            if (err) reject(err)
                else procio.once('line', resolve)
        }
        if (!proc.stdin.write(queryln+'\n', onflush))
            reject("DRAIN THE PIPES?!")
    })
}

function onCmdSendQuery () {
    if (!proc) return thenDead()
    return vswin.showInputBox().then( (userqueryinput)=> {
        if (userqueryinput)
            return query(userqueryinput).then(vswin.showInformationMessage, vswin.showErrorMessage)
        else return thenHush()
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
    return Promise.reject<string>("`zentient` process no longer running. To restart it, `Reload Window`.")
}

function thenHush () {
    return Promise.resolve<string>(null)
}
