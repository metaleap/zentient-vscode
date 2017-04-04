import * as vs from 'vscode'
import vslang = vs.languages
import vsproj = vs.workspace

import * as node_path from 'path'

import * as z from './zentient'
import * as zconn from './conn'


let vsreg:              boolean                 = false,
    vsdiag:             vs.DiagnosticCollection,
    showndiagreqtime:   number                  = -12345


export function cfgTool (zid: string, cap: string) {
    return vsproj.getConfiguration().get<string>('zen.tool.' + cap + '.' + zid)
}


export function* onAlive () {
    if (!vsreg) { // might be respawn
        yield vsproj.onDidOpenTextDocument(onFileOpen)
        yield vsproj.onDidSaveTextDocument(onFileWrite)
        yield vsproj.onDidCloseTextDocument(onFileClose)
        if (!vsdiag)
            yield (vsdiag = vslang.createDiagnosticCollection("ℤ"))
        vsreg = true
    }
    for (const file of vsproj.textDocuments)
        onFileOpen(file)
}

function onFileEvent (file: vs.TextDocument, msg: string) {
    const   langzid = z.fileLangZid(file)
    const reqtime = Date.now()
    if (vsdiag && langzid) {
        if (msg==zconn.MSG_FILE_WRITE) vsdiag.clear()
        if (msg==zconn.MSG_FILE_CLOSE) vsdiag.delete(file.uri)
    }
    msg = (!langzid)  ?  zconn.MSG_CUR_DIAGS  :  (msg + langzid + ':' + vsproj.asRelativePath(file.fileName))
    return zconn.requestJson(msg).then(refreshDiag(reqtime), z.outThrow)
}

function onFileClose (file: vs.TextDocument) {
    //  for uri.scheme==='file', occurs only on real close, not on editor tab deactivate
    return onFileEvent(file, zconn.MSG_FILE_CLOSE)
}

function onFileOpen (file: vs.TextDocument) {
    //  for uri.scheme==='file', occurs on open and whenever editor tab activate (on linux, BUT on windows only the former apparently WTF?)
    return onFileEvent(file, zconn.MSG_FILE_OPEN)
}

function onFileWrite (file: vs.TextDocument) {
    return onFileEvent(file, zconn.MSG_FILE_WRITE)
}


type RespDiag = { Code: string, Msg: string, PosLn: number, PosCol: number, Sev: number, Cat: string }
type RespDiags = { [_relfilepath: string]: RespDiag[] }

function refreshDiag (myreqtime: number) {
    return (alldiagjsons: { [_zid: string]: RespDiags })=> {
        if (vsdiag && showndiagreqtime<myreqtime) { // ignore response if a newer diag req is pending or already there
            const all: [vs.Uri, vs.Diagnostic[]][] = []
            if (alldiagjsons) {
                for (const zid in alldiagjsons) {
                    const ziddiagjsons: RespDiags = alldiagjsons[zid]
                    for (const relfilepath in ziddiagjsons) {
                        const   filediags: vs.Diagnostic[] = [],
                                diagjsons: RespDiag[] = ziddiagjsons[relfilepath]
                        if (diagjsons) for (const dj of diagjsons) if (dj) {
                            const fd = new vs.Diagnostic(new vs.Range(dj.PosLn, dj.PosCol, dj.PosLn, dj.PosCol), dj.Msg, dj.Sev)
                            fd.code = dj.Code  ;  fd.source = "ℤ • " + dj.Cat  ;  filediags.push(fd)
                        }
                        if (filediags.length)
                            all.push([vs.Uri.file(node_path.join(vsproj.rootPath, relfilepath)), filediags])
                    }
                }
                if (showndiagreqtime<myreqtime) { // should still be true and not needed, but just to observe for now..
                    showndiagreqtime = myreqtime
                    vsdiag.clear()
                    vsdiag.set(all)
                } else z.outThrow("HOW ODD!?")
            }
        } else {
            console.log("skipped as stale:")
            console.log(alldiagjsons)
        }
    }
}
