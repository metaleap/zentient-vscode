import * as vs from 'vscode'
import vswin = vs.window

import * as z from './zentient'
import * as zipc_req from './ipc-msg-req'
import * as zipc_resp from './ipc-msg-resp'
import * as zsrc from './z-src'
import * as zvscmd from './vsc-commands'

import * as u from './util'


interface Menu {
    d: string       // Desc
    tl: boolean     // TopLevel
    i: MenuItem[]   // Items
}

interface Choice extends vs.QuickPickItem {
    cmd: MenuItem
}

interface MenuItem {
    mi: zipc_req.MsgIDs
    ma: any     // MsgArgs
    c: string   // Category
    t: string   // Title
    d: string   // Description
    h: string   // Hint
}

export interface Resp {
    menu: Menu      // Menu
    url: string     // WebsiteURL
    info: string    // NoteInfo
    warn: string    // NoteWarn
    action: string  // MsgAction
}


export function onActivate() {
    zvscmd.ensureEd('zen.core.cmds.listall', onReqMainMenu)
}

function cmdToItem(cmd: MenuItem) {
    const item: Choice = {
        description: cmd.h, detail: cmd.d, cmd: cmd,
        label: cmd.c ? `❬${cmd.c}❭ — ${cmd.t}` : `${cmd.t}`
    }
    return item
}

function onMenuItemPicked(langId: string) {
    return (pick: Choice) => {
        if (pick && pick.cmd) {
            const msgargs = pick.cmd.ma
            const laststep = () => zipc_req.forLang<void>(langId, pick.cmd.mi, msgargs, onMenuResp)

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
                }, u.onReject)
            }
        }
    }
}

function onMenuResp(langId: string, resp: zipc_resp.Msg) {
    const rmenu = resp.menu
    if (!rmenu) return

    //  an info/warning notice might or might not accompany any response *in addition* to its other data (if any)
    if (rmenu.info || rmenu.warn) {
        const note = rmenu.warn ? rmenu.warn : rmenu.info
        const show = rmenu.warn ? vswin.showWarningMessage : vswin.showInformationMessage
        if (!(resp.mi && rmenu.action))
            show(note)
        else {
            show(note, rmenu.action).then((btnchoice) => {
                if (btnchoice)
                    zipc_req.forLang<void>(langId, resp.mi, undefined, onMenuResp)
            }, u.onReject)
        }
    }

    if (rmenu.menu && rmenu.menu.i && rmenu.menu.i.length) { //  did we get a menu?
        const quickpickitems = rmenu.menu.i.map<Choice>(cmdToItem)
        vswin.showQuickPick<Choice>(quickpickitems, { ignoreFocusOut: true, placeHolder: rmenu.menu.d }).then(onMenuItemPicked(langId), u.onReject)

    } else if (rmenu.url) { // did we get a url to navigate to?
        if (!u.osNormie())
            z.log(`➜ Navigated to: ${rmenu.url}`)
        vs.commands.executeCommand('vscode.open', vs.Uri.parse(rmenu.url), vs.ViewColumn.Two)

    } else if (resp.mi && !rmenu.action) { // a new command to send right back, without requiring prior user action?
        zipc_req.forLang<void>(langId, resp.mi, undefined, onMenuResp)

    } else if (resp.srcMods && resp.srcMods.length && resp.srcMods[0] && resp.srcMods[0].fp) { // source file modifications?
        zsrc.applyMod(vs.workspace.textDocuments.find((td) => td.fileName === resp.srcMods[0].fp), resp.srcMods[0])
    }

    if (!(rmenu.info || rmenu.warn || rmenu.menu || rmenu.url || resp.mi || resp.srcMods))
        z.logWarn(JSON.stringify(resp))
}

function onReqMainMenu(te: vs.TextEditor, _ted: vs.TextEditorEdit, ..._args: any[]) {
    zipc_req.forEd<void>(te, zipc_req.MsgIDs.menus_Main, undefined, onMenuResp)
}
