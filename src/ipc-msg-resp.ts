import * as vs from 'vscode'

import * as z from './zentient'
import * as zmenu from './z-menu'
import * as zextras from './z-extras'
import * as zipc_req from './ipc-msg-req'
import * as zsrc from './z-src'


const logJsonResps = true


export type To<T> = (_langId: string, _resp: Msg) => T
export type Responder = (resp: Msg) => void

export interface Msg {
    ri: number  // ReqID
    e: string   // ErrMsg

    mi: zipc_req.MsgIDs         // MsgID
    menu: zmenu.Resp            // Menu
    extras: zextras.Resp        // Extras
    srcIntel: zsrc.IntelResp    // SrcIntel
    srcMods: zsrc.Lens[]        // SrcMod
    srcActions: vs.Command[]    // SrcActions
}


export let handlers: { [_reqid: number]: Responder } = {}


export function errHandler(msgId: zipc_req.MsgIDs, orig: (_reason?: any) => void): (_reason?: any) => void {
    const supersilent = false
        || msgId === zipc_req.MsgIDs.srcMod_Actions
        || msgId === zipc_req.MsgIDs.srcIntel_Highlights
        || msgId === zipc_req.MsgIDs.srcIntel_Hover
        || msgId === zipc_req.MsgIDs.srcMod_Fmt_RunOnFile
    const silent = supersilent
        || msgId === zipc_req.MsgIDs.srcIntel_SymsProj
    return (reason?: any) => {
        if (orig)
            orig(reason)
        if (reason && !supersilent)
            z.logWarn(reason, !silent)
    }
}

function handle<T>(langId: string, resp: Msg, onResp: To<T>, onResult: (_?: T | PromiseLike<T>) => void, onFailure: (_?: any) => void) {
    if (resp.e) {
        onFailure(resp.e)
        return
    }

    let result: T
    try { result = onResp(langId, resp) } catch (e) {
        onFailure(e)
        return
    }
    onResult(result)
}

export function handler<T>(langId: string, onResp: To<T>, onResult: (_?: T | PromiseLike<T>) => void, onFailure: (_?: any) => void) {
    return (resp: Msg) => handle<T>(langId, resp, onResp, onResult, onFailure)
}

export function onRespJsonLn(jsonresp: string) {
    if (logJsonResps) z.log(jsonresp)
    let resp: Msg
    try { resp = JSON.parse(jsonresp) } catch (e) {
        z.logWarn(`Non-JSON reply by language provider —— ${e}: '${jsonresp}'`)
        return
    }

    const onresp = resp.ri ? handlers[resp.ri] : null
    if (onresp) {
        delete handlers[resp.ri]
        onresp(resp)
    } else if (resp.ri === 0) {
        //  handle later for "broadcasts without subscribers"
    } else
        z.logWarn(`Bad JSON reply by language provider ——— invalid request ID: ${resp.ri}`)
}
