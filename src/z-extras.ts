import * as vs from 'vscode'
import vswin = vs.window

import * as node_path from 'path'

import * as u from './util'

import * as zcfg from './vsc-settings'
import * as zsrc from './z-src'
import * as zipc_req from './ipc-req'
import * as zipc_resp from './ipc-resp'
import * as zvscmd from './vsc-commands'


let lastResp: Resp = null


interface Item extends vs.QuickPickItem {
    id: string
    arg?: string
}

export interface Resp extends zsrc.Intel {
    items: Item[]
    warns: string[]
    desc: string
}



export function onActivate() {
    zvscmd.ensureEd('zen.extras.intel', onListExtras(zipc_req.IpcIDs.EXTRAS_INTEL_LIST, zipc_req.IpcIDs.EXTRAS_INTEL_RUN, "CodeIntel", ""))
    zvscmd.ensureEd('zen.extras.query', onListExtras(zipc_req.IpcIDs.EXTRAS_QUERY_LIST, zipc_req.IpcIDs.EXTRAS_QUERY_RUN, "CodeQuery", ""))
    zvscmd.ensure('zen.extras.query.alt', onExtraResp)
}

function onExtraPicked(te: vs.TextEditor, runIpcId: zipc_req.IpcIDs) {
    return (item: Item) => {
        if (!item) return
        const finalstep = (input = '') =>
            vswin.withProgress<void>({ location: vs.ProgressLocation.Window, title: "Waiting for response to `" + item.label + "` request..." },
                (_progress) => zipc_req.forEd<void>(te, runIpcId, [item.id, input], onExtraResp)
            )

        if (!item.arg)
            finalstep()
        else {
            const range = (!te.selection.isEmpty) ? te.selection : te.document.getWordRangeAtPosition(te.selection.active)
            const argdefval = (!range) ? '' : te.document.getText(range)
            vswin.showInputBox({ ignoreFocusOut: true, placeHolder: argdefval, prompt: item.arg }).then(input => {
                if (input !== undefined) // cancelled?
                    if ((input = input.trim()) || argdefval) // one of them may be empty but never both
                        finalstep(input ? input : argdefval)
            }, u.onReject)
        }
    }
}

function onExtraResp(_langId?: string, resp?: zipc_resp.Msg) {
    if (resp) lastResp = resp.extras
    const rx = resp ? resp.extras : lastResp
    if (!rx) {
        vs.commands.executeCommand('zen.extras.query')
        return
    }
    const menuopt = { placeHolder: rx.desc, ignoreFocusOut: true }

    if (rx.warns && rx.warns.length)
        // the weirdest vsc quirk right now in current-version...
        if (rx.warns.length >= 3)
            for (let i = 0; i < rx.warns.length; i++)
                vswin.showWarningMessage(rx.warns[i])
        else
            for (let i = rx.warns.length - 1; i >= 0; i--)
                vswin.showWarningMessage(rx.warns[i])

    if (rx.refs && rx.refs.length)
        console.log(rx.refs)

    if (rx.items && rx.items.length)
        vswin.showQuickPick(rx.items, menuopt)

    if (rx.tips && rx.tips.length) {
        const couldlist = (rx.tips.length < 25)
            && rx.tips.every(t => (!t.language) && (t.value.length <= 99))

        if (couldlist)
            vswin.showQuickPick(rx.tips.map<string>(tip => tip.value), menuopt)
        else
            rx.tips.forEach(tip => {
                vs.workspace.openTextDocument({
                    content: tip.value,
                    language: tip.language ? tip.language : 'markdown'
                }).then(td => vswin.showTextDocument(td, vs.ViewColumn.Three, false),
                    u.onReject)
            })
    }
}

function onListExtras(listIpcId: zipc_req.IpcIDs, runIpcId: zipc_req.IpcIDs, menuTitle: string, menuDesc: string) {
    const langids = zcfg.langs()

    return (te: vs.TextEditor) => {
        if (!(te && te.document && te.document.languageId && langids.includes(te.document.languageId)))
            return vswin.showWarningMessage(menuTitle + " are available only for: **" + langids.join("**, **") + "** source files")

        const onresp = (_langid: string, resp: zipc_resp.Msg): Item[] => {
            return (resp && resp.extras && resp.extras.items) ? resp.extras.items : []
        }

        return vswin.showQuickPick<Item>(
            zipc_req.forEd<Item[]>(te, listIpcId, undefined, onresp),
            { ignoreFocusOut: false, placeHolder: menuTitle + menuDesc + " for `" + node_path.basename(te.document.fileName) + "`" }
        ).then(onExtraPicked(te, runIpcId), u.onReject)
    }
}
