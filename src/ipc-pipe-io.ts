import * as node_proc from 'child_process'
import * as node_pipeio from 'readline'
import * as z from './zentient'
import * as zcfg from './vsc-settings'
import * as zipc_resp from './ipc-resp'
import * as zproj from './z-workspace'


export let last: { filePath: string, langId: string } = null


let procs: { [_key: string]: node_proc.ChildProcess } = {},
    pipes: { [_pid: string]: node_pipeio.ReadLine } = {}


export function onDeactivate() {
    let proc: node_proc.ChildProcess,
        pipe: node_pipeio.ReadLine
    const allprocs = procs,
        allpipes = pipes
    procs = {}
    pipes = {}
    for (const pid in allpipes)
        if (pipe = allpipes[pid]) {
            try { pipe.removeAllListeners() } catch (_) { }
            try { pipe.close() } catch (_) { }
        }
    for (const key in allprocs)
        if (proc = allprocs[key]) {
            try { proc.removeAllListeners() } catch (_) { }
            try { proc.kill() } catch (_) { }
        }
}

function disposeProc(pId: string) {
    const pipe = pipes[pId]
    if (pipe) {
        delete pipes[pId]
        try { pipe.removeAllListeners() } catch (_) { }
        try { pipe.close() } catch (_) { }
    }

    let proc: node_proc.ChildProcess
    for (const key in procs)
        if ((proc = procs[key]) && proc.pid.toString() === pId) {
            delete procs[key]
            try { proc.removeAllListeners() } catch (_) { }
            try { proc.kill() } catch (_) { }
            break
        }
}

function onProcEnd(langId: string, progName: string, pId: number) {
    const msgpref = `Zentient '${langId}' provider '${progName}' ended`
    return (code: number, sig: string) => {
        disposeProc(pId.toString())
        z.logWarn(`${msgpref}: code ${code}, sig ${sig}`, true)
    }
}

function onProcError(langId: string, progName: string, pId: number) {
    const msgpref = `Zentient '${langId}' provider '${progName}' error`
    return (err: Error) => {
        disposeProc(pId.toString())
        z.logWarn(`${msgpref} '${err.name}': ${err.message}`, false)
    }
}

export function proc(progName: string, langId: string) {
    let p = procs[langId]
    if (!progName)
        progName = zcfg.langOk(langId) ? zcfg.langProg(langId) : undefined
    if (progName && p === undefined) {
        try {
            p = node_proc.spawn(progName)
        } catch (e) { z.logWarn(e) }
        if (p)
            if (!(p.pid && p.stdin && p.stdin.writable && p.stdout && p.stdout.readable && p.stderr && p.stderr.readable))
                try { p.kill() } catch (_) { } finally { p = null }
            else {
                const pipe = node_pipeio.createInterface({
                    input: p.stdout, terminal: false, historySize: 0
                })
                if (!pipe)
                    try { p.kill() } catch (_) { } finally { p = null }
                else {
                    pipe.setMaxListeners(0)
                    pipe.on('line', zipc_resp.onRespJsonLn)
                    pipes[p.pid.toString()] = pipe
                    p.on('error', onProcError(langId, progName, p.pid))
                    const ongone = onProcEnd(langId, progName, p.pid)
                    p.on('disconnect', ongone)
                    p.on('close', ongone)
                    p.on('exit', ongone)
                    p.stderr.on('data', chunk => z.log(chunk.toString()))
                }
            }
        if (!p)
            procs[langId] = null
        else {
            procs[langId] = p
            zproj.sendInitialWorkspaceInfos(langId)
        }
    }
    return p
}

export function setLast(langId: string, filePath: string) {
    last = { langId: langId, filePath: filePath }
}
