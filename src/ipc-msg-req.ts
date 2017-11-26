import * as vs from 'vscode'
import vswin = vs.window

import * as z from './zentient'
import * as zprocs from './procs'
import * as zipc_resp from './ipc-msg-resp'


export enum MsgIDs {
    _,

    msgID_metaCmds_ListAll,

    msgID_codeFmt_ListAll
}

export type MsgReq = {
    i: number,
    m: number, // type is enum MsgIDs, but `number` encoded in JSON
    a: {},

    fp: string, // FilePath
    sf: string, // SrcFull
    ss: string, // SrcSel
    po: number, // PosOff
    pl: number, // PosLn
    pc: number, // PosCol
}

function needs(_msgreq: MsgReq, field: string) {
    switch (field) {
        case 'fp': return false
        case 'sf': return false
        case 'ss': return false
        case 'p': return false
        default: return false
    }
}

function prepMsgReq(msgreq: MsgReq) {
    const te = vswin.activeTextEditor
    if (!te) return
    const td = te ? te.document : null
    if (!td) return

    if (needs(msgreq, 'fp') && td.fileName)
        msgreq.fp = td.fileName
    if (needs(msgreq, 'sf'))
        msgreq.sf = td.getText()
    if (needs(msgreq, 'ss') && te.selection && !te.selection.isEmpty)
        msgreq.ss = td.getText(te.selection)
    if (needs(msgreq, 'p')) {
        const pos = te.selection.active
        msgreq.pl = pos.line + 1
        msgreq.pc = pos.character + 1
        msgreq.po = td.offsetAt(pos) + 1
    }
}

export function reqForDocument(td: vs.TextDocument, msgId: MsgIDs, msgArgs: {}, onResp: zipc_resp.ResponseHandlerFull) {
    if (!(td && td.languageId)) return
    return reqForLang(td.languageId, msgId, msgArgs, onResp)
}

export function reqForEditor(te: vs.TextEditor, msgId: MsgIDs, msgArgs: {}, onResp: zipc_resp.ResponseHandlerFull) {
    if (!te) return
    return reqForDocument(te.document, msgId, msgArgs, onResp)
}

export function reqForLang(langid: string, msgId: MsgIDs, msgArgs: {}, onResp: zipc_resp.ResponseHandlerFull) {
    if (!langid) return

    const proc = zprocs.proc(langid)
    if (!proc) return

    const reqid = Date.now()
    const msgreq = { i: reqid, m: msgId } as MsgReq
    if (msgArgs) msgreq.a = msgArgs
    prepMsgReq(msgreq)

    if (onResp)
        zipc_resp.handlers[reqid] = (msgResp: zipc_resp.MsgResp) => onResp(langid, msgResp)
    try {
        const reqjson = JSON.stringify(msgreq, null, "")
        const onsent = z.log
        if (!proc.stdin.write(reqjson + '\n'))
            proc.stdin.once('drain', onsent)
        else
            process.nextTick(onsent)
    } catch (e) {
        if (onResp)
            delete zipc_resp.handlers[reqid]
        z.log(e)
    }
}
