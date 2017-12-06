import * as vs from 'vscode'
import vswin = vs.window

import * as zcfg from './vsc-settings'
import * as zcorecmds from './z-core-cmds'
import * as zipc_req from './ipc-msg-req'
import * as zipc_resp from './ipc-msg-resp'
import * as zvscmd from './vsc-commands'

export type Item = {
    id: string
    label: string
    description: string
    detail?: string
}

export function onActivate() {
    zvscmd.ensureEd('zen.extras.intel', onListExtras(zipc_req.MsgIDs.extras_Intel_List, "CodeIntel Extras", ""))
    zvscmd.ensureEd('zen.extras.query', onListExtras(zipc_req.MsgIDs.extras_Query_List, "CodeQuery Extras", ""))
}

function onExtraPicked(te: vs.TextEditor) {
    return (item: Item) => {
        vswin.withProgress<void>({ location: vs.ProgressLocation.Window, title: "Waiting for response to `" + item.label + "` request..." },
            (_progress) => zipc_req.forEd<void>(te, zipc_req.MsgIDs.extras_Invoke, item.id, zcorecmds.onCmdResp)
        )
    }
}

function onListExtras(msgId: zipc_req.MsgIDs, menuTitle: string, menuDesc: string) {
    const langids = zcfg.langs()

    return (te: vs.TextEditor) => {
        if (!(te && te.document && te.document.languageId && langids.includes(te.document.languageId)))
            return vswin.showWarningMessage(menuTitle + " are available only for: **" + langids.join("**, **") + "** source files")

        const onresp = (_langid: string, resp: zipc_resp.Msg): Item[] => {
            return (resp && resp.extras) ? resp.extras : []
        }

        return vswin.showQuickPick<Item>(
            zipc_req.forEd<Item[]>(te, msgId, undefined, onresp),
            { ignoreFocusOut: true, placeHolder: menuTitle + menuDesc + " for `" + te.document.languageId + "`" }
        ).then(onExtraPicked(te))
    }
}
