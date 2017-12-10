import * as vs from 'vscode'
import vswin = vs.window

import * as z from './zentient'
import * as zipc_resp from './ipc-resp'
import * as zipc_pipeio from './ipc-pipe-io'
import * as zproj from './z-workspace'
import * as zsrc from './z-src'
import * as zvscfg from './vsc-settings'


const logJsonReqs = true

let lastlangid = '',
    counter = 1

export enum IpcIDs {
    _,

    menus_Main,
    menus_Pkgs,

    obj_Snapshot,

    proj_Changed,
    proj_PollFileEvts,

    srcMod_Fmt_SetDefMenu,
    srcMod_Fmt_SetDefPick,
    srcMod_Fmt_RunOnFile,
    srcMod_Fmt_RunOnSel,
    srcMod_Rename,
    srcMod_Actions,

    srcIntel_Hover,
    srcIntel_SymsFile,
    srcIntel_SymsProj,
    srcIntel_CmplItems,
    srcIntel_CmplDetails,
    srcIntel_Highlights,
    srcIntel_Signature,
    srcIntel_References,
    srcIntel_DefSym,
    srcIntel_DefType,
    srcIntel_DefImpl,

    extras_Intel_List,
    extras_Intel_Run,
    extras_Query_List,
    extras_Query_Run,

    minInvalid
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

    const yesplz = anyof(IpcIDs.extras_Intel_Run, IpcIDs.extras_Query_Run)
    if (yesplz) return true

    switch (field) {
        case 'lf':
            return anyof(IpcIDs.srcMod_Rename)
        case 'fp':
            return anyof(IpcIDs.menus_Main, IpcIDs.srcMod_Fmt_RunOnFile, IpcIDs.srcMod_Fmt_RunOnSel, IpcIDs.srcIntel_Hover, IpcIDs.srcIntel_SymsFile, IpcIDs.srcIntel_SymsProj, IpcIDs.srcIntel_CmplItems, IpcIDs.srcIntel_CmplDetails, IpcIDs.srcIntel_Highlights, IpcIDs.srcIntel_Signature, IpcIDs.srcMod_Rename, IpcIDs.srcIntel_References, IpcIDs.srcIntel_DefImpl, IpcIDs.srcIntel_DefSym, IpcIDs.srcIntel_DefType, IpcIDs.srcMod_Actions)
        case 'sf':
            return anyof(IpcIDs.srcMod_Fmt_RunOnFile, IpcIDs.srcIntel_Hover, IpcIDs.srcIntel_SymsFile, IpcIDs.srcIntel_SymsProj, IpcIDs.srcIntel_CmplItems, IpcIDs.srcIntel_CmplDetails, IpcIDs.srcIntel_Highlights, IpcIDs.srcIntel_Signature, IpcIDs.srcMod_Rename)
        case 'ss':
            return anyof(IpcIDs.menus_Main, IpcIDs.srcMod_Fmt_RunOnSel)
        case 'p':
            return anyof(IpcIDs.srcIntel_Hover, IpcIDs.srcIntel_CmplItems, IpcIDs.srcIntel_CmplDetails, IpcIDs.srcIntel_Highlights, IpcIDs.srcIntel_Signature, IpcIDs.srcMod_Rename, IpcIDs.srcIntel_References, IpcIDs.srcIntel_DefImpl, IpcIDs.srcIntel_DefSym, IpcIDs.srcIntel_DefType)
        case 'r':
            return anyof(IpcIDs.srcMod_Fmt_RunOnSel, IpcIDs.srcIntel_Highlights, IpcIDs.srcMod_Actions)
    }
    return false
}

function prep(req: Msg, td: vs.TextDocument, range: vs.Range, pos: vs.Position) {
    if (req.ii === IpcIDs.proj_Changed) {
        req.projUpd = req.ia
        req.ia = undefined
    } else if (td) {
        const srcloc = {} as zsrc.Lens
        const need = (f: string) => needs(req, f)

        if (need('lf'))
            srcloc.lf = td.eol == vs.EndOfLine.CRLF
        if (need('fp') && td.fileName)
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
        td = undefined
    else if ((!langId) && td)
        langId = td.languageId

    return new Promise<T>((onresult, onfailure) => {
        onfailure = zipc_resp.errHandler(ipcId, onfailure)

        if (!progname)
            return onfailure(`No Zentient language provider for '${langId}' documents configured in any 'settings.json's 'zentient.langProgs' settings.`)

        const proc = zipc_pipeio.proc(progname, langId)
        if (proc)
            lastlangid = langId
        else
            return onfailure(`Could not run '${progname}' (configured in your 'settings.json' as the Zentient provider for '${langId}' files)`)

        const reqid = counter++
        const req = { ri: reqid, ii: ipcId } as Msg
        if (ipcArgs)
            req.ia = ipcArgs
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
