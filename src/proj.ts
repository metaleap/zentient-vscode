import * as vs from 'vscode'
import vslang = vs.languages
import vsproj = vs.workspace

import * as node_path from 'path'

import * as z from './zentient'
import * as zconn from './conn'
import * as zlang from './lang'



type FileEvt = { zid: string , reqmsg: string , frps: string[] }



export let  now = Date.now(),
            vsdiag: vs.DiagnosticCollection



let vsreg                                   = false,
    lastdiagrecv                            = 0,
    fileevt: FileEvt                        = null,
    fileevts: FileEvt[]                     = []


export function cfgCustomTool (zid: string, cap: string) {
    return vsproj.getConfiguration().get<string>('zen.' + zid + '.' + cap + '.custom')
}

export function cfgDisabledTools (zid: string, cap: string) {
    return vsproj.getConfiguration().get<string[]>('zen.' + zid + '.' + cap + '.disabled') || []
}


function sendFileEvts () {
    const fevts = fileevts  ;  fileevts = []
    let fevt = fileevt  ;  fileevt = null
    let sent = false  ;  fevts.push(fevt)
    for (fevt of fevts) if (fevt && fevt.zid && fevt.reqmsg && fevt.frps && fevt.frps.length && zconn.isAlive()) {
        zconn.requestJson(fevt.reqmsg, [fevt.zid], fevt.frps).then(onRefreshDiag, z.outThrow)  ;  sent = true }
    return sent
}


export function onTick () {
    if (!zconn.waitingJson) {
        now = Date.now()
        if ((!sendFileEvts()) && (now-lastdiagrecv)>12345) {  lastdiagrecv = now  ;  refreshDiag()  }
    }
}


export function* onAlive () {
    now = Date.now()
    if (!vsreg) { // might be respawn
        yield vsproj.onDidOpenTextDocument(onFileOpen)
        yield vsproj.onDidSaveTextDocument(onFileWrite)
        yield vsproj.onDidCloseTextDocument(onFileClose)
        if (!vsdiag)
            yield (vsdiag = vslang.createDiagnosticCollection("ℤ"))
        vsreg = true
        vsproj.onDidChangeConfiguration(onCfgChanged)
    }
    onCfgChanged()
    for (const file of vsproj.textDocuments)
        onFileOpen(file)
}

function onCfgChanged () {
    if (zconn.isAlive()) for (const zid in z.langs)
        zconn.requestJson(zconn.REQ_ZEN_CONFIG, [zid], {    'diag.disabled': cfgDisabledTools(zid, 'diag').join(','),
                                                            'intel.disabled': cfgDisabledTools(zid, 'intel').join(',') })
}

function onFileEvent (file: vs.TextDocument, reqmsg: string) {
    const langzid = z.langZid(file)  ;  if (langzid && vsdiag && file.uri.scheme==='file') {
        const filerelpath = relFilePath(file)  ;  let fevt = fileevt
        if (fevt && fevt.zid && fevt.reqmsg && fevt.zid===langzid && fevt.reqmsg===reqmsg)
            fevt.frps.push(filerelpath)
        else {
            fileevt = { zid: langzid, reqmsg: reqmsg, frps: [filerelpath] }
            fileevts.push(fevt)
        }
        if (reqmsg===zconn.REQ_FILES_WRITTEN) vsdiag.clear()
        if (reqmsg===zconn.REQ_FILES_CLOSED) vsdiag.delete(file.uri)
    }
}

function onFileClose (file: vs.TextDocument) {
    //  for uri.scheme==='file', occurs only on real close, not on editor tab deactivate
    onFileEvent(file, zconn.REQ_FILES_CLOSED)
}

function onFileOpen (file: vs.TextDocument) {
    //  for uri.scheme==='file', occurs on open and whenever editor tab activate (on linux, BUT on windows only the former apparently WTF?)
    onFileEvent(file, zconn.REQ_FILES_OPENED)
}

function onFileWrite (file: vs.TextDocument) {
    onFileEvent(file, zconn.REQ_FILES_WRITTEN)
}


type RespDiags = { [_relfilepath: string]: zlang.SrcMsg[] }

function onRefreshDiag (alldiagjsons: { [_zid: string]: RespDiags }) {
    lastdiagrecv = Date.now()
    if (!(alldiagjsons && vsdiag)) return // the cheap way to signal: keep all your existing diags in place, nothing changed in the last few seconds

    const all: [vs.Uri, vs.Diagnostic[]][] = []
    for (const zid in alldiagjsons) {
        const ziddiagjsons: RespDiags = alldiagjsons[zid]
        for (const relfilepath in ziddiagjsons) {
            const   filediags: vs.Diagnostic[] = [],
                    diagjsons: zlang.SrcMsg[] = ziddiagjsons[relfilepath]
            if (diagjsons) if (typeof(diagjsons)==='string') {  console.log(alldiagjsons)  ;  z.outThrow("WUTTTTT::"+diagjsons, "onRefreshDiag")  }
            else for (const dj of diagjsons) if (dj) {
                const isrange = dj.Pos2Ln>dj.Pos1Ln || (dj.Pos2Ln==dj.Pos1Ln && dj.Pos2Ch>dj.Pos1Ch)
                if (!isrange) { dj.Pos2Ln = dj.Pos1Ln  ;  dj.Pos2Ch = dj.Pos1Ch }
                dj.Pos1Ln = dj.Pos1Ln-1 ; dj.Pos1Ch = dj.Pos1Ch-1 ; dj.Pos2Ln = dj.Pos2Ln-1 ; dj.Pos2Ch = dj.Pos2Ch-1
                const fd = new vs.Diagnostic(new vs.Range(dj.Pos1Ln, dj.Pos1Ch, dj.Pos2Ln, dj.Pos2Ch), dj.Msg, dj.Flag)
                if (dj.Data && dj.Data['rn'] && dj.Data['rn'].length) {
                    const rn: string[] = dj.Data['rn']
                    dj.Data['rn'] = rn.map((n)=> { if (n.startsWith("\"") && n.endsWith("\"") && n.length>2)
                        try { const s = JSON.parse(n)  ;  if (s) return s+"" } catch (_) {}  ;  return n  })
                }
                fd['zen:data'] = dj.Data  ;  fd.source = "ℤ • " + dj.Ref + (dj.Misc  ?  (" » " + dj.Misc)  :  '')  ;  filediags.push(fd)
            }
            if (filediags.length)
                all.push([vs.Uri.file(node_path.join(vsproj.rootPath, relfilepath)), filediags])
        }
    }
    vsdiag.clear()
    vsdiag.set(all)
}


export function fileDiags (file: vs.TextDocument, pos: vs.Position | vs.Range = undefined) {
    const d: vs.Diagnostic[] = (!vsdiag)  ?  undefined  :  vsdiag.get(file.uri)
    return  (!d)  ?  []  :  (!pos)  ?  d  :  d.filter((d: vs.Diagnostic)=> d.range.contains(pos))
}


function refreshDiag () {
    if (vsdiag && zconn.isAlive())
        zconn.requestJson(zconn.REQ_QUERY_DIAGS).then(onRefreshDiag, z.outThrow)
}


export function relPath (loc: string | vs.Uri) {
    return vsproj.asRelativePath(loc)
}

export function relFilePath (file: vs.TextDocument) {
    return relPath(file.uri)
}
