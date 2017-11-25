import * as vs from 'vscode'
import vswin = vs.window

import * as z from './zentient'
import * as zprocs from './procs'


let handlers: { [_reqid: number]: (resp: MsgResp) => any } = {}


export enum MsgIDs {
    _,
    REQ_CMDS_LIST
}

export type MsgReq = {
    "i": number,
    "m": number, // type is enum MsgIDs, but `number` encoded in JSON
    "a": {},

    "fp": string, // FilePath
    "sf": string, // SrcFull
    "ss": string, // SrcSel
    "po": number, // PosOff
    "pl": number, // PosLn
    "pc": number, // PosCol
}

export type MsgResp = {
    "i": number,
    "e": string
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

export function onRespJsonLn(langid: string) {
    const errmsgpref_jsonnon = ` Non-JSON reply by ${langid} provider`,
        errmsgpref_jsonbad = ` Bad JSON reply by ${langid} provider`
    return (respjson: string) => {
        let resp: MsgResp = null
        try { resp = JSON.parse(respjson) } catch (e) { z.log(`${errmsgpref_jsonnon} —— ${e}: '${respjson}'`) }
        if (!resp) return

        const onresp = resp.i ? handlers[resp.i] : null
        if (onresp)
            delete handlers[resp.i]
        const reqidvalid = onresp || (resp.i === 0)
        if (!reqidvalid)
            z.log(`${errmsgpref_jsonbad} ——— invalid request ID: ${resp.i}`)

        if (resp.e)
            z.log(` ${resp.e}`)
        else if (resp.i === 0) {
            //  handle later for "broadcasts without subscribers"
        } else if (onresp) {
            onresp(resp)
        }
    }
}

export function req(langid: string, msgid: MsgIDs, msgargs: {}, onResp: (resp: MsgResp) => any) {
    if (!langid) return

    const proc = zprocs.proc(langid)
    if (!proc) return

    const reqid = Date.now()
    const msgreq = { i: reqid, m: msgid } as MsgReq
    if (msgargs) msgreq.a = msgargs
    prepMsgReq(msgreq)

    if (onResp)
        handlers[reqid] = onResp
    try {
        const reqjson = JSON.stringify(msgreq, null, "")
        const onsent = z.log
        if (!proc.stdin.write(reqjson + '\n'))
            proc.stdin.once('drain', onsent)
        else
            process.nextTick(onsent)
    } catch (e) {
        if (onResp)
            delete handlers[reqid]
        z.log(e)
    }
}
