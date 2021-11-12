import * as vs from 'vscode'
import vswin = vs.window
import * as u from './util'
import * as z from './zentient'
import * as zvscmd from './vsc-commands'


let vsTerm: vs.Terminal

export function onActivate() {
    z.vsCtx.subscriptions.push(vswin.onDidCloseTerminal(onVsTerminalClosed))
}

function onVsTerminalClosed(term: vs.Terminal) {
    if (term === vsTerm)
        vsTerm = null
}

export function ensureTerm() {
    if (!vsTerm)
        z.vsCtx.subscriptions.push(vsTerm = vswin.createTerminal(z._Z_))
}

export function showThenClearThenSendText(terminalCommand: string) {
    ensureTerm()
    vsTerm.show(true)
    return zvscmd.exec('workbench.action.terminal.clear').then(
        () => vsTerm.sendText(terminalCommand),
        u.onReject
    )
}
