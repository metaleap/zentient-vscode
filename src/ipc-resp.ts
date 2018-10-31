import * as vs from 'vscode'
import vswin = vs.window

import * as z from './zentient'
import * as zcaddies from './z-caddies'
import * as zdiag from './z-diag'
import * as zextras from './z-extras'
import * as zipc_req from './ipc-req'
import * as zmenu from './z-menu'
import * as zproj from './z-workspace'
// import * as zvstrees from './vsc-treeviews'
import * as zsrc from './z-src'


const logJsonResps = false


export type To<T> = (_langId: string, _resp: Msg) => T
export type Responder = (resp: Msg) => void

export interface Msg {
    ii: zipc_req.IpcIDs         // IpcID
    ri: number                  // ReqID
    err: string                 // ErrMsg

    sI: zsrc.IntelResp          // SrcIntel
    srcDiags: zdiag.Resp        // SrcDiags
    srcMods: zsrc.Lens[]        // SrcMod
    srcActions: vs.Command[]    // SrcActions
    extras: zextras.Resp        // Extras
    menu: zmenu.Resp            // Menu
    caddy: zcaddies.Caddy       // CaddyUpdate
    val: any                    // Val
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
        const shout = (silent || supersilent) && (reason + '').includes("] exec: \"")//[zentient-go] exec: \"foo\": executable file not found in
        if (reason && ((!supersilent) || shout))
            z.logWarn(reason, shout || !silent)
    }
}

function handle<T>(langId: string, resp: Msg, onResp: To<T>, onResult: (_?: T | PromiseLike<T>) => void, onFailure: (_?: any) => void) {
    if (resp.err) {
        onFailure(`${resp.err} — [IPC: ${zipc_req.IpcIDs[resp.ii].toLowerCase()}]`)
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

    if (resp.val !== undefined && !resp.ii) // explicit `undefined` check, because even if `null`, should still display
        z.openJsonDocumentEditorFor(resp.val)

    const onresp = resp.ri ? handlers[resp.ri] : null
    if (onresp) {
        delete handlers[resp.ri]
        onresp(resp)
    } else if (!resp.ri)
        onAnnounce(resp)
}

// message sent from backend that's not a direct response to any particular earlier request
function onAnnounce(msg: Msg) {
    if (msg.caddy)
        zcaddies.on(msg.caddy)
    if (msg.srcDiags)
        zdiag.onDiags(msg.srcDiags)
    if (msg.ii)
        if (msg.ii === zipc_req.IpcIDs.PROJ_POLLEVTS) {
            zproj.maybeSendFileEvents()
            z.onRoughlyEverySecondOrSo()
        } else if (msg.ii === zipc_req.IpcIDs.SRCDIAG_STARTED)
            zcaddies.onDiagEvt(true, msg.val)
        else if (msg.ii === zipc_req.IpcIDs.SRCDIAG_FINISHED)
            zcaddies.onDiagEvt(false, msg.val)
        else if (msg.ii === zipc_req.IpcIDs.NOTIFY_ERR)
            vswin.showErrorMessage(msg.val)
        else if (msg.ii === zipc_req.IpcIDs.NOTIFY_INFO)
            vswin.showInformationMessage(msg.val)
        else if (msg.ii === zipc_req.IpcIDs.NOTIFY_WARN)
            vswin.showWarningMessage(msg.val)
        else if (msg.ii === zipc_req.IpcIDs.TREEVIEW_CHANGED) {
            // const val = msg.val as string[]
            // zvstrees.onChange(val[0], val[1])
        }
}
