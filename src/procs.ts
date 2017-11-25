import * as vs from 'vscode'
import vswin = vs.window

import * as node_proc from 'child_process'
import * as node_pipeio from 'readline'

import * as z from './zentient'
import * as zpipeio from './pipe-io'


let procs: { [_langid: string]: node_proc.ChildProcess } = {},
    pipes: { [_pid: number]: node_pipeio.ReadLine } = {}

export function onDeactivate() {
    let proc: node_proc.ChildProcess,
        pipe: node_pipeio.ReadLine
    const allprocs = procs,
        allpipes = pipes
    procs = {}
    pipes = {}
    let pid: any // number, really..
    for (pid in allpipes)
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

function cleanUpProc(pid: number) {
    const pipe = pipes[pid]
    if (pipe) {
        delete pipes[pid]
        try {
            pipe.removeAllListeners().close()
        } catch (e) { z.log(e) }
    }
    for (const langid in procs) {
        const proc = procs[langid]
        if (proc && proc.pid === pid) try {
            delete procs[langid]
            proc.removeAllListeners().kill()
        } catch (e) { z.log(e) } finally { break }
    }
}

function onProcEnd(pid: number) {
    return (code: number, sig: string) => {
        cleanUpProc(pid)
        vswin.showErrorMessage("Zentient back-end ended: code " + code + ", sig " + sig)
    }
}

function onProcError(pid: number) {
    return (err: Error) => {
        cleanUpProc(pid)
        vswin.showErrorMessage(err.name + ": " + err.message)
    }
}

export function pipe(langid: string) {
    const p = proc(langid)
    return (p && p.pid) ? pipes[p.pid] : null
}

export function proc(langid: string) {
    let p = procs[langid]
    if (p === undefined) {
        try {
            p = node_proc.spawn("zentient-" + langid)
        } catch (e) { z.log(e) }
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
                    pipes[p.pid] = pipe
                    pipe.on('line', zpipeio.onRespJsonLn(langid))
                    p.on('error', onProcError(p.pid))
                    const ongone = onProcEnd(p.pid)
                    p.on('disconnect', ongone)
                    p.on('close', ongone)
                    p.on('exit', ongone)
                }
            }
        procs[langid] = p = p ? p : null
    }
    return p
}

export function hasProc(langid: string) {
    const p = procs[langid]
    return p ? true : false
}
