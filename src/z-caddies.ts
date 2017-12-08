import * as vs from 'vscode'
import vswin = vs.window

import * as z from './zentient'

let vsStatusItems: { [_: string]: vs.StatusBarItem } = {}

enum CaddyStatus {
    Pending,
    Error,
    Busy,
    Good
}

export interface Caddy {
    ID: string
    Icon: string
    Title: string
    Status: {
        Flag: CaddyStatus
        Desc: string
    }
}

export function on(upd: Caddy) {
    let icon = vsStatusItems[upd.ID]
    if (!icon) {
        vsStatusItems[upd.ID] = icon = vswin.createStatusBarItem(vs.StatusBarAlignment.Right)
        z.regDisp(icon)
        icon.show()
    }
    switch (upd.Status.Flag) {
        case CaddyStatus.Pending: icon.text = ""; break
        case CaddyStatus.Error: icon.text = ""; break
        case CaddyStatus.Busy: icon.text = ""; break
        case CaddyStatus.Good: icon.text = upd.Icon; break
        default: icon.text = ""
    }
    icon.tooltip = (upd.Title + ": " + upd.Status.Desc)
}
