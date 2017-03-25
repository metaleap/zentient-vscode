import * as vs from 'vscode'

import * as node_process from 'process'
import * as node_path from 'path'
import * as node_os from 'os'
import * as node_fs from 'fs'


export type KeyedStrings = { [key: string]: string[] }



let gopaths: string[] = null


export function isDir (path: string) {
    try { return node_fs.statSync(path).isDirectory() } catch (_) { return false }
}

export function isFile (path: string) {
    try { return node_fs.statSync(path).isFile() } catch (_) { return false }
}


export function goPaths () {
    if (gopaths===null) {
        gopaths = [ node_path.join(node_os.homedir(), "go") ]
        if (!isDir(gopaths[0])) gopaths = []
        for (const gp of (node_process.env['GOPATH'] + '').split(node_path.delimiter))
            if (isDir(gp) && (!gopaths.includes(gp))) gopaths.push(gp)
    }
    return gopaths
}


export function sliceUntilLast (needle: string, haystack: string) {
    const idx = haystack.lastIndexOf(needle)
    return idx <= 0  ?  haystack  :  haystack.slice(0, idx)
}

export function sliceWhile (check: ((_:string)=>boolean), val: string) {
    while (check(val)) val = val.slice(0, val.length-1)
    return val
}

export function sliceWhileEndsWith (suffix: string, val: string) {
    return sliceWhile((v)=> v.endsWith(suffix), val)
}


//  not the most efficient for tight loops with big strings, just-fine for the episodic one-off / small strings
export function strReplacer (repls: {[_: string]: string}) {
    return (val: string)=> {
        for (const old in repls) val = val.replace(old, repls[old])
        return val
    }
}



export function thenDo  (...steps: (string|(()=>void))[]):
Thenable<void> {
    let prom: Thenable<void> = undefined,
        chain: Thenable<void> = undefined
    for (let i = 0 , step = steps[0]   ;   i < steps.length   ;   step = steps[++i]) {
        prom = typeof step === 'string' ? vs.commands.executeCommand<void>(step as string)
                                        : new Promise<void>((ondone)=> { (step as ()=>void)() ; ondone() })
        chain = chain  ?  chain.then(()=> prom)  :  prom
    }
    return chain  ?  chain  :  Promise.resolve()
}

export function thenDont () {
    return thenDo()
}

export function thenFail (reason: string) {
    return Promise.reject<string>(reason)
}

export function thenHush () {
    return Promise.resolve<string>(null)
}

export function then<T> (v: T) {
    return Promise.resolve<T>(v)
}
