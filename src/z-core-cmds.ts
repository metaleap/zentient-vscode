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

export type Resp = {
    menu: Menu      // CoreCmdsMenu
    url: string     // WebsiteURL
    info: string    // NoteInfo
    warn: string    // NoteWarn
    action: string  // MsgAction
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

function onCmdPicked(langId: string) {
    return (pick: Choice) => {
        if (pick && pick.cmd) {
            const msgargs = pick.cmd.ma
            const laststep = () => zipc_req.forLang<void>(langId, pick.cmd.mi, msgargs, onCmdResp)

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
    const rcmd = resp.coreCmd
    if (!rcmd) return

    //  an info/warning notice might or might not accompany any response *in addition* to its other data (if any)
    if (rcmd.info || rcmd.warn) {
        const note = rcmd.warn ? rcmd.warn : rcmd.info
        const show = rcmd.warn ? vswin.showWarningMessage : vswin.showInformationMessage
        if (!(resp.mi && rcmd.action))
            show(note)
        else {
            show(note, rcmd.action).then((btnchoice) => {
                if (btnchoice)
                    zipc_req.forLang<void>(langId, resp.mi, undefined, onCmdResp)
            })
        }
    }

    if (rcmd.menu && rcmd.menu.c && rcmd.menu.c.length) { //  did we get a menu?
        const quickpickitems = rcmd.menu.c.map<Choice>(cmdToItem)
        vswin.showQuickPick<Choice>(quickpickitems, { placeHolder: rcmd.menu.d }).then(onCmdPicked(langId), u.onReject)

    } else if (rcmd.url) { // did we get a url to navigate to?
        if (!u.osNormie())
            z.log(`➜ Navigated to: ${rcmd.url}`)
        vs.commands.executeCommand('vscode.open', vs.Uri.parse(rcmd.url), vs.ViewColumn.Two)

    } else if (resp.mi && !rcmd.action) { // a new command to send right back, without requiring prior user action?
        zipc_req.forLang<void>(langId, resp.mi, undefined, onCmdResp)

    } else if (resp.srcMod && resp.srcMod.fp) { // source file modifications?
        zsrc.applyMod(vs.workspace.textDocuments.find((td) => td.fileName === resp.srcMod.fp), resp.srcMod)
    }

    if (!(rcmd.info || rcmd.warn || rcmd.menu || rcmd.url || resp.mi || resp.srcMod))
        z.logWarn(JSON.stringify(resp))
}

function reqCmdsPalette(te: vs.TextEditor, _ted: vs.TextEditorEdit, ..._args: any[]) {
    zipc_req.forEd<void>(te, zipc_req.MsgIDs.coreCmds_Palette, undefined, onCmdResp)
}
