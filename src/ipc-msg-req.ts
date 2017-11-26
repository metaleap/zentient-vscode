import * as vs from 'vscode'
import vswin = vs.window

import * as z from './zentient'
import * as zprocs from './procs'
import * as zipc_resp from './ipc-msg-resp'


const logJsonReqs = true


export enum MsgIDs {
    _,

    coreCmds_ListAll,

    srcFmt_ListAll,
    srcFmt_InfoLink,
    srcFmt_SetDef,
    srcFmt_RunOnFile,
    srcFmt_RunOnSel
}

export type MsgReq = {
    ri: number
    mi: number   // type is enum MsgIDs, but `number` encoded in JSON
    ma: any

    sl: SrcLoc
}

type SrcLoc = {
    fp: string  // FilePath
    sf: string  // SrcFull
    ss: string  // SrcSel
    po: number  // PosOff
    pl: number  // PosLn
    pc: number  // PosCol
}

function needs(msgreq: MsgReq, field: string) {
    const ismainmenu = msgreq.mi == MsgIDs.coreCmds_ListAll
    switch (field) {
        case 'fp': return ismainmenu
        case 'sf': return ismainmenu
        case 'ss': return ismainmenu
        case 'p': return false
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
        const pos = te.selection.active
        srcloc.pl = pos.line + 1
        srcloc.pc = pos.character + 1
        srcloc.po = td.offsetAt(pos) + 1
    }

    for (const _useonlyifnotempty in srcloc) {
        msgreq.sl = srcloc
        return
    }
}

export function reqForDocument(td: vs.TextDocument, msgId: MsgIDs, msgArgs: any, onResp: zipc_resp.ResponseHandler) {
    if (!(td && td.languageId)) return
    return reqForLang(td.languageId, msgId, msgArgs, onResp)
}

export function reqForEditor(te: vs.TextEditor, msgId: MsgIDs, msgArgs: any, onResp: zipc_resp.ResponseHandler) {
    if (!te) return
    return reqForDocument(te.document, msgId, msgArgs, onResp)
}

export function reqForLang(langid: string, msgId: MsgIDs, msgArgs: any, onResp: zipc_resp.ResponseHandler) {
    if (!langid) return

    const proc = zprocs.proc(langid)
    if (!proc) return

    const reqid = Date.now()
    const msgreq = { ri: reqid, mi: msgId } as MsgReq
    if (msgArgs) msgreq.ma = msgArgs
    prepMsgReq(msgreq)

    if (onResp)
        zipc_resp.handlers[reqid] = (msgResp: zipc_resp.MsgResp) => onResp(langid, msgResp)
    try {
        const reqjson = JSON.stringify(msgreq, null, "")
        const onfailed = z.log
        if (!proc.stdin.write(reqjson + '\n'))
            proc.stdin.once('drain', onfailed)
        else
            process.nextTick(onfailed)
        if (logJsonReqs)
            z.log(reqjson)
    } catch (e) {
        if (onResp)
            delete zipc_resp.handlers[reqid]
        z.log(e)
    }
}
