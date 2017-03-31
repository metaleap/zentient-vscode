import * as vs from 'vscode'
import vslang = vs.languages
import vsproj = vs.workspace
import vswin = vs.window

import * as node_path from 'path'

import * as z from './zentient'
import * as zconn from './conn'


let vsreg:  boolean                 = false,
    vsdiag: vs.DiagnosticCollection


export function cfgTool (zid: string, cap: string) {
    return vsproj.getConfiguration().get<string>('zen.tool.' + cap + '.' + zid)
}


export function* onAlive () {
    for (const ed of vswin.visibleTextEditors)
        onFileOpen(ed.document)
    if (!vsreg) { // might be respawn
        yield vsproj.onDidOpenTextDocument(onFileOpen)
        yield vsproj.onDidSaveTextDocument(onFileWrite)
        yield vsproj.onDidCloseTextDocument(onFileClose)
        if (!vsdiag) {
            yield (vsdiag = vslang.createDiagnosticCollection("ℤ"))
        }
        vsreg = true
    }
}


function onFileEvent (file: vs.TextDocument, msg: string) {
    const langzid = z.fileLangZid(file)
    if (langzid) {
        console.log(msg + file.fileName)
        zconn.requestJson(msg + langzid + ':' + vsproj.asRelativePath(file.fileName)).then (
            refreshDiag,
            z.outThrow
        )
    }
}

function onFileClose (file: vs.TextDocument) {
    //  for uri.scheme==='file', occurs only on real close, not on editor tab deactivate
    onFileEvent(file, zconn.MSG_FILE_CLOSE)
}

function onFileOpen (file: vs.TextDocument) {
    //  for uri.scheme==='file', occurs on open and whenever editor tab activate (on linux, BUT on windows only the former apparently WTF?)
    onFileEvent(file, zconn.MSG_FILE_OPEN)
}

function onFileWrite (file: vs.TextDocument) {
    onFileEvent(file, zconn.MSG_FILE_WRITE)
}



function refreshDiag (alldiagjsons: { [rfp:string]: {C: string|number, M: string, Pl: number, Pc: number, S: number, T: string}[] }) {
    if (vsdiag) {
        const all: [vs.Uri, vs.Diagnostic[]][] = []
        if (alldiagjsons) {
            for (const rfp in alldiagjsons) {
                const   fullpath = node_path.join(vsproj.rootPath, rfp),
                        diagjsons = alldiagjsons[rfp],
                        filediags: vs.Diagnostic[] = []
                for (const diagjson of diagjsons) if (diagjson) {
                    // const d = new vs.Diagnostic()
                }
                all.push([vs.Uri.parse('file:' + fullpath), filediags])
            }
        }
        vsdiag.clear()
        if (all.length) vsdiag.set(all)
    }
}
