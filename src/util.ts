import * as vs from 'vscode'

import * as node_fs from 'fs'
import * as node_os from 'os'
import * as node_path from 'path'
import * as node_process from 'process'

import * as z from './zentient'


let gopaths: string[] = null


export function goPaths() {
    if (gopaths === null) {
        gopaths = [node_path.join(node_os.homedir(), "go")]
        if (!isDir(gopaths[0]))
            gopaths = []
        for (const gp of (node_process.env['GOPATH'] + '').split(node_path.delimiter))
            if (isDir(gp) && (!gopaths.includes(gp)))
                gopaths.push(gp)
    }
    return gopaths
}

export function isDir(path: string) {
    try {
        return node_fs.statSync(path).isDirectory()
    } catch (_) {
        return false
    }
}

export function onReject(reason: any) {
    return z.logWarn("Rejected: " + reason)
}

export function osNormie() {
    const platform = node_os.platform().toLowerCase()
    return platform.includes('win') // covers win32 and darwin
}

export function strTrimPrefix(val: string, prefix: string) {
    while (val.startsWith(prefix))
        val = val.slice(prefix.length)
    return val
}

export function strTrimSuffix(val: string, suffix: string) {
    while (val.endsWith(suffix))
        val = val.slice(0, val.length - suffix.length)
    return val
}

//  not the most efficient for critical loops with big strings, ok for the occasional one-off / small strings
export function strReplacer(repls: { [_: string]: string }) {
    return (val: string) => {
        for (const old in repls)
            while (val.includes(old))
                val = val.replace(old, repls[old])
        return val
    }
}

export function thenDo(...steps: (string | (() => void))[]):
    Thenable<void> {
    let prom: Thenable<void> = undefined,
        chain: Thenable<void> = undefined
    for (let i = 0, step = steps[0]; i < steps.length; step = steps[++i]) {
        prom = typeof step === 'string' ? vs.commands.executeCommand<void>(step as string)
            : new Promise<void>((ondone) => { (step as () => void)(); ondone() })
        chain = chain ? chain.then(() => prom) : prom
    }
    return chain ? chain : Promise.resolve()
}

export function thenDont() {
    return thenDo()
}

export function thenFail(reason: any) {
    return Promise.reject<any>(reason)
}

export function thenHush() {
    return Promise.resolve<string>(null)
}

export function then<T>(v: T) {
    return Promise.resolve<T>(v)
}
