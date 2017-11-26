import * as node_proc from 'child_process'
import * as node_pipeio from 'readline'

import * as z from './zentient'
import * as zcfg from './vsc-settings'
import * as zipc_resp from './ipc-msg-resp'


let procs: { [_langid: string]: node_proc.ChildProcess } = {},
    pipes: { [_pid: string]: node_pipeio.ReadLine } = {}

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

function cleanUpProc(pid: string) {
    const pipe = pipes[pid]
    if (pipe) {
        delete pipes[pid]
        try {
            pipe.removeAllListeners().close()
        } catch (e) { z.log(e) }
    }
    for (const langid in procs) {
        const proc = procs[langid]
        if (proc && proc.pid.toString() === pid) try {
            delete procs[langid]
            proc.removeAllListeners().kill()
        } catch (e) { z.log(e) } finally { break }
    }
}

function onProcEnd(langid: string, progname: string, pid: number) {
    const msgpref = ` Zentient '${langid}' provider '${progname}' ended`
    return (code: number, sig: string) => {
        cleanUpProc(pid.toString())
        z.log(`${msgpref}: code ${code}, sig ${sig}`)
    }
}

function onProcError(langid: string, progname: string, pid: number) {
    const msgpref = ` Zentient '${langid}' provider '${progname}' error`
    return (err: Error) => {
        cleanUpProc(pid.toString())
        z.log(`${msgpref} '${err.name}': ${err.message}`)
    }
}

// function pipe(langid: string) {
//     const p = proc(langid)
//     return (p && p.pid) ? pipes[p.pid.toString()] : null
// }

export function proc(langid: string) {
    const progname = zcfg.langProg(langid)
    let p = procs[langid]
    if (progname && p === undefined) {
        try {
            p = node_proc.spawn(progname)
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
                    pipes[p.pid.toString()] = pipe
                    pipe.on('line', zipc_resp.onRespJsonLn)
                    p.on('error', onProcError(langid, progname, p.pid))
                    const ongone = onProcEnd(langid, progname, p.pid)
                    p.on('disconnect', ongone)
                    p.on('close', ongone)
                    p.on('exit', ongone)
                }
            }
        if (!p)
            z.log(` Could not run '${progname}' (configured in your 'settings.json' as the Zentient provider for '${langid}' files)`)
        procs[langid] = p = p ? p : null
    }
    return p
}

export function hasProc(langid: string) {
    const p = procs[langid]
    return p ? true : false
}
