import * as vs from 'vscode'
import vswin = vs.window

import * as z from './zentient'
import * as zipc from './ipc-protocol-msg-types'
import * as zipc_resp from './ipc-resp'
import * as zipc_pipeio from './ipc-pipe-io'
import * as zproj from './z-workspace'
import * as zsrc from './z-src'
import * as zcfg from './vsc-settings'


const logJsonReqs = false

let counter = 1


enum SrcLensFields {
    FilePath,
    Txt,
    Str,
    Pos,
    Range,
    CrLf
}


function needs(req: zipc.ReqMsg, field: SrcLensFields) {
    const mi = req.ii
    const anyof = (...ipcids: zipc.IDs[]) => ipcids.includes(mi)

    const yesplz = anyof(zipc.IDs.EXTRAS_INTEL_RUN, zipc.IDs.EXTRAS_QUERY_RUN, zipc.IDs.EXTRAS_INTEL_LIST, zipc.IDs.EXTRAS_QUERY_LIST)
    if (yesplz) return true

    switch (field) {
        case SrcLensFields.FilePath:
            return anyof(zipc.IDs.MENUS_MAIN, zipc.IDs.SRCMOD_FMT_RUNONFILE, zipc.IDs.SRCMOD_FMT_RUNONSEL, zipc.IDs.SRCINTEL_HOVER, zipc.IDs.SRCINTEL_SYMS_FILE, zipc.IDs.SRCINTEL_SYMS_PROJ, zipc.IDs.SRCINTEL_CMPL_ITEMS, zipc.IDs.SRCINTEL_CMPL_DETAILS, zipc.IDs.SRCINTEL_HIGHLIGHTS, zipc.IDs.SRCINTEL_SIGNATURE, zipc.IDs.SRCMOD_RENAME, zipc.IDs.SRCINTEL_REFERENCES, zipc.IDs.SRCINTEL_DEFIMPL, zipc.IDs.SRCINTEL_DEFSYM, zipc.IDs.SRCINTEL_DEFTYPE, zipc.IDs.SRCMOD_ACTIONS, zipc.IDs.SRCINTEL_ANNS)
        case SrcLensFields.Txt:
            return anyof(zipc.IDs.SRCMOD_FMT_RUNONFILE, zipc.IDs.SRCINTEL_HOVER, zipc.IDs.SRCINTEL_SYMS_FILE, zipc.IDs.SRCINTEL_SYMS_PROJ, zipc.IDs.SRCINTEL_CMPL_ITEMS, zipc.IDs.SRCINTEL_CMPL_DETAILS, zipc.IDs.SRCINTEL_HIGHLIGHTS, zipc.IDs.SRCINTEL_SIGNATURE, zipc.IDs.SRCMOD_RENAME, zipc.IDs.SRCINTEL_SYMS_FILE, zipc.IDs.SRCINTEL_SYMS_PROJ, zipc.IDs.SRCINTEL_REFERENCES, zipc.IDs.SRCINTEL_DEFIMPL, zipc.IDs.SRCINTEL_DEFSYM, zipc.IDs.SRCINTEL_DEFTYPE)
        case SrcLensFields.Pos:
            return anyof(zipc.IDs.SRCINTEL_HOVER, zipc.IDs.SRCINTEL_CMPL_ITEMS, zipc.IDs.SRCINTEL_CMPL_DETAILS, zipc.IDs.SRCINTEL_HIGHLIGHTS, zipc.IDs.SRCINTEL_SIGNATURE, zipc.IDs.SRCMOD_RENAME, zipc.IDs.SRCINTEL_REFERENCES, zipc.IDs.SRCINTEL_DEFIMPL, zipc.IDs.SRCINTEL_DEFSYM, zipc.IDs.SRCINTEL_DEFTYPE, zipc.IDs.SRCINTEL_SYMS_FILE, zipc.IDs.SRCINTEL_SYMS_PROJ)
        case SrcLensFields.Str:
            return anyof(zipc.IDs.MENUS_MAIN, zipc.IDs.SRCMOD_FMT_RUNONSEL, zipc.IDs.SRCINTEL_CMPL_DETAILS)
        case SrcLensFields.Range:
            return anyof(zipc.IDs.SRCMOD_FMT_RUNONSEL, zipc.IDs.SRCMOD_ACTIONS, zipc.IDs.SRCINTEL_CMPL_DETAILS)
        case SrcLensFields.CrLf:
            return anyof(zipc.IDs.SRCMOD_RENAME)
    }
    return false
}

function prep(req: zipc.ReqMsg, td: vs.TextDocument, range: vs.Range, pos: vs.Position) {
    if (req.ii === zipc.IDs.PROJ_CHANGED) {
        req.projUpd = req.ia
        req.ia = undefined
    } else if (td) {
        const srcloc = {} as zipc.SrcLens
        const need = (f: SrcLensFields) => needs(req, f)

        if (need(SrcLensFields.CrLf))
            srcloc.l = td.eol === vs.EndOfLine.CRLF
        if (need(SrcLensFields.FilePath) && td.fileName && !td.isUntitled)
            srcloc.f = td.fileName
        if (((!srcloc.f) || td.isDirty) && need(SrcLensFields.Txt))
            if (!(srcloc.t = td.getText())) srcloc.t = " ";
        if (pos && need(SrcLensFields.Pos))
            srcloc.p = zsrc.fromVsPos(pos, td)
        if (range) {
            if (need(SrcLensFields.Str) && !range.isEmpty)
                srcloc.s = td.getText(range)
            if (need(SrcLensFields.Range))
                srcloc.r = zsrc.fromVsRange(range, td)
        }

        // only set `req.sl` if our local `srcloc` had at least one thing set above
        for (const _justonceunlessempty in srcloc) {
            req.srcLens = srcloc
            break
        }
    }
}

export function forEd<T>(te: vs.TextEditor, ipcId: zipc.IDs, ipcArgs: any, onResp: zipc_resp.To<T>, range?: vs.Range, pos?: vs.Position) {
    return forFile<T>(te.document, ipcId, ipcArgs, onResp, te, range, pos)
}

export function forFile<T>(td: vs.TextDocument, ipcId: zipc.IDs, ipcArgs: any, onResp: zipc_resp.To<T>, te?: vs.TextEditor, range?: vs.Range, pos?: vs.Position) {
    return forLang<T>(td.languageId, ipcId, ipcArgs, onResp, te, td, range, pos)
}

export function forLang<T>(langId: string, ipcId: zipc.IDs, ipcArgs: any, onResp?: zipc_resp.To<T>, te?: vs.TextEditor, td?: vs.TextDocument, range?: vs.Range, pos?: vs.Position): Promise<T> {
    const progname = zcfg.langProg(langId)
    if ((!progname) && zipc_pipeio.last && zipc_pipeio.last.langId) // handle undefined langId via the most-recently-used lang, if any:
        return forLang<T>(zipc_pipeio.last.langId, ipcId, ipcArgs, onResp, te, td, range, pos)

    if (!te) te = vswin.activeTextEditor
    if ((!range) && te) range = te.selection
    if ((!pos) && te && te.selection) pos = te.selection.active
    if ((!td) && te) td = te.document

    if (langId && td && (td.languageId !== langId) && !zcfg.languageIdOk(td))
        if (td = (!(zipc_pipeio.last && zipc_pipeio.last.filePath)) ? undefined
            : z.findTextFile(zipc_pipeio.last.filePath))
            langId = td.languageId

    if ((!langId) && zcfg.languageIdOk(td))
        langId = td.languageId

    if ((!progname) && langId)
        return forLang<T>(langId, ipcId, ipcArgs, onResp, te, td, range, pos)

    return new Promise<T>((onresult, onfailure) => {
        onfailure = zipc_resp.errHandler(ipcId, onfailure)

        if (!progname)
            return onfailure(`No Zentient language provider for '${langId}' documents configured in any 'settings.json's 'zentient.langProgs' settings.`)

        const proc = zipc_pipeio.proc(progname, langId)
        if (!proc)
            return onfailure(`Could not run '${progname}' (configured in your 'settings.json' as the Zentient provider for '${langId}' files)`)

        const reqid = counter++
        const req = { ri: reqid, ii: ipcId } as zipc.ReqMsg
        if (ipcArgs) req.ia = ipcArgs
        prep(req, td, range, pos)

        let handler: zipc_resp.Responder
        if (onResp) {
            handler = zipc_resp.handler<T>(langId, onResp, onresult, onfailure)
            zipc_resp.handlers[reqid] = handler
        }
        const onsendmaybefailed = (problem: any) => {
            if (problem) {
                if (handler) delete zipc_resp.handlers[reqid]
                onfailure(problem)
            }
        }
        try {
            const jsonreq = JSON.stringify(req, null, "")
            if (!proc.stdin.write(jsonreq + '\n'))
                proc.stdin.once('drain', onsendmaybefailed)
            else
                process.nextTick(onsendmaybefailed)
            if (logJsonReqs)
                z.log(langId + jsonreq)
            zipc_pipeio.setLast(langId, (td && zproj.uriOk(td)) ? td.uri.fsPath : undefined)
        } catch (e) {
            onsendmaybefailed(e)
        }
    })
}
