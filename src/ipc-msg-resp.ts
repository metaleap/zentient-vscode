import * as z from './zentient'
import * as zcorecmds from './z-core-cmds'
import * as zipc_req from './ipc-msg-req'


const logJsonResps = false


export type ResponseHandler = (langId: string, resp: MsgResp) => void
export type ResponseClosure = (resp: MsgResp) => void

export type MsgResp = {
    ri: number
    e: string

    mi: zipc_req.MsgIDs
    menu: zcorecmds.Menu
    url: string
    info: string
    warn: string
    action: string
    srcMod: zipc_req.SrcLoc
}


export let handlers: { [_reqid: number]: ResponseClosure } = {}


export function onRespJsonLn(jsonresp: string) {
    let resp: MsgResp = null
    try { resp = JSON.parse(jsonresp) } catch (e) {
        z.log(`❗ Non-JSON reply by language provider —— ${e}: '${jsonresp}'`)
    }
    if (!resp) return
    if (logJsonResps)
        z.log(jsonresp)

    const onresp = resp.ri ? handlers[resp.ri] : null
    if (onresp)
        delete handlers[resp.ri]
    const reqidvalid = onresp || (resp.ri === 0)
    if (!reqidvalid)
        z.log(`❗ Bad JSON reply by language provider ——— invalid request ID: ${resp.ri}`)

    if (resp.e)
        z.log(`❗ ${resp.e}`)
    else if (resp.ri === 0) {
        //  handle later for "broadcasts without subscribers"
    } else if (onresp)
        onresp(resp)
}
