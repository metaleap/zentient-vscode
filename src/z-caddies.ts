import * as vs from 'vscode'
import vswin = vs.window

import * as z from './zentient'
import * as zmenu from './z-menu'


enum CaddyStatus {
    PENDING,
    ERROR,
    BUSY,
    GOOD
}

export interface Caddy {
    ID: string
    LangID?: string
    Icon: string
    Title: string
    Status: {
        Flag: CaddyStatus
        Desc: string
    }
    Details?: string
    UxActionID: string
    ShowTitle?: boolean
}

interface Icon {
    item: vs.StatusBarItem
    lastUpd: number
}


let vsStatusIcons: { [_: string]: Icon } = {},
    prioCount = 0,
    lintsCaddy: Caddy = {
        ID: "__zentient__Diags", Icon: "", Title: "Lintish Jobs", UxActionID: zmenu.mainMenuVsCmdId + '.Linting',
        Status: { Flag: CaddyStatus.GOOD, Desc: "" }
    }


export function onDiagEvt(started: boolean, details: string[]) {
    lintsCaddy.Status.Flag = started ? CaddyStatus.BUSY : CaddyStatus.GOOD
    lintsCaddy.Status.Desc = details.length + (started ? " started at " : " finished at ") + new Date().toLocaleTimeString()
    lintsCaddy.Details = details.join('\n')
    on(lintsCaddy)
}

export function on(upd: Caddy) {
    let icon = vsStatusIcons[upd.ID]
    if (!icon) {
        vsStatusIcons[upd.ID] = icon = { lastUpd: Date.now(), item: vswin.createStatusBarItem(vs.StatusBarAlignment.Right, ++prioCount) }
        z.regDisp(icon.item)
        icon.item.show()
    } else
        icon.lastUpd = Date.now()
    const item = icon.item
    switch (upd.Status.Flag) {
        case CaddyStatus.PENDING:
            item.text = ""
            item.color = new vs.ThemeColor('terminal.ansiBrightYellow')
            break
        case CaddyStatus.ERROR:
            item.text = ""
            item.color = new vs.ThemeColor('terminal.ansiBrightRed')
            break
        case CaddyStatus.BUSY:
            item.text = ""
            item.color = new vs.ThemeColor('terminal.ansiBrightBlue')
            break
        case CaddyStatus.GOOD:
            item.text = upd.Icon
            item.color = new vs.ThemeColor('terminal.ansiBrightGreen')
            break
        default:
            item.text = ""
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
