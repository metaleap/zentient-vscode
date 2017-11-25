import * as vs from 'vscode'
import vswin = vs.window

import * as z from './zentient'
import * as zprocs from './procs'

let continuations: { [_reqid: number]: (resp: MsgResp) => any } = {}


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
    const msgpref = ` Non-JSON reply by ${langid} provider`
    return (respjson: string) => {
        let resp: MsgResp = null
        try { resp = JSON.parse(respjson) } catch (e) { z.log(`${msgpref} —— ${e}: '${respjson}'`) }
        if (resp) {
            if (!resp.i) {
                //  later for "broadcasts without subscribers"
            } else {
                vswin.showInformationMessage(respjson)
                const cont = continuations[resp.i]
                if (cont) {
                    delete continuations[resp.i]
                    cont(resp)
                }
            }
        }
    }
}

export function req(langid: string, msgid: MsgIDs, msgargs: {}, onResp: (resp: MsgResp) => any) {
    const pipe = zprocs.pipe(langid)
    if (!pipe) return

    const reqid = Date.now()
    const r: MsgReq = { i: reqid, m: msgid, a: msgargs }
    if (onResp)
        continuations[reqid] = onResp
    try {
        pipe.write(JSON.stringify(r, null, ""))
    } catch (e) {
        if (onResp)
            delete continuations[reqid]
        z.log(e)
    }
}
