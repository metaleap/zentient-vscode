import * as vs from 'vscode'

import * as zipc_req from './ipc-msg-req'
import * as zipc_resp from './ipc-msg-resp'
import * as zvscmd from './vsc-commands'

import * as u from './util'


export type Menu = {
    d: string,
    c: Cmd[]
}

export type Cmd = {
    i: string,  // ID
    m: number,  // MsgIDs
    c: string,  // Category (prefix for t)
    t: string,  // Title
    d: string,  // Description
    h: string   // Hint
}


export function onActivate() {
    zvscmd.ensureEd('zen.meta.cmds.listall', reqCmdsListAll)
}

function cmdToItem(cmd: Cmd) {
    const item: vs.QuickPickItem = { label: `❬${cmd.c}❭ — ${cmd.t}`, description: cmd.h, detail: cmd.d }
    item['__z_msgid'] = cmd.m
    return item
}

function onCmdPicked(langId: string) {
    return (pick: vs.QuickPickItem) => {
        if (!pick) return
        const msgid = pick['__z_msgid'] as zipc_req.MsgIDs
        if (msgid)
            zipc_req.reqForLang(langId, msgid, null, respCmdsListAll)
    }
}

function reqCmdsListAll(te: vs.TextEditor, _ted: vs.TextEditorEdit, ..._args: any[]) {
    zipc_req.reqForEditor(te, zipc_req.MsgIDs.msgID_metaCmds_ListAll, null, respCmdsListAll)
}

function respCmdsListAll(langId: string, resp: zipc_resp.MsgResp) {
    if (resp.mcM && resp.mcM.c && resp.mcM.c.length) {
        const items: vs.QuickPickItem[] = []
        for (let i = 0; i < resp.mcM.c.length; i++)
            items.push(cmdToItem(resp.mcM.c[i]))
        vs.window.showQuickPick<vs.QuickPickItem>(items, { placeHolder: resp.mcM.d }).then(onCmdPicked(langId), u.onReject)
    } else
        vs.window.showInformationMessage(JSON.stringify(resp))
}
