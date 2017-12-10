import * as vs from 'vscode'
import vswin = vs.window

import * as z from './zentient'
import * as zmenu from './z-menu'

let vsStatusItems: { [_: string]: vs.StatusBarItem } = {}

enum CaddyStatus {
    Pending,
    Error,
    Busy,
    Good
}

export interface Caddy {
    ID: string
    LangID: string
    Icon: string
    Title: string
    Status: {
        Flag: CaddyStatus
        Desc: string
    }
    Details: string
    UxActionID: string
    ShowTitle: boolean
}

export function on(upd: Caddy) {
    let icon = vsStatusItems[upd.ID]
    if (!icon) {
        vsStatusItems[upd.ID] = icon = vswin.createStatusBarItem(vs.StatusBarAlignment.Right)
        z.regDisp(icon)
        icon.show()
    }
    switch (upd.Status.Flag) {
        case CaddyStatus.Pending:
            icon.text = ""
            icon.color = new vs.ThemeColor('terminal.ansiBrightYellow')
            break
        case CaddyStatus.Error:
            icon.text = ""
            icon.color = new vs.ThemeColor('terminal.ansiBrightRed')
            break
        case CaddyStatus.Busy:
            icon.text = ""
            icon.color = new vs.ThemeColor('terminal.ansiBrightBlue')
            break
        case CaddyStatus.Good:
            icon.text = upd.Icon
            icon.color = new vs.ThemeColor('terminal.ansiBrightGreen')
            break
        default:
            icon.text = ""
            icon.color = new vs.ThemeColor('terminal.ansiBrightYellow')
    }
    icon.command = upd.UxActionID
    if (upd.UxActionID && upd.UxActionID.startsWith(zmenu.mainMenuVsCmdId + '.'))
        zmenu.ensureCmdForFilteredMainMenu(upd.LangID, upd.UxActionID.slice(zmenu.mainMenuVsCmdId.length + 1))
    icon.tooltip = (upd.Title + ": " + upd.Status.Desc) + ((!upd.Details) ? "" : ("\n\n" + upd.Details))
    if (upd.ShowTitle) icon.text += " " + upd.Status.Desc
    setTimeout(() => { icon.color = undefined }, 1234)
}
