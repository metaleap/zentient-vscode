import * as vs from 'vscode'
import vswin = vs.window

import * as z from './zentient'
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

export enum IpcIDs {
    _,

    MENUS_MAIN,
    MENUS_PKGS,
    MENUS_TOOLS,

    OBJ_SNAPSHOT,
    PAGE_HTML,
    TREEVIEW_GETITEM,
    TREEVIEW_CHILDREN,
    TREEVIEW_CHANGED,
    CFG_RESETALL,
    CFG_LIST,
    CFG_SET,
    NOTIFY_INFO,
    NOTIFY_WARN,
    NOTIFY_ERR,

    PROJ_CHANGED,
    PROJ_POLLEVTS,

    SRCDIAG_LIST,
    SRCDIAG_RUN_CURFILE,
    SRCDIAG_RUN_OPENFILES,
    SRCDIAG_RUN_ALLFILES,
    SRCDIAG_FORGETALL,
    SRCDIAG_PEEKHIDDEN,
    SRCDIAG_PUB,
    SRCDIAG_AUTO_TOGGLE,
    SRCDIAG_AUTO_ALL,
    SRCDIAG_AUTO_NONE,
    SRCDIAG_STARTED,
    SRCDIAG_FINISHED,

    SRCMOD_FMT_SETDEFMENU,
    SRCMOD_FMT_SETDEFPICK,
    SRCMOD_FMT_RUNONFILE,
    SRCMOD_FMT_RUNONSEL,
    SRCMOD_RENAME,
    SRCMOD_ACTIONS,

    SRCINTEL_HOVER,
    SRCINTEL_SYMS_FILE,
    SRCINTEL_SYMS_PROJ,
    SRCINTEL_CMPL_ITEMS,
    SRCINTEL_CMPL_DETAILS,
    SRCINTEL_HIGHLIGHTS,
    SRCINTEL_SIGNATURE,
    SRCINTEL_REFERENCES,
    SRCINTEL_DEFSYM,
    SRCINTEL_DEFTYPE,
    SRCINTEL_DEFIMPL,

    EXTRAS_INTEL_LIST,
    EXTRAS_INTEL_RUN,
    EXTRAS_QUERY_LIST,
    EXTRAS_QUERY_RUN,

    MIN_INVALID
}

interface Msg {
    ri: number
    ii: IpcIDs
    ia: any

    projUpd: zproj.WorkspaceChanges
    srcLens: zsrc.Lens
}


function needs(req: Msg, field: SrcLensFields) {
    const mi = req.ii
    const anyof = (...ipcids: IpcIDs[]) => ipcids.includes(mi)

    const yesplz = anyof(IpcIDs.EXTRAS_INTEL_RUN, IpcIDs.EXTRAS_QUERY_RUN, IpcIDs.EXTRAS_INTEL_LIST, IpcIDs.EXTRAS_QUERY_LIST)
    if (yesplz) return true

    switch (field) {
        case SrcLensFields.FilePath:
            return anyof(IpcIDs.MENUS_MAIN, IpcIDs.SRCMOD_FMT_RUNONFILE, IpcIDs.SRCMOD_FMT_RUNONSEL, IpcIDs.SRCINTEL_HOVER, IpcIDs.SRCINTEL_SYMS_FILE, IpcIDs.SRCINTEL_SYMS_PROJ, IpcIDs.SRCINTEL_CMPL_ITEMS, IpcIDs.SRCINTEL_CMPL_DETAILS, IpcIDs.SRCINTEL_HIGHLIGHTS, IpcIDs.SRCINTEL_SIGNATURE, IpcIDs.SRCMOD_RENAME, IpcIDs.SRCINTEL_REFERENCES, IpcIDs.SRCINTEL_DEFIMPL, IpcIDs.SRCINTEL_DEFSYM, IpcIDs.SRCINTEL_DEFTYPE, IpcIDs.SRCMOD_ACTIONS)
        case SrcLensFields.Txt:
            return anyof(IpcIDs.SRCMOD_FMT_RUNONFILE, IpcIDs.SRCINTEL_HOVER, IpcIDs.SRCINTEL_SYMS_FILE, IpcIDs.SRCINTEL_SYMS_PROJ, IpcIDs.SRCINTEL_CMPL_ITEMS, IpcIDs.SRCINTEL_CMPL_DETAILS, IpcIDs.SRCINTEL_HIGHLIGHTS, IpcIDs.SRCINTEL_SIGNATURE, IpcIDs.SRCMOD_RENAME, IpcIDs.SRCINTEL_SYMS_FILE, IpcIDs.SRCINTEL_SYMS_PROJ, IpcIDs.SRCINTEL_REFERENCES, IpcIDs.SRCINTEL_DEFIMPL, IpcIDs.SRCINTEL_DEFSYM, IpcIDs.SRCINTEL_DEFTYPE)
        case SrcLensFields.Pos:
            return anyof(IpcIDs.SRCINTEL_HOVER, IpcIDs.SRCINTEL_CMPL_ITEMS, IpcIDs.SRCINTEL_CMPL_DETAILS, IpcIDs.SRCINTEL_HIGHLIGHTS, IpcIDs.SRCINTEL_SIGNATURE, IpcIDs.SRCMOD_RENAME, IpcIDs.SRCINTEL_REFERENCES, IpcIDs.SRCINTEL_DEFIMPL, IpcIDs.SRCINTEL_DEFSYM, IpcIDs.SRCINTEL_DEFTYPE, IpcIDs.SRCINTEL_SYMS_FILE, IpcIDs.SRCINTEL_SYMS_PROJ)
        case SrcLensFields.Str:
            return anyof(IpcIDs.MENUS_MAIN, IpcIDs.SRCMOD_FMT_RUNONSEL, IpcIDs.SRCINTEL_CMPL_DETAILS)
        case SrcLensFields.Range:
            return anyof(IpcIDs.SRCMOD_FMT_RUNONSEL, IpcIDs.SRCMOD_ACTIONS, IpcIDs.SRCINTEL_CMPL_DETAILS)
        case SrcLensFields.CrLf:
            return anyof(IpcIDs.SRCMOD_RENAME)
    }
    return false
}

function prep(req: Msg, td: vs.TextDocument, range: vs.Range, pos: vs.Position) {
    if (req.ii === IpcIDs.PROJ_CHANGED) {
        req.projUpd = req.ia
        req.ia = undefined
    } else if (td) {
        const srcloc = {} as zsrc.Lens
        const need = (f: SrcLensFields) => needs(req, f)

        if (need(SrcLensFields.CrLf))
            srcloc.l = td.eol === vs.EndOfLine.CRLF
        if (need(SrcLensFields.FilePath) && td.fileName && !td.isUntitled)
            srcloc.f = td.fileName
        if (((!srcloc.f) || td.isDirty) && need(SrcLensFields.Txt))
            srcloc.t = td.getText()
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

export function forEd<T>(te: vs.TextEditor, ipcId: IpcIDs, ipcArgs: any, onResp: zipc_resp.To<T>, range?: vs.Range, pos?: vs.Position) {
    return forFile<T>(te.document, ipcId, ipcArgs, onResp, te, range, pos)
}

export function forFile<T>(td: vs.TextDocument, ipcId: IpcIDs, ipcArgs: any, onResp: zipc_resp.To<T>, te?: vs.TextEditor, range?: vs.Range, pos?: vs.Position) {
    return forLang<T>(td.languageId, ipcId, ipcArgs, onResp, te, td, range, pos)
}

export function forLang<T>(langId: string, ipcId: IpcIDs, ipcArgs: any, onResp?: zipc_resp.To<T>, te?: vs.TextEditor, td?: vs.TextDocument, range?: vs.Range, pos?: vs.Position): Promise<T> {
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
        const req = { ri: reqid, ii: ipcId } as Msg
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
