import * as vs from 'vscode'
import vswin = vs.window

import * as z from './zentient'
import * as zcaddies from './z-caddies'
import * as zdiag from './z-diag'
import * as zipc from './ipc-protocol-msg-types'
import * as zproj from './z-workspace'
// import * as zvstrees from './vsc-treeviews'


const logJsonResps = false


export type To<T> = (_langId: string, _resp: zipc.Resp) => T
export type Responder = (resp: zipc.Resp) => void


export let handlers: { [_reqid: number]: Responder } = {}


export function errHandler(ipcId: zipc.IDs, orig: (_reason?: any) => void): (_reason?: any) => void {
    const supersilent = false
        || ipcId === zipc.IDs.SRCMOD_ACTIONS
        || ipcId === zipc.IDs.SRCINTEL_HIGHLIGHTS
        || ipcId === zipc.IDs.SRCINTEL_HOVER
        || ipcId === zipc.IDs.SRCMOD_FMT_RUNONFILE
    const silent = supersilent
        || ipcId === zipc.IDs.SRCINTEL_SYMS_PROJ
    return (reason?: any) => {
        if (orig)
            orig(reason)
        const shout = (silent || supersilent) && (reason + '').includes("] exec: \"")
        if (reason && ((!supersilent) || shout))
            z.logWarn(reason, shout || !silent)
    }
}

function handle<T>(langId: string, resp: zipc.Resp, onResp: To<T>, onResult: (_?: T | PromiseLike<T>) => void, onFailure: (_?: any) => void) {
    if (resp.err) {
        onFailure(`${resp.err} — [IPC: ${zipc.IDs[resp.ii].toLowerCase()}]`)
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
    return (resp: zipc.Resp) => handle<T>(langId, resp, onResp, onResult, onFailure)
}

export function onRespJsonLn(jsonresp: string) {
    let resp: zipc.Resp
    try { resp = JSON.parse(jsonresp) } catch (e) {
        return z.logWarn(`Non-JSON reply by language provider —— ${e}: '${jsonresp}'`)
    }
    if (logJsonResps && (resp.ii !== zipc.IDs.PROJ_POLLEVTS))
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
function onAnnounce(msg: zipc.Resp) {
    if (msg.caddy)
        zcaddies.on(msg.caddy)
    if (msg.srcDiags)
        zdiag.onDiags(msg.srcDiags)
    if (msg.ii)
        if (msg.ii === zipc.IDs.PROJ_POLLEVTS) {
            zproj.maybeSendFileEvents()
            z.onRoughlyEverySecondOrSo()
        } else if (msg.ii === zipc.IDs.SRCDIAG_STARTED)
            zcaddies.onDiagEvt(true, msg.val)
        else if (msg.ii === zipc.IDs.SRCDIAG_FINISHED)
            zcaddies.onDiagEvt(false, msg.val)
        else if (msg.ii === zipc.IDs.NOTIFY_ERR)
            vswin.showErrorMessage(msg.val)
        else if (msg.ii === zipc.IDs.NOTIFY_INFO)
            vswin.showInformationMessage(msg.val)
        else if (msg.ii === zipc.IDs.NOTIFY_WARN)
            vswin.showWarningMessage(msg.val)
        else if (msg.ii === zipc.IDs.TREEVIEW_CHANGED) {
            // const val = msg.val as string[]
            // zvstrees.onChange(val[0], val[1])
        }
}
