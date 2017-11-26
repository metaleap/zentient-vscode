import * as vs from 'vscode'
import vswin = vs.window

import * as z from './zentient'
import * as zprocs from './procs'
import * as zipc_resp from './ipc-msg-resp'


export enum MsgIDs {
    _,
    REQ_META_CMDS_LISTALL
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

export function req(langid: string, msgid: MsgIDs, msgargs: {}, onResp: zipc_resp.ResponseHandler) {
    if (!langid) return

    const proc = zprocs.proc(langid)
    if (!proc) return

    const reqid = Date.now()
    const msgreq = { i: reqid, m: msgid } as MsgReq
    if (msgargs) msgreq.a = msgargs
    prepMsgReq(msgreq)

    if (onResp)
        zipc_resp.handlers[reqid] = onResp
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
