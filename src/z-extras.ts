import * as vs from 'vscode'
import vswin = vs.window

import * as node_path from 'path'

import * as u from './util'

import * as zcfg from './vsc-settings'
import * as zsrc from './z-src'
import * as zipc_req from './ipc-req'
import * as zipc_resp from './ipc-resp'
import * as zvscmd from './vsc-commands'

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
                    if (input || argdefval) // one of them may be empty but never both
                        finalstep(input ? input : argdefval)
            }, u.onReject)
        }
    }
}

function onExtraResp(_langId: string, resp: zipc_resp.Msg) {
    const rx = resp.extras
    if (!rx) return

    if (rx.warns && rx.warns.length)
        rx.warns.forEach(vswin.showWarningMessage)

    if (rx.refs && rx.refs.length)
        console.log(rx.refs)

    if (rx.tips && rx.tips.length) {
        const couldlist = (rx.tips.length < 25)
            && rx.tips.every(t => (!t.language) && (t.value.length <= 99))

        if (couldlist) {
            let cansplitby = ''
            for (const possiblesplitter of [':'])
                if (rx.tips.every(tip => {
                    const idx = tip.value.indexOf(possiblesplitter)
                    return idx > 0 && idx == tip.value.lastIndexOf(possiblesplitter)
                })) {
                    cansplitby = possiblesplitter
                    break
                }
            const opt = { placeHolder: rx.desc, ignoreFocusOut: true }
            if (!cansplitby)
                vswin.showQuickPick(rx.tips.map<string>(tip => tip.value), opt)
            else
                vswin.showQuickPick(rx.tips.map<vs.QuickPickItem>(tip => {
                    const spl = tip.value.split(cansplitby)
                    return { label: spl[0], description: spl[1] }
                }), opt)
        } else
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
