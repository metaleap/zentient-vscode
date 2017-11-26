import * as vs from 'vscode'

import * as zipc_req from './ipc-msg-req'
import * as zipc_resp from './ipc-msg-resp'
import * as zvscmd from './vsc-commands'

export function onActivate() {
    zvscmd.ensureEd('zen.meta.cmds.listall', reqCmdsListAll)
}

function reqCmdsListAll(te: vs.TextEditor, _ted: vs.TextEditorEdit, ..._args: any[]) {
    if (!te) return
    const td = te.document
    if (!(td && td.languageId)) return

    zipc_req.req(td.languageId, zipc_req.MsgIDs.REQ_META_CMDS_LISTALL, null, respCmdsListAll)
}

function respCmdsListAll(resp: zipc_resp.MsgResp) {
    if (resp.m && resp.m.c && resp.m.c.length) {
        const items: vs.QuickPickItem[] = []
        for (let i = 0; i < resp.m.c.length; i++)
            items.push(zipc_resp.pickToItem(resp.m.c[i]))
        vs.window.showQuickPick<vs.QuickPickItem>(items, { placeHolder: resp.m.d })
    } else
        vs.window.showInformationMessage(JSON.stringify(resp))
}
