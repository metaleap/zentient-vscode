import * as vs from 'vscode'

import * as node_process from 'process'
import * as node_path from 'path'
import * as node_os from 'os'
import * as node_fs from 'fs'


export type KeyedStrings = { [key: string]: string[] }



let gopaths: string[] = null


export function fileTextRanges (doc: vs.TextDocument, pos: vs.Position) {
    const   ranges: vs.Range[] = [],
            needle: string = doc.getText(doc.getWordRangeAtPosition(pos)).toLowerCase()
    let     last = -1  ,  tmp: number  ,  txt = doc.getText().toLowerCase()

    for ( let i = txt.indexOf(needle)   ;   i>=0   ;   i = txt.indexOf(needle) ) {
        tmp = last + i + 1   ;   last = tmp   ;   txt = txt.substr(i + 1)
        ranges.push( doc.getWordRangeAtPosition(doc.positionAt(tmp)) as vs.Range )
    }
    return then(ranges)
}



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

export function strAfter (infix: string, val: string) {
    const idx = val.indexOf(infix)
    return idx<0  ?  val  :  val.slice(idx+infix.length)
}

    let replpreserveindent: (_:string)=>string
export function strPreserveIndent (val: string) {
    if (!replpreserveindent)
        replpreserveindent = strReplacer({ " ": "\xA0", "\t": "\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0" })
    return replpreserveindent(val)
}

export function strNowMinute () {
    const now = new Date(), hr = now.getHours(), min = now.getMinutes()
    return (hr<10  ?  '0'+hr  :  hr.toString()) + ':' + (min<10  ?  '0'+min  :  min.toString())
}

//  not the most efficient for tight loops with big strings, just-fine for the episodic one-off / small strings
export function strReplacer (repls: {[_: string]: string}) {
    return (val: string)=> {
        for (const old in repls) val = val.replace(old, repls[old])
        return val
    }
}

export function strReEnclose (old1: string, old2: string, new1: string, new2: string, val: string) {
    if (val.startsWith(old1) && val.endsWith(old2))
        return new1 + val.slice(old1.length, val.length-old2.length) + new2
    return val
}

export function strFixupLinesForHover (val: string): string {
    // const   maxwidth = 62,
    //         isspace = (c: string)=>
    //             c===' ' || c==='\t' || c==='\r' || c==='\n' || c==='\b' || c==='\f' || c==='\v' || c==='\xA0'
    // for (let i = maxwidth  ;  i<val.length  ;  i += maxwidth) {
    //     while (!( isspace(val[i]) || isspace(val[i-1]) )) {
    //         let idx = 0
    //         for (let j = i  ;  j > (i-maxwidth)  ;  j--)
    //             if (isspace(val[j])) idx = j
    //                 else if (idx) break
    //         if (idx) {
    //             val = val.slice(0, idx).trim() + "\n" + val.slice(idx).trim()
    //             i = -1
    //             break
    //         }
    //     }
    //     if (i < 0) {
    //         break
    //     }
    // }
    return val
}


export function thenDelayed<T> (ms: number, val: ()=>T):
Thenable<T> {
    return new Promise((resolve)=>
        setTimeout( ()=> resolve(val()), ms ))
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
