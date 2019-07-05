import * as vs from 'vscode'
import vswin = vs.window

import * as z from './zentient'
import * as zcfg from './vsc-settings'
import * as zipc from './ipc-protocol-msg-types'
import * as zmenu from './z-menu'


interface Icon {
    item: vs.StatusBarItem
    lastUpd: number
    langID: string
}


let vsStatusIcons: { [_: string]: Icon } = {},
    prioCount = 0,
    lintsCaddy: zipc.Caddy = {
        ID: '__zentient__Diags', Icon: '👓', Title: "Lintish Jobs", UxActionID: zmenu.mainMenuVsCmdId + '.Linting',
        Status: { Flag: zipc.CaddyStatus.GOOD, Desc: "" }
    }


export function onActivate() {
    z.regDisp(vswin.onDidChangeActiveTextEditor(onTextEditorChanged))
}

export function onDiagEvt(started: boolean, details: string[]) {
    lintsCaddy.Status.Flag = started ? zipc.CaddyStatus.BUSY : zipc.CaddyStatus.GOOD
    lintsCaddy.Status.Desc = details.length + (started ? " started at " : " finished at ") + new Date().toLocaleTimeString()
    lintsCaddy.Details = details.join('\n')
    on(lintsCaddy)
}

function onTextEditorChanged(te: vs.TextEditor) {
    const iszentientfile = te && zcfg.languageIdOk(te.document)
    for (const id in vsStatusIcons) {
        const caddyicon = vsStatusIcons[id]
        if (caddyicon && caddyicon.langID)
            if ((!iszentientfile) || (caddyicon.langID === te.document.languageId))
                caddyicon.item.show()
            else
                caddyicon.item.hide()
    }
}

export function on(upd: zipc.Caddy) {
    const iconid = upd.ID + upd.LangID
    let icon = vsStatusIcons[iconid]
    if (!icon) {
        vsStatusIcons[iconid] = icon = { langID: upd.LangID, lastUpd: Date.now(), item: vswin.createStatusBarItem(vs.StatusBarAlignment.Right, ++prioCount) }
        z.regDisp(icon.item)
        icon.item.show()
    } else
        icon.lastUpd = Date.now()
    const item = icon.item
    switch (upd.Status.Flag) {
        case zipc.CaddyStatus.PENDING:
            item.text = '⏲'
            item.color = new vs.ThemeColor('terminal.ansiBrightYellow')
            break
        case zipc.CaddyStatus.ERROR:
            item.text = '⛔'
            item.color = new vs.ThemeColor('terminal.ansiBrightRed')
            break
        case zipc.CaddyStatus.BUSY:
            item.text = '⏳'
            item.color = new vs.ThemeColor('terminal.ansiBrightBlue')
            break
        case zipc.CaddyStatus.GOOD:
            item.text = upd.Icon
            item.color = new vs.ThemeColor('terminal.ansiBrightGreen')
            break
        default:
            item.text = '⚠'
            item.color = new vs.ThemeColor('terminal.ansiBrightYellow')
    }
    item.command = upd.UxActionID
    if (upd.UxActionID && upd.UxActionID.startsWith(zmenu.mainMenuVsCmdId + '.'))
        zmenu.ensureCmdForFilteredMainMenu(upd.LangID, upd.UxActionID.slice(zmenu.mainMenuVsCmdId.length + 1))
    item.tooltip = (upd.Title + ": " + upd.Status.Desc) + ((!upd.Details) ? "" : ("\n\n" + upd.Details))
    if (upd.ShowTitle) item.text += " " + upd.Status.Desc
}

export function deColorizeOlderIcons() {
    const now = Date.now()
    for (const iconid in vsStatusIcons) {
        const icon = vsStatusIcons[iconid]
        if (icon.lastUpd && (now - icon.lastUpd) > 1234)
            icon.item.color = undefined
    }
}
