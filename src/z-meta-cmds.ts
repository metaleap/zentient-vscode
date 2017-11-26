import * as vs from 'vscode'

import * as zipc_req from './ipc-msg-req'
import * as zipc_resp from './ipc-msg-resp'
import * as zvscmd from './vsc-commands'


export type Menu = {
    d: string,
    c: Cmd[]
}

export type Cmd = {
    i: string,  // ID
    m: number,  // MsgIDs
    c: string,  // Category (prefix for t)
    t: string,  // Title
    d1: string, // Description
    d2: string  // Detail
}


export function onActivate() {
    zvscmd.ensureEd('zen.meta.cmds.listall', reqCmdsListAll)
}

function cmdToItem(cmd: Cmd) {
    const item: vs.QuickPickItem = { label: `${cmd.c}: ${cmd.t}`, description: cmd.d1, detail: cmd.d2 }
    return item
}

function reqCmdsListAll(te: vs.TextEditor, _ted: vs.TextEditorEdit, ..._args: any[]) {
    if (!te) return
    const td = te.document
    if (!(td && td.languageId)) return

    zipc_req.req(td.languageId, zipc_req.MsgIDs.REQ_META_CMDS_LISTALL, null, respCmdsListAll)
}

function respCmdsListAll(resp: zipc_resp.MsgResp) {
    if (resp.mcM && resp.mcM.c && resp.mcM.c.length) {
        const items: vs.QuickPickItem[] = []
        for (let i = 0; i < resp.mcM.c.length; i++)
            items.push(cmdToItem(resp.mcM.c[i]))
        vs.window.showQuickPick<vs.QuickPickItem>(items, { placeHolder: resp.mcM.d })
    } else
        vs.window.showInformationMessage(JSON.stringify(resp))
}
