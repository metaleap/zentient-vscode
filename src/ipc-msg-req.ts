import * as vs from 'vscode'
import vswin = vs.window

import * as z from './zentient'
import * as zipc_resp from './ipc-msg-resp'
import * as zprocs from './procs'
import * as zsrc from './src-util'
import * as zvscfg from './vsc-settings'


const logJsonReqs = false


export enum MsgIDs {
    _,

    coreCmds_Palette,

    srcFmt_SetDefMenu,
    srcFmt_SetDefPick,
    srcFmt_RunOnFile,
    srcFmt_RunOnSel
}

export type MsgReq = {
    ri: number
    mi: MsgIDs
    ma: any

    sl: zsrc.Lens
}

function errHandler(orig: (_reason?: any) => void): (_reason?: any) => void {
    if (!orig) return z.logWarn
    return (reason?: any) => {
        if (reason) {
            z.logWarn(reason)
            orig(reason)
        }
    }
}

function needs(msgreq: MsgReq, field: string) {
    const mi = msgreq.mi
    const anyof = (...msgids: MsgIDs[]) => msgids.includes(mi)
    switch (field) {
        case 'fp':
            return anyof(MsgIDs.coreCmds_Palette, MsgIDs.srcFmt_RunOnFile, MsgIDs.srcFmt_RunOnSel)
        case 'sf':
            return anyof(MsgIDs.srcFmt_RunOnFile)
        case 'ss':
            return anyof(MsgIDs.coreCmds_Palette, MsgIDs.srcFmt_RunOnSel)
        case 'p':
            return anyof(MsgIDs.srcFmt_RunOnSel)
    }
    return false
}

function prepMsgReq(msgreq: MsgReq, td: vs.TextDocument, range: vs.Range) {
    if (!td) return
    const srcloc = {} as zsrc.Lens

    if (needs(msgreq, 'fp') && td.fileName)
        srcloc.fp = td.fileName
    if (((!srcloc.fp) || td.isDirty) && needs(msgreq, 'sf'))
        srcloc.sf = td.getText()
    if (range) {
        if (needs(msgreq, 'ss') && !range.isEmpty)
            srcloc.ss = td.getText(range)
        if (needs(msgreq, 'p'))
            zsrc.fromVsRange(td, range, srcloc)
    }

    for (const _justonceunlessempty in srcloc) {
        msgreq.sl = srcloc
        break
    }
}

export function forEd<T>(te: vs.TextEditor, msgId: MsgIDs, msgArgs: any, onResp: zipc_resp.Handler<T>, range?: vs.Range) {
    return forFile<T>(te.document, msgId, msgArgs, onResp, te, range)
}

export function forFile<T>(td: vs.TextDocument, msgId: MsgIDs, msgArgs: any, onResp: zipc_resp.Handler<T>, te?: vs.TextEditor, range?: vs.Range) {
    return forLang<T>(td.languageId, msgId, msgArgs, onResp, te, td, range)
}

export function forLang<T>(langId: string, msgId: MsgIDs, msgArgs: any, onResp: zipc_resp.Handler<T>, te?: vs.TextEditor, td?: vs.TextDocument, range?: vs.Range) {
    if (!te) te = vswin.activeTextEditor
    if ((!range) && te) range = te.selection
    if ((!td) && te) td = te.document
    if ((!langId) && td) langId = td.languageId

    return new Promise<T>((onresult, onfailure) => {
        onfailure = errHandler(onfailure)

        const progname = zvscfg.langProg(langId)
        if (!progname)
            return onfailure(`No Zentient language provider for '${langId}' documents configured in any 'settings.json's 'zentient.langProgs' settings.`)

        const proc = zprocs.proc(progname, langId)
        if (!proc)
            return onfailure(`Could not run '${progname}' (configured in your 'settings.json' as the Zentient provider for '${langId}' files)`)

        const reqid = Date.now()
        const msgreq = { ri: reqid, mi: msgId } as MsgReq
        if (msgArgs) msgreq.ma = msgArgs
        prepMsgReq(msgreq, td, range)

        let handler: (_: zipc_resp.MsgResp) => void
        if (onResp) {
            handler = zipc_resp.handles<T>(langId, onResp, onresult, onfailure)
            zipc_resp.handlers[reqid] = handler
        }
        try {
            const jsonreq = JSON.stringify(msgreq, null, "")
            const onsentandmaybefailed = (failed: any) => { if (failed) onfailure(failed) }
            if (!proc.stdin.write(jsonreq + '\n'))
                proc.stdin.once('drain', onsentandmaybefailed)
            else
                process.nextTick(onsentandmaybefailed)
            if (logJsonReqs)
                z.log(jsonreq)
        } catch (e) {
            if (handler)
                delete zipc_resp.handlers[reqid]
            return onfailure(e)
        }
    })
}
