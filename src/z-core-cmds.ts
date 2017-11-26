import * as vs from 'vscode'
import vswin = vs.window

import * as zipc_req from './ipc-msg-req'
import * as zipc_resp from './ipc-msg-resp'
import * as zvscmd from './vsc-commands'

import * as u from './util'


export type Menu = {
    d: string   // Desc
    tl: boolean // TopLevel
    c: Cmd[]    // Choices
}

type Choice = {
    description: string
    detail: string
    label: string
    cmd: Cmd
}

type Cmd = {
    m: number   // MsgIDs
    a: any      // MsgArgs
    c: string   // Category
    t: string   // Title
    d: string   // Description
    h: string   // Hint
}


export function onActivate() {
    zvscmd.ensureEd('zen.core.cmds.listall', reqCmdsListAll)
}

function cmdToItem(cmd: Cmd) {
    const item: Choice = {
        description: cmd.h, detail: cmd.d, cmd: cmd,
        label: cmd.c ? `❬${cmd.c}❭ — ${cmd.t}` : `${cmd.t}`
    }
    return item
}

function onCmdPicked(langId: string) {
    return (pick: Choice) => {
        if (pick && pick.cmd)
            zipc_req.reqForLang(langId, pick.cmd.m, pick.cmd.a, onCmdResp)
    }
}

function onCmdResp(langId: string, resp: zipc_resp.MsgResp) {
    if (resp.note)
        vswin.showInformationMessage(resp.note)

    if (resp.menu && resp.menu.c && resp.menu.c.length) {
        const items: Choice[] = []
        for (let i = 0; i < resp.menu.c.length; i++)
            items.push(cmdToItem(resp.menu.c[i]))
        vswin.showQuickPick<Choice>(items, { placeHolder: resp.menu.d }).then(onCmdPicked(langId), u.onReject)
    } else if (resp.url) {
        if (!u.osNormie())
            vswin.showInformationMessage(`Navigated to: ${resp.url}`)
        vs.commands.executeCommand('vscode.open', vs.Uri.parse(resp.url), vs.ViewColumn.Two)
    } else
        vswin.showWarningMessage(JSON.stringify(resp))
}

function reqCmdsListAll(te: vs.TextEditor, _ted: vs.TextEditorEdit, ..._args: any[]) {
    zipc_req.reqForEditor(te, zipc_req.MsgIDs.coreCmds_ListAll, null, onCmdResp)
}
