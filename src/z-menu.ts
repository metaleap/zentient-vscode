import * as vs from 'vscode'
import vswin = vs.window

import * as z from './zentient'
import * as zipc from './ipc-protocol-msg-types'
import * as zipc_req from './ipc-req'
import * as zsrc from './z-src'
import * as zvscmd from './vsc-commands'
import * as zvslang from './vsc-langs'

import * as u from './util'


export const mainMenuVsCmdId = 'zen.menus.main'

let stickysubmenus = false


interface VsItem extends vs.QuickPickItem {
    from: zipc.MenuItem
}


export function onActivate() {
    zvscmd.ensureEd(mainMenuVsCmdId, onReqMainMenu(false))
    zvscmd.ensureEd(mainMenuVsCmdId + '.alt', onReqMainMenu(true))
}

export function ensureCmdForFilteredMainMenu(langId: string, cat: string) {
    if (!ensuredfilters.includes(cat)) {
        ensuredfilters.push(cat)
        zvscmd.ensureEd(mainMenuVsCmdId + '.' + cat, onReqMainMenuFiltered(langId, cat))
    }
}
let ensuredfilters: string[] = []

function itemToVsItem(item: zipc.MenuItem, cat = true): VsItem {
    return {
        description: item.h, detail: item.d, from: item,
        label: (!(cat && item.c)) ? `${item.t}` : (`❲${item.c}❳ — ${item.t}`)
    }
}

function onMenuItemPicked(langId: string) {
    return (pick: VsItem) => {
        if (pick && pick.from) {
            if (pick.from.ii) {
                const ipcargs = pick.from.ia
                const laststep = () => zipc_req.forLang<void>(langId, pick.from.ii, ipcargs, onMenuResp)
                const nextstep = (!pick.from.q) ? laststep :
                    () => vswin.showWarningMessage(pick.from.q, "Yes, OK").then(btn => { if (btn) laststep() }, u.onReject)

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
                    nextstep()
                else {
                    const argname = argnames2prompt4[0]
                    vswin.showInputBox(ipcargs[argname]).then((input: string) => {
                        if (input !== undefined) { // else it was cancelled
                            ipcargs[argname] = input
                            nextstep()
                        }
                    }, u.onReject)
                }
            } else if (pick.from.ia && (typeof pick.from.ia === 'string') && pick.from.ia.indexOf("://") > 0)
                z.tryOpenUri(pick.from.ia)
        }
    }
}

function onMenuResp(langId: string, resp: zipc.Resp) {
    const rmenu = resp.menu
    if (!rmenu) return

    //  an info/warning notice might or might not accompany any response *in addition* to its other data (if any)
    if (rmenu.NoteInfo || rmenu.NoteWarn) {
        const note = rmenu.NoteWarn ? rmenu.NoteWarn : rmenu.NoteInfo
        const show = rmenu.NoteWarn ? vswin.showWarningMessage : vswin.showInformationMessage
        if (!(resp.ii && rmenu.UxActionLabel))
            show(note)
        else
            show(note, rmenu.UxActionLabel).then(btnchoice => {
                if (btnchoice)
                    zipc_req.forLang<void>(langId, resp.ii, undefined, onMenuResp)
            }, u.onReject)
    }

    // a list of src-file-loc-refs to peek?
    if (rmenu.Refs && rmenu.Refs.length)
        zvslang.peekDefRefLocs(rmenu.Refs.map<vs.Location>(zsrc.locRef2VsLoc), false)

    //  a menu to pop-up-and-drop-down?
    if (rmenu.SubMenu && rmenu.SubMenu.items) {
        const allsamecat = rmenu.SubMenu.items.every(item => item.c === rmenu.SubMenu.items[0].c)
        const items = rmenu.SubMenu.items
            .filter(item => item.ii !== zipc.IDs.SRCMOD_FMT_RUNONSEL && item.ii !== zipc.IDs.SRCMOD_FMT_RUNONFILE)
            .map<VsItem>(item => itemToVsItem(item, !allsamecat))
        const sticky = stickysubmenus && !rmenu.SubMenu.topLevel
        const opt = { ignoreFocusOut: sticky, placeHolder: rmenu.SubMenu.desc, matchOnDetail: sticky, matchOnDescription: sticky }
        vswin.showQuickPick<VsItem>(items, opt).then(onMenuItemPicked(langId), u.onReject)
    }

    // a url to navigate to?
    if (rmenu.WebsiteURL)
        z.tryOpenUri(rmenu.WebsiteURL)

    // a new command to send right back, without requiring prior user action?
    if (resp.ii && !rmenu.UxActionLabel)
        zipc_req.forLang<void>(langId, resp.ii, undefined, onMenuResp)

    // source file modifications?
    if (resp.srcMods && resp.srcMods.length && resp.srcMods[0] && resp.srcMods[0].f)
        zsrc.applyMod(z.findTextFile(resp.srcMods[0].f), resp.srcMods[0])

    if (!(rmenu.NoteInfo || rmenu.NoteWarn || rmenu.SubMenu || rmenu.WebsiteURL || resp.ii || resp.srcMods || rmenu.Refs))
        z.logWarn(JSON.stringify(resp))
}

function onReqMainMenu(stickySubMenus: boolean) {
    return (te: vs.TextEditor, _ted: vs.TextEditorEdit, ...args: any[]) => {
        stickysubmenus = stickySubMenus
        zipc_req.forEd<void>(te, zipc.IDs.MENUS_MAIN, (!(args && args.length)) ? undefined : (args.length === 1 ? args[0] : args), onMenuResp)
    }
}

function onReqMainMenuFiltered(langId: string, catFilter: string) {
    return (te: vs.TextEditor) =>
        zipc_req.forLang<void>(langId, zipc.IDs.MENUS_MAIN, catFilter, onMenuResp, te)
}
