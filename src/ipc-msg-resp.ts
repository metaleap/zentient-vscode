import * as vs from 'vscode'

import * as z from './zentient'
import * as zcorecmds from './z-core-cmds'
import * as zipc_req from './ipc-msg-req'
import * as zsrc from './src-util'


const logJsonResps = false


export type Handler<T> = (_langId: string, _respMsg: MsgResp) => T
export type ResponseClosure = (resp: MsgResp) => void

export type MsgResp = {
    ri: number  // ReqID
    e: string   // ErrMsg
    et: boolean // ErrMsgFromTool

    mi: zipc_req.MsgIDs     // MsgID
    menu: zcorecmds.Menu    // CoreCmdsMenu
    url: string             // WebsiteURL
    info: string            // NoteInfo
    warn: string            // NoteWarn
    action: string          // MsgAction
    srcMod: zsrc.Lens       // SrcMod
}


export let handlers: { [_reqid: number]: ResponseClosure } = {}


function showErrNotifyFor(r: MsgResp) {
    if (r.mi === zipc_req.MsgIDs.srcFmt_RunOnFile || r.mi === zipc_req.MsgIDs.srcFmt_RunOnSel) {
        return !r.et
    }
    return true
}

function handle<T>(langId: string, respMsg: MsgResp, onResp: Handler<T>, onResult: (_?: T | PromiseLike<T>) => void, onFailure: (_?: any) => void) {
    if (respMsg.e) {
        if (showErrNotifyFor(respMsg))
            onFailure(respMsg.e)
        return
    }

    let result: T
    try { result = onResp(langId, respMsg) } catch (e) {
        onFailure(e)
        return
    }
    onResult(result)
}

export function handles<T>(langId: string, onResp: Handler<T>, onResult: (_?: T | PromiseLike<T>) => void, onFailure: (_?: any) => void) {
    return (respMsg: MsgResp) => handle<T>(langId, respMsg, onResp, onResult, onFailure)
}

export function onRespJsonLn(jsonresp: string) {
    if (logJsonResps) z.log(jsonresp)
    let resp: MsgResp
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

export function throwIf(cancel: vs.CancellationToken) {
    if (cancel && cancel.isCancellationRequested) throw cancel
}
