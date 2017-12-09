import * as vs from 'vscode'
import vswin = vs.window

import * as z from './zentient'
import * as zipc_req from './ipc-req'
import * as zipc_resp from './ipc-resp'
import * as zsrc from './z-src'
import * as zvscmd from './vsc-commands'

import * as u from './util'


export const mainMenuVsCmdId = 'zen.menus.main'


interface Menu {
    d: string       // Desc
    tl: boolean     // TopLevel
    i: MenuItem[]   // Items
}

interface VsItem extends vs.QuickPickItem {
    from: MenuItem
}

interface MenuItem {
    ii: zipc_req.IpcIDs
    ia: any     // IpcArgs
    c: string   // Category
    t: string   // Title
    d: string   // Description
    h: string   // Hint
}

export interface Resp {
    menu: Menu              // Menu
    url: string             // WebsiteURL
    info: string            // NoteInfo
    warn: string            // NoteWarn
    uxActionLabel: string   // UxActionLabel
}


export function onActivate() {
    zvscmd.ensureEd(mainMenuVsCmdId, onReqMainMenu)
}

export function ensureCmdForFilteredMainMenu(cat: string) {
    if (!ensuredfilters.includes(cat)) {
        ensuredfilters.push(cat)
        zvscmd.ensureEd(mainMenuVsCmdId + '.' + cat, onReqMainMenuFiltered(cat))
    }
}
let ensuredfilters: string[] = []

function itemToVsItem(item: MenuItem, cat = true): VsItem {
    return {
        description: item.h, detail: item.d, from: item,
        label: (!(cat && item.c)) ? `${item.t}` : (`❬${item.c}❭ — ${item.t}`)
    }
}

function onMenuItemPicked(langId: string) {
    return (pick: VsItem) => {
        if (pick && pick.from) {
            const ipcargs = pick.from.ia
            const laststep = () => zipc_req.forLang<void>(langId, pick.from.ii, ipcargs, onMenuResp)

            const argnames2prompt4: string[] = []
            if (ipcargs)
                for (const argname in ipcargs) {
                    const argval = ipcargs[argname]
                    if (argval && argval['prompt']) {
                        argnames2prompt4.push(argname)
                    }
                }

            if (argnames2prompt4.length > 1)
                vswin.showErrorMessage("Time for proper chaining, man!")
            else if (argnames2prompt4.length < 1)
                laststep()
            else {
                const argname = argnames2prompt4[0]
                vswin.showInputBox(ipcargs[argname]).then((input: string) => {
                    if (input !== undefined) { // else it was cancelled
                        ipcargs[argname] = input
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
        if (!(resp.ii && rmenu.uxActionLabel))
            show(note)
        else
            show(note, rmenu.uxActionLabel).then((btnchoice) => {
                if (btnchoice)
                    zipc_req.forLang<void>(langId, resp.ii, undefined, onMenuResp)
            }, u.onReject)
    }

    if (rmenu.menu && rmenu.menu.i && rmenu.menu.i.length) { //  did we get a menu?
        const allsamecat = rmenu.menu.i.every(item => item.c === rmenu.menu.i[0].c)
        const quickpickitems = rmenu.menu.i.map<VsItem>(item => itemToVsItem(item, !allsamecat))
        vswin.showQuickPick<VsItem>(quickpickitems, { ignoreFocusOut: !rmenu.menu.tl, placeHolder: rmenu.menu.d }).then(onMenuItemPicked(langId), u.onReject)

    } else if (rmenu.url) { // did we get a url to navigate to?
        if (!u.osNormie())
            z.log(`➜ Navigated to: ${rmenu.url}`)
        vs.commands.executeCommand('vscode.open', vs.Uri.parse(rmenu.url), vs.ViewColumn.Two)

    } else if (resp.ii && !rmenu.uxActionLabel) { // a new command to send right back, without requiring prior user action?
        zipc_req.forLang<void>(langId, resp.ii, undefined, onMenuResp)

    } else if (resp.srcMods && resp.srcMods.length && resp.srcMods[0] && resp.srcMods[0].fp) { // source file modifications?
        zsrc.applyMod(vs.workspace.textDocuments.find((td) => td.fileName === resp.srcMods[0].fp), resp.srcMods[0])
    }

    if (!(rmenu.info || rmenu.warn || rmenu.menu || rmenu.url || resp.ii || resp.srcMods))
        z.logWarn(JSON.stringify(resp))
}

function onReqMainMenu(te: vs.TextEditor, _ted: vs.TextEditorEdit, ...args: any[]) {
    zipc_req.forEd<void>(te, zipc_req.IpcIDs.menus_Main, (!(args && args.length)) ? undefined : (args.length === 1 ? args[0] : args), onMenuResp)
}

function onReqMainMenuFiltered(catFilter: string) {
    return (te: vs.TextEditor, ted?: vs.TextEditorEdit) =>
        onReqMainMenu(te, ted, catFilter)
}
