import * as vs from 'vscode'
import vsproj = vs.workspace
import vswin = vs.window

import * as z from './zentient'
import * as zipc_resp from './ipc-resp'
import * as zipc_pipeio from './ipc-pipe-io'
import * as zproj from './z-workspace'
import * as zsrc from './z-src'
import * as zvscfg from './vsc-settings'


const logJsonReqs = false

let lastlangid = '',
    lastfilepath = '',
    counter = 1

export enum IpcIDs {
    _,

    MENUS_MAIN,
    MENUS_PKGS,
    MENUS_TOOLS,

    OBJ_SNAPSHOT,

    PROJ_CHANGED,
    PROJ_POLLEVTS,

    SRCDIAG_LIST,
    SRCDIAG_TOGGLE,
    SRCDIAG_RUN,
    SRCDIAG_PUB,

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

function needs(req: Msg, field: string) {
    const mi = req.ii
    const anyof = (...ipcids: IpcIDs[]) => ipcids.includes(mi)

    const yesplz = anyof(IpcIDs.EXTRAS_INTEL_RUN, IpcIDs.EXTRAS_QUERY_RUN)
    if (yesplz) return true

    switch (field) {
        case 'lf':
            return anyof(IpcIDs.SRCMOD_RENAME)
        case 'fp':
            return anyof(IpcIDs.MENUS_MAIN, IpcIDs.SRCMOD_FMT_RUNONFILE, IpcIDs.SRCMOD_FMT_RUNONSEL, IpcIDs.SRCINTEL_HOVER, IpcIDs.SRCINTEL_SYMS_FILE, IpcIDs.SRCINTEL_SYMS_PROJ, IpcIDs.SRCINTEL_CMPL_ITEMS, IpcIDs.SRCINTEL_CMPL_DETAILS, IpcIDs.SRCINTEL_HIGHLIGHTS, IpcIDs.SRCINTEL_SIGNATURE, IpcIDs.SRCMOD_RENAME, IpcIDs.SRCINTEL_REFERENCES, IpcIDs.SRCINTEL_DEFIMPL, IpcIDs.SRCINTEL_DEFSYM, IpcIDs.SRCINTEL_DEFTYPE, IpcIDs.SRCMOD_ACTIONS)
        case 'sf':
            return anyof(IpcIDs.SRCMOD_FMT_RUNONFILE, IpcIDs.SRCINTEL_HOVER, IpcIDs.SRCINTEL_SYMS_FILE, IpcIDs.SRCINTEL_SYMS_PROJ, IpcIDs.SRCINTEL_CMPL_ITEMS, IpcIDs.SRCINTEL_CMPL_DETAILS, IpcIDs.SRCINTEL_HIGHLIGHTS, IpcIDs.SRCINTEL_SIGNATURE, IpcIDs.SRCMOD_RENAME)
        case 'ss':
            return anyof(IpcIDs.MENUS_MAIN, IpcIDs.SRCMOD_FMT_RUNONSEL)
        case 'p':
            return anyof(IpcIDs.SRCINTEL_HOVER, IpcIDs.SRCINTEL_CMPL_ITEMS, IpcIDs.SRCINTEL_CMPL_DETAILS, IpcIDs.SRCINTEL_HIGHLIGHTS, IpcIDs.SRCINTEL_SIGNATURE, IpcIDs.SRCMOD_RENAME, IpcIDs.SRCINTEL_REFERENCES, IpcIDs.SRCINTEL_DEFIMPL, IpcIDs.SRCINTEL_DEFSYM, IpcIDs.SRCINTEL_DEFTYPE)
        case 'r':
            return anyof(IpcIDs.SRCMOD_FMT_RUNONSEL, IpcIDs.SRCINTEL_HIGHLIGHTS, IpcIDs.SRCMOD_ACTIONS)
    }
    return false
}

function prep(req: Msg, td: vs.TextDocument, range: vs.Range, pos: vs.Position) {
    if (req.ii === IpcIDs.PROJ_CHANGED) {
        req.projUpd = req.ia
        req.ia = undefined
    } else if (td) {
        const srcloc = {} as zsrc.Lens
        const need = (f: string) => needs(req, f)

        if (need('lf'))
            srcloc.lf = td.eol == vs.EndOfLine.CRLF
        if (need('fp') && td.fileName && !td.isUntitled)
            srcloc.fp = td.fileName
        if (((!srcloc.fp) || td.isDirty) && need('sf'))
            srcloc.sf = td.getText()
        if (pos && need('p'))
            srcloc.p = zsrc.fromVsPos(pos, td)
        if (range) {
            if (need('ss') && !range.isEmpty)
                srcloc.ss = td.getText(range)
            if (need('r'))
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
    const progname = zvscfg.langOk(langId) ? zvscfg.langProg(langId) : undefined
    if ((!progname) && lastlangid) // handle accidental invocation from a Log panel, config file etc by assuming the most-recently-used lang:
        return forLang<T>(lastlangid, ipcId, ipcArgs, onResp, te, td, range, pos)

    if (!te) te = vswin.activeTextEditor
    if ((!range) && te) range = te.selection
    if ((!pos) && te && te.selection) pos = te.selection.active
    if ((!td) && te) td = te.document
    if (langId && td && td.languageId !== langId)
        td = (!lastfilepath) ? undefined : vsproj.textDocuments.find(d => d && d.uri && d.uri.fsPath === lastfilepath)
    else if ((!langId) && td)
        langId = td.languageId

    return new Promise<T>((onresult, onfailure) => {
        onfailure = zipc_resp.errHandler(ipcId, onfailure)

        if (!progname)
            return onfailure(`No Zentient language provider for '${langId}' documents configured in any 'settings.json's 'zentient.langProgs' settings.`)

        const proc = zipc_pipeio.proc(progname, langId)
        if (proc) {
            lastlangid = langId
            if (td) lastfilepath = td.uri.fsPath
        } else
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
        } catch (e) {
            onsendmaybefailed(e)
        }
    })
}
