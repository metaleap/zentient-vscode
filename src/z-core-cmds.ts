import * as vs from 'vscode'
import vswin = vs.window

import * as z from './zentient'
import * as zipc_req from './ipc-msg-req'
import * as zipc_resp from './ipc-msg-resp'
import * as zsrc from './src-util'
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
    ma: any     // MsgArgs
    c: string   // Category
    t: string   // Title
    d: string   // Description
    h: string   // Hint
}


export function onActivate() {
    zvscmd.ensureEd('zen.core.cmds.listall', reqCmdsPalette)
}

function cmdToItem(cmd: Cmd) {
    const item: Choice = {
        description: cmd.h, detail: cmd.d, cmd: cmd,
        label: cmd.c ? `❬${cmd.c}❭ — ${cmd.t}` : `${cmd.t}`
    }
    return item
}

function onCmdPicked(_langId: string) {
    return (pick: Choice) => {
        if (pick && pick.cmd) {
            const msgargs = pick.cmd.ma
            const laststep = () => { } // zipc_req.reqForLang(langId, pick.cmd.mi, msgargs, onCmdResp)

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

export function onCmdResp(langId: string, resp: zipc_resp.MsgResp) {
    //  an info/warning notice might or might not accompany any response *in addition* to its other data (if any)
    if (resp.info || resp.warn) {
        const note = resp.warn ? resp.warn : resp.info
        const show = resp.warn ? vswin.showWarningMessage : vswin.showInformationMessage
        if (!(resp.mi && resp.action))
            show(note)
        else {
            show(note, resp.action).then((btnchoice) => {
                if (btnchoice) { }
                // zipc_req.reqForLang(langId, resp.mi, undefined, onCmdResp)
            })
        }
    }

    if (resp.menu && resp.menu.c && resp.menu.c.length) { //  did we get a menu?
        const quickpickitems = resp.menu.c.map<Choice>(cmdToItem)
        vswin.showQuickPick<Choice>(quickpickitems, { placeHolder: resp.menu.d }).then(onCmdPicked(langId), u.onReject)

    } else if (resp.url) { // did we get a url to navigate to?
        if (!u.osNormie())
            z.log(`➜ Navigated to: ${resp.url}`)
        vs.commands.executeCommand('vscode.open', vs.Uri.parse(resp.url), vs.ViewColumn.Two)

    } else if (resp.mi && !resp.action) { // a new command to send right back, without requiring prior user action?
        // zipc_req.reqForLang(langId, resp.mi, undefined, onCmdResp)

    } else if (resp.srcMod && resp.srcMod.fp) { // source file modifications?
        zsrc.applyMod(vs.workspace.textDocuments.find((td) => td.fileName === resp.srcMod.fp), resp.srcMod)
    }

    if (!(resp.info || resp.warn || resp.menu || resp.url || resp.mi || resp.srcMod))
        z.logWarn(JSON.stringify(resp))
}

function reqCmdsPalette(_te: vs.TextEditor, _ted: vs.TextEditorEdit, ..._args: any[]) {
    // zipc_req.reqForEditor(te, zipc_req.MsgIDs.coreCmds_Palette, undefined, onCmdResp)
}
