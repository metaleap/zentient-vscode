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
    desc: string
    topLevel: boolean
    items: MenuItem[]
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

export function ensureCmdForFilteredMainMenu(langId: string, cat: string) {
    if (!ensuredfilters.includes(cat)) {
        ensuredfilters.push(cat)
        zvscmd.ensureEd(mainMenuVsCmdId + '.' + cat, onReqMainMenuFiltered(langId, cat))
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
            if (pick.from.ii) {
                const ipcargs = pick.from.ia
                const laststep = () => zipc_req.forLang<void>(langId, pick.from.ii, ipcargs, onMenuResp)

                const argnames2prompt4: string[] = []
                if (ipcargs)
                    for (const argname in ipcargs) {
                        const argval = ipcargs[argname]
                        if (argval && argval['prompt'])
                            argnames2prompt4.push(argname)
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
            } else if (pick.from.ia && (typeof pick.from.ia === 'string') && pick.from.ia.indexOf("://") > 0)
                z.tryOpenUri(pick.from.ia)
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
            show(note, rmenu.uxActionLabel).then(btnchoice => {
                if (btnchoice)
                    zipc_req.forLang<void>(langId, resp.ii, undefined, onMenuResp)
            }, u.onReject)
    }

    if (rmenu.menu && rmenu.menu.items) { //  a menu?
        const allsamecat = rmenu.menu.items.every(item => item.c === rmenu.menu.items[0].c)
        const items = rmenu.menu.items.map<VsItem>(item => itemToVsItem(item, !allsamecat))
        const sticky = !rmenu.menu.topLevel
        const opt = { ignoreFocusOut: sticky, placeHolder: rmenu.menu.desc, matchOnDetail: sticky, matchOnDescription: sticky }
        vswin.showQuickPick<VsItem>(items, opt).then(onMenuItemPicked(langId), u.onReject)

    } else if (rmenu.url) { // a url to navigate to?
        z.tryOpenUri(rmenu.url)

    } else if (resp.ii && !rmenu.uxActionLabel) { // a new command to send right back, without requiring prior user action?
        zipc_req.forLang<void>(langId, resp.ii, undefined, onMenuResp)

    } else if (resp.srcMods && resp.srcMods.length && resp.srcMods[0] && resp.srcMods[0].f) { // source file modifications?
        zsrc.applyMod(z.findTextFile(resp.srcMods[0].f), resp.srcMods[0])
    }

    if (!(rmenu.info || rmenu.warn || rmenu.menu || rmenu.url || resp.ii || resp.srcMods))
        z.logWarn(JSON.stringify(resp))
}

function onReqMainMenu(te: vs.TextEditor, _ted: vs.TextEditorEdit, ...args: any[]) {
    zipc_req.forEd<void>(te, zipc_req.IpcIDs.MENUS_MAIN, (!(args && args.length)) ? undefined : (args.length === 1 ? args[0] : args), onMenuResp)
}

function onReqMainMenuFiltered(langId: string, catFilter: string) {
    return (te: vs.TextEditor) =>
        zipc_req.forLang<void>(langId, zipc_req.IpcIDs.MENUS_MAIN, catFilter, onMenuResp, te)
}
