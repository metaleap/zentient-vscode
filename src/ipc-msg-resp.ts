import * as z from './zentient'
import * as zmetacmds from './z-meta-cmds'

export type ResponseHandlerFull = (langId: string, resp: MsgResp) => void
export type ResponseHandlerClosure = (resp: MsgResp) => void

export type MsgResp = {
    i: number,
    e: string

    mcM: zmetacmds.Menu
}


export let handlers: { [_reqid: number]: ResponseHandlerClosure } = {}


export function onRespJsonLn(respjson: string) {
    let resp: MsgResp = null
    try { resp = JSON.parse(respjson) } catch (e) {
        z.log(`❗ Non-JSON reply by language provider —— ${e}: '${respjson}'`)
    }
    if (!resp) return

    const onresp = resp.i ? handlers[resp.i] : null
    if (onresp)
        delete handlers[resp.i]
    const reqidvalid = onresp || (resp.i === 0)
    if (!reqidvalid)
        z.log(`❗ Bad JSON reply by language provider ——— invalid request ID: ${resp.i}`)

    if (resp.e)
        z.log(`❗ ${resp.e}`)
    else if (resp.i === 0) {
        //  handle later for "broadcasts without subscribers"
    } else if (onresp)
        onresp(resp)
}
