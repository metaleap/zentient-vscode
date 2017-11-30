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

function disposeProc(pid: string) {
    const pipe = pipes[pid]
    if (pipe) {
        delete pipes[pid]
        try {
            pipe.removeAllListeners().close()
        } catch (e) { z.logWarn(e) }
    }
    for (const langid in procs) {
        const proc = procs[langid]
        if (proc && proc.pid.toString() === pid) try {
            delete procs[langid]
            proc.removeAllListeners().kill()
        } catch (e) { z.logWarn(e) } finally { break }
    }
}

function onProcEnd(langid: string, progname: string, pid: number) {
    const msgpref = `Zentient '${langid}' provider '${progname}' ended`
    return (code: number, sig: string) => {
        disposeProc(pid.toString())
        z.logWarn(`${msgpref}: code ${code}, sig ${sig}`, false)
    }
}

function onProcError(langid: string, progname: string, pid: number) {
    const msgpref = `Zentient '${langid}' provider '${progname}' error`
    return (err: Error) => {
        disposeProc(pid.toString())
        z.logWarn(`${msgpref} '${err.name}': ${err.message}`, false)
    }
}

export function pipe(pid: number) {
    return pipes[pid.toString()]
}

export function proc(progname: string, langid: string) {
    let p = procs[langid]
    if (!progname)
        progname = zcfg.langProg(langid)
    if (progname && p === undefined) {
        try {
            p = node_proc.spawn(progname)
        } catch (e) { z.logWarn(e) }
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
                    if (!z.commsViaProms) {
                        pipe.on('line', zipc_resp.onRespJsonLn)
                    }
                    pipes[p.pid.toString()] = pipe
                    p.on('error', onProcError(langid, progname, p.pid))
                    const ongone = onProcEnd(langid, progname, p.pid)
                    p.on('disconnect', ongone)
                    p.on('close', ongone)
                    p.on('exit', ongone)
                }
            }
        if (!p)
            z.logWarn(`Could not run '${progname}' (configured in your 'settings.json' as the Zentient provider for '${langid}' files)`)
        procs[langid] = p = p ? p : null
    }
    return p
}

export function hasProc(langid: string) {
    const p = procs[langid]
    return p ? true : false
}
