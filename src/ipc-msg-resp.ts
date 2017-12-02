import * as z from './zentient'
import * as zcorecmds from './z-core-cmds'
import * as zipc_req from './ipc-msg-req'
import * as zsrc from './src-util'


const logJsonResps = true


export type To<T> = (_langId: string, _respMsg: MsgResp) => T
export type Responder = (resp: MsgResp) => void

export type MsgResp = {
    ri: number  // ReqID
    e: string   // ErrMsg
    et: boolean // ErrMsgFromTool

    mi: zipc_req.MsgIDs     // MsgID
    coreCmd: zcorecmds.Resp // CoreCmd
    srcIntel: zsrc.Intel    // SrcIntel
    srcMod: zsrc.Lens       // SrcMod
}


export let handlers: { [_reqid: number]: Responder } = {}


function handle<T>(langId: string, respMsg: MsgResp, onResp: To<T>, onResult: (_?: T | PromiseLike<T>) => void, onFailure: (_?: any) => void) {
    if (respMsg.e) {
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

export function handles<T>(langId: string, onResp: To<T>, onResult: (_?: T | PromiseLike<T>) => void, onFailure: (_?: any) => void) {
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

// export function throwIf(cancel: vs.CancellationToken) {
//     if (cancel && cancel.isCancellationRequested) throw cancel
// }
