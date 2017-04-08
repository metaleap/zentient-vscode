import * as vs from 'vscode'
import vslang = vs.languages
import vsproj = vs.workspace

import * as node_path from 'path'

import * as u from './util'
import * as z from './zentient'
import * as zconn from './conn'


export let vsdiag: vs.DiagnosticCollection


let vsreg:              boolean                 = false,
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
    setTimeout(refreshDiag, u.someSeconds())
}

function onFileEvent (file: vs.TextDocument, msg: string) {
    if (zconn.isAlive()) {
        const   langzid = z.fileLangZid(file)
        const reqtime = Date.now()
        if (vsdiag && langzid) {
            if (msg==zconn.MSG_FILE_WRITE)
                vsdiag.clear()
            if (msg==zconn.MSG_FILE_CLOSE)
                vsdiag.delete(file.uri)
            msg = (msg + langzid + ':' + vsproj.asRelativePath(file.fileName))
            return zconn.requestJson(msg).then(onRefreshDiag(reqtime, false), z.outThrow)
        } else
            setTimeout(refreshDiag, u.someSeconds())
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


type RespDiag = { Data: {}, Msg: string, Sev: number, Ref: string, PosLn: number, PosCol: number, Pos2Ln: number, Pos2Col: number }
type RespDiags = { [_relfilepath: string]: RespDiag[] }

function onRefreshDiag (myreqtime: number, islatecatchup: boolean) {
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
                            const isrange = dj.Pos2Ln>dj.PosLn || (dj.Pos2Ln==dj.PosLn && dj.Pos2Col>dj.PosCol)
                            if (!isrange) { dj.Pos2Ln = dj.PosLn  ;  dj.Pos2Col = dj.PosCol }
                            dj.PosLn = dj.PosLn-1 ; dj.PosCol = dj.PosCol-1 ; dj.Pos2Ln = dj.Pos2Ln-1 ; dj.Pos2Col = dj.Pos2Col-1
                            const fd = new vs.Diagnostic(new vs.Range(dj.PosLn, dj.PosCol, dj.Pos2Ln, dj.Pos2Col), dj.Msg, dj.Sev)
                            if (dj.Data && dj.Data['rn'] && dj.Data['rn'].length) {
                                const rn: string[] = dj.Data['rn']
                                dj.Data['rn'] = rn.map((n)=> { if (n.startsWith("\"") && n.endsWith("\"") && n.length>2)
                                    try { const s = JSON.parse(n)  ;  if (s) return s+"" } catch (_) {}  ;  return n  })
                            }
                            fd['data'] = dj.Data  ;  fd.source = "ℤ • " + dj.Ref  ;  filediags.push(fd)
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
        if (zconn.isAlive() && !islatecatchup)
            setTimeout(refreshDiag, u.someSeconds())
    }
}


export function fileDiags (file: vs.TextDocument, pos: vs.Position = undefined): vs.Diagnostic[] {
    return (!vsdiag)  ?  []  :  (!pos)  ?  vsdiag.get(file.uri)  :  vsdiag.get(file.uri).filter((d: vs.Diagnostic)=> d.range.contains(pos))
}


function refreshDiag () {
    if (vsdiag && zconn.isAlive())
        return zconn.requestJson(zconn.MSG_CUR_DIAGS).then(onRefreshDiag(Date.now(), true), z.outThrow)
    return u.thenDont()
}
