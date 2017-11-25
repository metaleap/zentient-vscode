import * as vs from 'vscode'
import vswin = vs.window

import * as node_proc from 'child_process'
import * as node_pipeio from 'readline'

let procs: { [_langid: string]: node_proc.ChildProcess } = {},
    pipes: { [_pid: number]: node_pipeio.ReadLine }

export function onDeactivate() {
    let proc: node_proc.ChildProcess,
        pipe: node_pipeio.ReadLine
    const allprocs = procs,
        allpipes = pipes
    procs = {}
    pipes = {}
    for (const pid in allpipes)
        if (pipe = allpipes[pid]) try {
            pipe.removeAllListeners().close()
        } catch (_) { }
    for (const langid in allprocs)
        if (proc = allprocs[langid]) try {
            proc.removeAllListeners().kill()
        } catch (_) { }
}

export function onActivate() {
}

function onProcEnd(code: number, sig: string) {
    vswin.showErrorMessage("Zentient back-end ended: code " + code + ", sig " + sig)
}

function onProcError(err: Error) {
    vswin.showErrorMessage(err.name + ": " + err.message)
}

export function ensureProc(langid: string) {
    let p = procs[langid]
    if (p === undefined) {
        console.log("Trying: zentient-" + langid)
        p = node_proc.spawn("zentient-" + langid)
        if (p)
            if (!(p.pid && p.stdin && p.stdin.writable && p.stdout && p.stdout.readable && p.stderr && p.stderr.readable))
                try { p.kill() } catch (_) { } finally { p = null }
            else {
                const pipe = node_pipeio.createInterface({
                    input: p.stdout, terminal: false, historySize: 0, prompt: ''
                })
                if (!pipe)
                    try { p.kill() } catch (_) { } finally { p = null }
                else {
                    pipe.setMaxListeners(0)
                    p.on('error', onProcError)
                    p.on('disconnect', onProcEnd)
                    p.on('close', onProcEnd)
                    p.on('exit', onProcEnd)
                }
            }
        procs[langid] = p ? p : null
    }
    return p ? true : false
}

export function hasProc(langid: string) {
    const p = procs[langid]
    return p ? true : false
}
