import * as vs from 'vscode'
import vswin = vs.window

import * as z from './zentient'
import * as zipc_resp from './ipc-msg-resp'
import * as zprocs from './procs'
import * as zsrc from './z-src'
import * as zvscfg from './vsc-settings'


const logJsonReqs = true

let msgCounter = 1

export enum MsgIDs {
    _,

    coreCmds_Palette,

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
    extras_Query_List,
    extras_Invoke,

    minInvalid
}

type Msg = {
    ri: number
    mi: MsgIDs
    ma: any

    sl: zsrc.Lens
}

function needs(msgreq: Msg, field: string) {
    const mi = msgreq.mi
    const anyof = (...msgids: MsgIDs[]) => msgids.includes(mi)

    const anyif = anyof(MsgIDs.extras_Invoke)
    if (anyif) return true

    switch (field) {
        case 'lf':
            return anyof(MsgIDs.srcMod_Rename)
        case 'fp':
            return anyof(MsgIDs.coreCmds_Palette, MsgIDs.srcMod_Fmt_RunOnFile, MsgIDs.srcMod_Fmt_RunOnSel, MsgIDs.srcIntel_Hover, MsgIDs.srcIntel_SymsFile, MsgIDs.srcIntel_SymsProj, MsgIDs.srcIntel_CmplItems, MsgIDs.srcIntel_CmplDetails, MsgIDs.srcIntel_Highlights, MsgIDs.srcIntel_Signature, MsgIDs.srcMod_Rename, MsgIDs.srcIntel_References, MsgIDs.srcIntel_DefImpl, MsgIDs.srcIntel_DefSym, MsgIDs.srcIntel_DefType, MsgIDs.srcMod_Actions)
        case 'sf':
            return anyof(MsgIDs.srcMod_Fmt_RunOnFile, MsgIDs.srcIntel_Hover, MsgIDs.srcIntel_SymsFile, MsgIDs.srcIntel_SymsProj, MsgIDs.srcIntel_CmplItems, MsgIDs.srcIntel_CmplDetails, MsgIDs.srcIntel_Highlights, MsgIDs.srcIntel_Signature, MsgIDs.srcMod_Rename)
        case 'ss':
            return anyof(MsgIDs.coreCmds_Palette, MsgIDs.srcMod_Fmt_RunOnSel)
        case 'p':
            return anyof(MsgIDs.srcIntel_Hover, MsgIDs.srcIntel_CmplItems, MsgIDs.srcIntel_CmplDetails, MsgIDs.srcIntel_Highlights, MsgIDs.srcIntel_Signature, MsgIDs.srcMod_Rename, MsgIDs.srcIntel_References, MsgIDs.srcIntel_DefImpl, MsgIDs.srcIntel_DefSym, MsgIDs.srcIntel_DefType)
        case 'r':
            return anyof(MsgIDs.srcMod_Fmt_RunOnSel, MsgIDs.srcIntel_Highlights, MsgIDs.srcMod_Actions)
    }
    return false
}

function prepMsgReq(msgreq: Msg, td: vs.TextDocument, range: vs.Range, pos: vs.Position) {
    const srcloc = {} as zsrc.Lens
    const need = (f: string) => needs(msgreq, f)

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
    if ((!srcloc.ss) && (need('w')) && pos)
        td.getWordRangeAtPosition(pos)

    // only set `msgreq.sl` if our local `srcloc` had at least one thing set above
    for (const _justonceunlessempty in srcloc) {
        msgreq.sl = srcloc
        break
    }
}

export function forEd<T>(te: vs.TextEditor, msgId: MsgIDs, msgArgs: any, onResp: zipc_resp.To<T>, range?: vs.Range, pos?: vs.Position) {
    return forFile<T>(te.document, msgId, msgArgs, onResp, te, range, pos)
}

export function forFile<T>(td: vs.TextDocument, msgId: MsgIDs, msgArgs: any, onResp: zipc_resp.To<T>, te?: vs.TextEditor, range?: vs.Range, pos?: vs.Position) {
    return forLang<T>(td.languageId, msgId, msgArgs, onResp, te, td, range, pos)
}

export function forLang<T>(langId: string, msgId: MsgIDs, msgArgs: any, onResp: zipc_resp.To<T>, te?: vs.TextEditor, td?: vs.TextDocument, range?: vs.Range, pos?: vs.Position) {
    if (!te) te = vswin.activeTextEditor
    if ((!range) && te) range = te.selection
    if ((!pos) && te && te.selection) pos = te.selection.active
    if ((!td) && te) td = te.document
    if (langId && td && td.languageId !== langId)
        td = undefined
    else if ((!langId) && td)
        langId = td.languageId

    return new Promise<T>((onresult, onfailure) => {
        onfailure = zipc_resp.errHandler(msgId, onfailure)

        const progname = zvscfg.langProg(langId)
        if (!progname)
            return onfailure(`No Zentient language provider for '${langId}' documents configured in any 'settings.json's 'zentient.langProgs' settings.`)

        const proc = zprocs.proc(progname, langId)
        if (!proc)
            return onfailure(`Could not run '${progname}' (configured in your 'settings.json' as the Zentient provider for '${langId}' files)`)

        const reqid = (msgCounter++)
        const msgreq = { ri: reqid, mi: msgId } as Msg
        if (msgArgs) msgreq.ma = msgArgs
        if (td) prepMsgReq(msgreq, td, range, pos)

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
            const jsonreq = JSON.stringify(msgreq, null, "")
            if (!proc.stdin.write(jsonreq + '\n'))
                proc.stdin.once('drain', onsendmaybefailed)
            else
                process.nextTick(onsendmaybefailed)
            if (logJsonReqs)
                z.log(jsonreq)
        } catch (e) {
            onsendmaybefailed(e)
        }
    })
}
