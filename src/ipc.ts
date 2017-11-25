import * as z from './zentient'
import * as zprocs from './procs'

let handlers: { [_reqid: number]: (resp: MsgResp) => any } = {}


export type MsgReq = {
    "i": number,
    "m": number,
    "a": {}
}

export type MsgResp = {
    "i": number,
    "e": string
}

export enum MsgIDs {
    _,
    REQ_CMDS_LIST
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
    const pipe = zprocs.pipe(langid)
    if (!pipe) return

    const reqid = Date.now()
    const r: MsgReq = { i: reqid, m: msgid, a: msgargs }
    if (onResp)
        handlers[reqid] = onResp
    try {
        const onsent = z.log
        const reqjson = JSON.stringify(r, null, "")
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
