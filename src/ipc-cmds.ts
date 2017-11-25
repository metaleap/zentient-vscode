import * as vs from 'vscode'

import * as zipc from './ipc'
import * as zvscmd from './vsc-commands'

export function onActivate() {
    zvscmd.ensureEd('zen.cmds.listall', onCmdsListAll)
}

function onCmdsListAll(te: vs.TextEditor, _ted: vs.TextEditorEdit, ..._args: any[]) {
    if (!te) return
    const td = te.document
    if (!(td && td.languageId)) return

    zipc.req(td.languageId, zipc.MsgIDs.REQ_CMDS_LIST, {}, (_resp: zipc.MsgResp) => {
        vs.window.showInformationMessage(JSON.stringify(_resp))
    })
}
