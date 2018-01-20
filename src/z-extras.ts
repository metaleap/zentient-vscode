import * as vs from 'vscode'
import vscmd = vs.commands
import vsproj = vs.workspace
import vswin = vs.window

import * as node_path from 'path'

import * as u from './util'

import * as z from './zentient'
import * as zcfg from './vsc-settings'
import * as zipc_pipeio from './ipc-pipe-io'
import * as zipc_req from './ipc-req'
import * as zipc_resp from './ipc-resp'
import * as zvslang from './vsc-langs'
import * as zproj from './z-workspace'
import * as zsrc from './z-src'
import * as zvscmd from './vsc-commands'
import * as zvspage from './vsc-pageview'


let lastRespIntel: Resp = null,
    lastRespQuery: Resp = null


interface Item extends vs.QuickPickItem {
    id?: string
    arg?: string
    fPos?: string
}

export interface Resp extends zsrc.Intel {
    Items: Item[]
    Warns: string[]
    Desc: string
    Url: string
}



export function onActivate() {
    zvscmd.ensureEd('zen.extras.intel', onListExtras(zipc_req.IpcIDs.EXTRAS_INTEL_LIST, zipc_req.IpcIDs.EXTRAS_INTEL_RUN, "CodeIntel", ""))
    zvscmd.ensureEd('zen.extras.query', onListExtras(zipc_req.IpcIDs.EXTRAS_QUERY_LIST, zipc_req.IpcIDs.EXTRAS_QUERY_RUN, "CodeQuery", ""))
    zvscmd.ensure('zen.extras.intel.alt', onLastExtraResp('zen.extras.intel', false))
    zvscmd.ensure('zen.extras.query.alt', onLastExtraResp('zen.extras.query', true))
}

function onExtraPicked(te: vs.TextEditor, td: vs.TextDocument, runIpcId: zipc_req.IpcIDs, range: vs.Range) {
    return (item: Item) => {
        if (!item) return
        const finalstep = (input = '') =>
            vswin.withProgress<void>({ location: vs.ProgressLocation.Window, title: "Waiting for `" + item.label + "`…" },
                (_progress) => zipc_req.forFile<void>(td, runIpcId, [item.id, input], onExtraResp, te, range)
            )

        if (!item.arg)
            finalstep()
        else {
            const argdefval = (!range) ? '' : td.getText(range)
            vswin.showInputBox({ ignoreFocusOut: true, placeHolder: argdefval, prompt: item.arg }).then(input => {
                if (input !== undefined) // cancelled?
                    if ((input = input.trim()) || argdefval) // one of them may be empty but never both
                        finalstep(input ? input : argdefval)
            }, u.onReject)
        }
    }
}

function onLastExtraResp(unAltCmdId: string, isQuery: boolean) {
    return () => {
        const lastresp = isQuery ? lastRespQuery : lastRespIntel
        if (lastresp)
            onExtraResp(undefined, undefined, lastresp)
        else
            vscmd.executeCommand(unAltCmdId)
    }
}

function onExtraResp(_langId?: string, resp?: zipc_resp.Msg, last?: Resp) {
    if (resp && resp.i && resp.extras)
        if (resp.i == zipc_req.IpcIDs.EXTRAS_QUERY_RUN)
            lastRespQuery = resp.extras
        else if (resp.i == zipc_req.IpcIDs.EXTRAS_INTEL_RUN)
            lastRespIntel = resp.extras
    const rx = resp ? resp.extras : last
    const menuopt: vs.QuickPickOptions = { matchOnDescription: true, matchOnDetail: true, placeHolder: rx.Desc, ignoreFocusOut: false }

    if (rx.Url)
        zvspage.openUriInViewer(rx.Url, rx.Desc)

    if (rx.Warns && rx.Warns.length)
        // the weirdest vsc quirk right now in current-version...
        if (rx.Warns.length >= 3)
            for (let i = 0; i < rx.Warns.length; i++)
                vswin.showWarningMessage(rx.Warns[i])
        else
            for (let i = rx.Warns.length - 1; i >= 0; i--)
                vswin.showWarningMessage(rx.Warns[i])

    if (rx.Refs && rx.Refs.length)
        zvslang.peekDefRefLocs(rx.Refs.map<vs.Location>(zsrc.locRef2VsLoc), rx.Desc.includes("implementations"))

    if (rx.Items)
        vswin.showQuickPick(rx.Items, menuopt).then(item => {
            if (item && item.fPos) zsrc.openSrcFileAtPos(item.fPos)
        }, u.onReject)

    if (rx.Info && rx.Info.length) {
        const couldlist = (rx.Info.length < 25)
            && rx.Info.every(t => (!t.language) && (t.value.length <= 123))
        const anylns = rx.Info.some(t => t.value.includes('\n'))

        const show = () => {
            if (anylns)
                rx.Info.forEach(tip => {
                    vsproj.openTextDocument({
                        content: tip.value,
                        language: tip.language ? tip.language : 'markdown'
                    }).then(td => vswin.showTextDocument(td, vs.ViewColumn.Two, false),
                        u.onReject)
                })
            else
                vsproj.openTextDocument({
                    content: (rx.Info.map<string>(t => t.value)).join('\n'),
                    language: 'markdown'
                }).then(td => vswin.showTextDocument(td, vs.ViewColumn.Two, false),
                    u.onReject)
        }

        if (couldlist)
            vswin.showQuickPick(rx.Info.map<string>(tip => tip.value), menuopt).then(item => { if (item) show() }, u.onReject)
        else
            show()
    }
}

function onListExtras(listIpcId: zipc_req.IpcIDs, runIpcId: zipc_req.IpcIDs, menuTitle: string, menuDesc: string) {
    return (te: vs.TextEditor) => {
        if (!te) te = vswin.activeTextEditor
        let td: vs.TextDocument = te ? te.document : null
        if (!(td && zproj.uriOk(td) && zcfg.languageIdOk(td))) {
            if (zipc_pipeio.last && zipc_pipeio.last.filePath) {
                td = z.findTextFile(zipc_pipeio.last.filePath)
                te = vswin.visibleTextEditors.find(ted => ted.document === td || ted.document.fileName === zipc_pipeio.last.filePath)
            } else {
                te = null
                td = null
            }
        }
        if ((!td) || (listIpcId === zipc_req.IpcIDs.EXTRAS_INTEL_LIST && !te))
            return vswin.showWarningMessage(menuTitle + " — only available for active (or previously-active & visible) **" + zcfg.langs().join("/") + "** editors.")
        let range: vs.Range
        if (te) range = (!te.selection.isEmpty) ? te.selection : td.getWordRangeAtPosition(te.selection.active)

        const onresp = (_langid: string, resp: zipc_resp.Msg): Item[] =>
            (resp && resp.extras && resp.extras.Items) ? resp.extras.Items : []

        return vswin.showQuickPick<Item>(
            zipc_req.forFile<Item[]>(td, listIpcId, undefined, onresp, te, range),
            { ignoreFocusOut: false, placeHolder: menuTitle + menuDesc + " for " + node_path.basename(td.fileName) }
        ).then(onExtraPicked(te, td, runIpcId, range), u.onReject)
    }
}
