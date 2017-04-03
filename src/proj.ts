import * as vs from 'vscode'
import vslang = vs.languages
import vsproj = vs.workspace

import * as node_path from 'path'

import * as u from './util'
import * as z from './zentient'
import * as zconn from './conn'


let vsreg:              boolean                 = false,
    vsdiag:             vs.DiagnosticCollection,
    lastdiagreqtime:    number


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
    const langzid = z.fileLangZid(file)
    if (langzid) {
        const reqtime = Date.now()
        lastdiagreqtime = reqtime
        return zconn.requestJson(msg + langzid + ':' + vsproj.asRelativePath(file.fileName))
            .then(refreshDiag(reqtime), z.outThrow)
    }
    return u.thenDont()
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

function refreshDiag (reqtime: number) {
    return (alldiagjsons: { [_zid: string]: RespDiags })=> {
        let hasorwillhavenewer = lastdiagreqtime > reqtime
        if (vsdiag && !hasorwillhavenewer) { // ignore response if a newer diag req is pending or already there
            const all: [vs.Uri, vs.Diagnostic[]][] = []
            if (alldiagjsons) {
                for (const zid in alldiagjsons) {
                    const ziddiagjsons: RespDiags = alldiagjsons[zid]
                    for (const relfilepath in ziddiagjsons) {
                        const   filediags: vs.Diagnostic[] = [],
                                diagjsons: RespDiag[] = ziddiagjsons[relfilepath]
                        for (const dj of diagjsons) if (dj) {
                            const fd = new vs.Diagnostic(new vs.Range(dj.PosLn, dj.PosCol, dj.PosLn, dj.PosCol), dj.Msg, dj.Sev)
                            fd.code = dj.Code  ;  fd.source = "ℤ • " + dj.Cat  ;  filediags.push(fd)
                        }
                        if (filediags.length)
                            all.push([vs.Uri.file(node_path.join(vsproj.rootPath, relfilepath)), filediags])
                    }
                }
            }
            vsdiag.clear()
            vsdiag.set(all)
        }
    }
}
