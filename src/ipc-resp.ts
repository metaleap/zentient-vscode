import * as vs from 'vscode'
import vsproj = vs.workspace
import vswin = vs.window

import * as u from './util'

import * as z from './zentient'
import * as zcaddies from './z-caddies'
import * as zextras from './z-extras'
import * as zipc_req from './ipc-req'
import * as zmenu from './z-menu'
import * as zproj from './z-workspace'
import * as zsrc from './z-src'


const logJsonResps = true


export type To<T> = (_langId: string, _resp: Msg) => T
export type Responder = (resp: Msg) => void

export interface Msg {
    ri: number  // ReqID
    e: string   // ErrMsg

    ii: zipc_req.IpcIDs         // IpcID
    menu: zmenu.Resp            // Menu
    extras: zextras.Resp        // Extras
    srcIntel: zsrc.IntelResp    // SrcIntel
    srcMods: zsrc.Lens[]        // SrcMod
    srcActions: vs.Command[]    // SrcActions
    caddy: zcaddies.Caddy       // CaddyUpdate
    obj: any                    // ObjSnapshot
}


export let handlers: { [_reqid: number]: Responder } = {}


export function errHandler(ipcId: zipc_req.IpcIDs, orig: (_reason?: any) => void): (_reason?: any) => void {
    const supersilent = false
        || ipcId === zipc_req.IpcIDs.SRCMOD_ACTIONS
        || ipcId === zipc_req.IpcIDs.SRCINTEL_HIGHLIGHTS
        || ipcId === zipc_req.IpcIDs.SRCINTEL_HOVER
        || ipcId === zipc_req.IpcIDs.SRCMOD_FMT_RUNONFILE
    const silent = supersilent
        || ipcId === zipc_req.IpcIDs.SRCINTEL_SYMS_PROJ
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
    let resp: Msg
    try { resp = JSON.parse(jsonresp) } catch (e) {
        return z.logWarn(`Non-JSON reply by language provider —— ${e}: '${jsonresp}'`)
    }
    if (logJsonResps && (resp.ii !== zipc_req.IpcIDs.PROJ_POLLEVTS))
        z.log(jsonresp)

    if (resp.obj !== undefined) // explicit check, because even if `null`, should still display
        vsproj.openTextDocument({
            language: 'json', content: JSON.stringify(resp.obj, undefined, "\t")
        }).then(vswin.showTextDocument, u.onReject)

    const onresp = resp.ri ? handlers[resp.ri] : null
    if (onresp) {
        delete handlers[resp.ri]
        onresp(resp)
    } else if (resp.ri === 0)
        onAnnounce(resp)
}

// message sent from backend that's not a direct response to any particular earlier request
function onAnnounce(msg: Msg) {
    if (msg.ii == zipc_req.IpcIDs.PROJ_POLLEVTS)
        zproj.maybeSendFileEvents()
    else if (msg.caddy)
        zcaddies.on(msg.caddy)
}
