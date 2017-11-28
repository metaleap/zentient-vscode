import * as vs from 'vscode'
import vswin = vs.window

import * as z from './zentient'
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
    mi: zipc_req.MsgIDs
    ma: any      // MsgArgs
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
        if (pick && pick.cmd) {
            const msgargs = pick.cmd.ma
            const laststep = () => zipc_req.reqForLang(langId, pick.cmd.mi, msgargs, onCmdResp)

            const argnames2prompt4: string[] = []
            if (msgargs)
                for (const argname in msgargs) {
                    const argval = msgargs[argname]
                    if (argval && argval['prompt']) {
                        argnames2prompt4.push(argname)
                    }
                }

            if (argnames2prompt4.length > 1) {
                vswin.showErrorMessage("Time for proper chaining, man!")
            } else if (argnames2prompt4.length < 1) {
                laststep()
            } else {
                const argname = argnames2prompt4[0]
                vswin.showInputBox(msgargs[argname]).then((input: string) => {
                    if (input !== undefined) { // else it was cancelled
                        msgargs[argname] = input
                        laststep()
                    }
                })
            }
        }
    }
}

function onCmdResp(langId: string, resp: zipc_resp.MsgResp) {
    if (resp.note)
        try { vswin.showInformationMessage(resp.note) } catch (e) { z.log(e) }

    if (resp.menu && resp.menu.c && resp.menu.c.length) {
        const quickpickitems = resp.menu.c.map<Choice>(cmdToItem)
        vswin.showQuickPick<Choice>(quickpickitems, { placeHolder: resp.menu.d }).then(onCmdPicked(langId), u.onReject)
    } else if (resp.url) {
        if (!u.osNormie())
            z.log(`➜ Navigated to: ${resp.url}`)
        vs.commands.executeCommand('vscode.open', vs.Uri.parse(resp.url), vs.ViewColumn.Two)
    } else if (!resp.note)
        z.log("❗ " + JSON.stringify(resp))
}

function reqCmdsListAll(te: vs.TextEditor, _ted: vs.TextEditorEdit, ..._args: any[]) {
    zipc_req.reqForEditor(te, zipc_req.MsgIDs.coreCmds_ListAll, null, onCmdResp)
}
