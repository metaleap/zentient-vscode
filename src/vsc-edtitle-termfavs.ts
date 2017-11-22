import * as vs from 'vscode'
import vsproj = vs.workspace
import vswin = vs.window

import * as node_path from 'path'

import * as z from './z'
import * as zvscmd from './vsc-commands'

let vsTerm: vs.Terminal

export function activate() {
    zvscmd.ensureCmd('zen.term.favs', onCmdTermFavs)
    zvscmd.ensureCmd('zen.term.favs.alt', onCmdTermFavsAlt)
    ensureTerm()
    z.regDisp(vswin.onDidCloseTerminal((term: vs.Terminal) => {
        if (term === vsTerm)
            vsTerm = null
    }))
}

function ensureTerm() {
    z.regDisp(vsTerm = vswin.createTerminal("⟨ℤ⟩"))
}

function onCmdTermFavs(currentfileuri: vs.Uri) {
    const fmtfile = (currentfileuri.scheme === "file") ? currentfileuri.fsPath : currentfileuri.toString(),
        fmtdir = node_path.dirname(fmtfile),
        fmtroot = z.vsProjRootDir + "", // could be undefined but still need to replace placeholder
        btnclose = zproj.now.toString(),
        cmditems = vsproj.getConfiguration().get<string[]>("zen.termStickies", []).concat(btnclose),
        fmtcmd = u.strReplacer({ "${root}": fmtroot, "${dir}": fmtdir, "${file}": fmtfile }),
        fmttxt = u.strReplacer({ "${ROOT}": fmtroot, "${DIR}": zproj.relPath(fmtdir), "${FILE}": fmtfile ? zproj.relPath(fmtfile) : "" })
    const toitem = (command: string) =>
        ({
            title: command === btnclose ? "✕" : ("❬ " + fmttxt(command.toUpperCase()) + " ❭"),
            commandline: fmtcmd(command), isCloseAffordance: command === btnclose
        })

    return vswin.showInformationMessage("( Customize via `zen.termStickies` in any `settings.json`. )", ...cmditems.map(toitem)).then((cmdpick) =>
        onCmdTermFavsAlt(currentfileuri, ((!cmdpick) || cmdpick.commandline === btnclose) ? null : cmdpick.commandline))
}

function onCmdTermFavsAlt(_currentfileuri: vs.Uri, commandline: string = '') {
    if (commandline === '')
        commandline = lastTermFavsCmdLn
    if (commandline)
        return u.thenDo('workbench.action.terminal.clear', () => vsTerm.show(true), () => { vsTerm.sendText(lastTermFavsCmdLn = commandline) })
    return u.thenDont()
}
