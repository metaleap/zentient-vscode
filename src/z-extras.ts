import * as vs from 'vscode'
import vswin = vs.window

import * as zcfg from './vsc-settings'
import * as zipc_req from './ipc-msg-req'
import * as zipc_resp from './ipc-msg-resp'
import * as zvscmd from './vsc-commands'

export type Resp = {
    Items: Item[]
}

type Item = {
    id: string
    label: string
    description: string
    detail?: string
}

export function onActivate() {
    zvscmd.ensureEd('zen.extras.intel', onListExtras(zipc_req.MsgIDs.extras_Intel_List, "CodeIntel Extras", ""))
    zvscmd.ensureEd('zen.extras.query', onListExtras(zipc_req.MsgIDs.extras_Query_List, "CodeQuery Extras", ""))
}

function onListExtras(msgId: zipc_req.MsgIDs, menuTitle: string, menuDesc: string) {
    const langids = zcfg.langs()

    return (te: vs.TextEditor) => {
        if (!(te && te.document && te.document.languageId && langids.includes(te.document.languageId)))
            return vswin.showWarningMessage(menuTitle + " are available only for: **" + langids.join("**, **") + "** source files")

        const onresp = (_langid: string, resp: zipc_resp.Msg): Item[] => {
            if (resp && resp.extras && resp.extras.Items && resp.extras.Items.length)
                return resp.extras.Items
            return []
        }

        return vswin.showQuickPick<Item>(
            zipc_req.forEd<Item[]>(te, msgId, undefined, onresp),
            { ignoreFocusOut: true, placeHolder: menuTitle + menuDesc + " for `" + te.document.languageId + "`" }
        )
    }
}
