import * as vs from 'vscode'
import vswin = vs.window

import * as z from './zentient'
import * as zipc_resp from './ipc-msg-resp'
import * as zprocs from './procs'
import * as zvscfg from './vsc-settings'


const logJsonReqs = false


export enum MsgIDs {
    _,

    coreCmds_ListAll,

    srcFmt_SetDefMenu,
    srcFmt_SetDefPick,
    srcFmt_RunOnFile,
    srcFmt_RunOnSel
}

export type MsgReq = {
    ri: number
    mi: MsgIDs
    ma: any

    sl: SrcLoc
}

export type SrcLocPos = {
    o: number // 1-based Offset
    l: number // 1-based Line
    c: number // 1-based Col
}

export type SrcLoc = {
    fp: string  // FilePath
    sf: string  // SrcFull
    ss: string  // SrcSel
    p0: SrcLocPos
    p1: SrcLocPos
}

function needs(msgreq: MsgReq, field: string) {
    const mi = msgreq.mi
    const anyof = (...msgids: MsgIDs[]) => {
        for (let i = 0; i < msgids.length; i++)
            if (mi == msgids[i])
                return true
        return false
    }
    switch (field) {
        case 'fp':
            return anyof(MsgIDs.coreCmds_ListAll, MsgIDs.srcFmt_RunOnFile, MsgIDs.srcFmt_RunOnSel)
        case 'sf':
            return anyof(MsgIDs.srcFmt_RunOnFile)
        case 'ss':
            return anyof(MsgIDs.coreCmds_ListAll, MsgIDs.srcFmt_RunOnSel)
        case 'p':
            return anyof(MsgIDs.srcFmt_RunOnSel)
    }
    return false
}

function prepMsgReq(msgreq: MsgReq) {
    const te = vswin.activeTextEditor
    if (!te) return
    const td = te ? te.document : null
    if (!td) return

    const srcloc = {} as SrcLoc

    if (needs(msgreq, 'fp') && td.fileName)
        srcloc.fp = td.fileName
    if (((!srcloc.fp) || td.isDirty) && needs(msgreq, 'sf'))
        srcloc.sf = td.getText()
    if (needs(msgreq, 'ss') && te.selection && !te.selection.isEmpty)
        srcloc.ss = td.getText(te.selection)
    if (needs(msgreq, 'p')) {
        const p0 = te.selection.start, p1 = te.selection.end
        srcloc.p0 = { l: p0.line + 1, c: p0.character + 1, o: td.offsetAt(p0) + 1 }
        if (!p1.isEqual(p0))
            srcloc.p1 = { l: p1.line + 1, c: p1.character + 1, o: td.offsetAt(p1) + 1 }
    }

    for (const _useonlyifnotempty in srcloc) {
        msgreq.sl = srcloc
        break
    }
}

export function reqForDocument(td: vs.TextDocument, msgId: MsgIDs, msgArgs: any, onResp: zipc_resp.ResponseHandler) {
    if (!(td && td.languageId)) return 0
    return reqForLang(td.languageId, msgId, msgArgs, onResp)
}

export function reqForEditor(te: vs.TextEditor, msgId: MsgIDs, msgArgs: any, onResp: zipc_resp.ResponseHandler) {
    if (!te) return 0
    return reqForDocument(te.document, msgId, msgArgs, onResp)
}

export function reqForLang(langid: string, msgId: MsgIDs, msgArgs: any, onResp: zipc_resp.ResponseHandler) {
    if (!langid)
        return 0

    const progname = zvscfg.langProg(langid)
    if (!progname) {
        z.log(`❗ No Zentient language provider for '${langid}' documents configured in any 'settings.json's 'zentient.langProgs' settings.`)
        return 0
    }

    const proc = zprocs.proc(progname, langid)
    if (!proc)
        return 0

    const reqid = Date.now()
    const msgreq = { ri: reqid, mi: msgId } as MsgReq
    if (msgArgs) msgreq.ma = msgArgs
    prepMsgReq(msgreq)

    if (onResp)
        zipc_resp.handlers[reqid] = (msgResp: zipc_resp.MsgResp) => onResp(langid, msgResp)

    try {
        const jsonreq = JSON.stringify(msgreq, null, "")
        const onsentandmaybefailed = z.log
        if (!proc.stdin.write(jsonreq + '\n'))
            proc.stdin.once('drain', onsentandmaybefailed)
        else
            process.nextTick(onsentandmaybefailed)
        if (logJsonReqs)
            z.log(jsonreq)
    } catch (e) {
        if (onResp)
            delete zipc_resp.handlers[reqid]
        z.log(e)
    }
    return reqid
}
