import * as z from './zentient'
import * as vs from 'vscode'


export type ResponseHandler = (resp: MsgResp) => void

export type MsgResp = {
    i: number,
    e: string

    m: MsgRespMenu
}

export type MsgRespMenu = {
    d: string,
    c: MsgRespPick[]
}

export type MsgRespPick = {
    i: number,
    m: number,
    t: string,
    d1: string,
    d2: string
}


export let handlers: { [_reqid: number]: (resp: MsgResp) => any } = {}


export function pickToItem(pick: MsgRespPick) {
    const item: vs.QuickPickItem = { label: pick.t, description: pick.d1, detail: pick.d2 }
    return item
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
