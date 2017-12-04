import * as z from './zentient'
import * as zcorecmds from './z-core-cmds'
import * as zipc_req from './ipc-msg-req'
import * as zsrc from './src-util'


const logJsonResps = true


export type To<T> = (_langId: string, _resp: Msg) => T
export type Responder = (resp: Msg) => void

export type Msg = {
    ri: number  // ReqID
    e: string   // ErrMsg
    et: boolean // ErrMsgFromTool

    mi: zipc_req.MsgIDs     // MsgID
    coreCmd: zcorecmds.Resp // CoreCmd
    srcIntel: zsrc.Intel    // SrcIntel
    srcMods: zsrc.Lens[]    // SrcMod
}


export let handlers: { [_reqid: number]: Responder } = {}


export function errHandler(orig: (_reason?: any) => void): (_reason?: any) => void {
    if (!orig) return z.logWarn
    return (reason?: any) => {
        if (reason) {
            // const cancelled1 = reason['isCancellationRequested'], cancelled2 = reason['onCancellationRequested']
            // if (cancelled1 || cancelled2) return
            z.logWarn(reason)
        }
        orig(reason)
    }
}

function handle<T>(langId: string, resp: Msg, onResp: To<T>, onResult: (_?: T | PromiseLike<T>) => void, onFailure: (_?: any) => void) {
    if (resp.e) {
        onFailure((resp.mi !== zipc_req.MsgIDs.srcIntel_SymsProj) ? resp.e : undefined)
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
