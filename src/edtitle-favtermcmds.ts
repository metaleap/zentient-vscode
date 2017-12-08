import * as vs from 'vscode'
import vsproj = vs.workspace
import vswin = vs.window

import * as node_path from 'path'

import * as zvscmd from './vsc-commands'
import * as zvscfg from './vsc-settings'
import * as zvsterms from './vsc-terminals'
import * as u from './util'

let lastTermFavsCmdLn: string


export function onActivate() {
    zvscmd.ensure('zen.term.favs', onCmdTermFavs)
    zvscmd.ensure('zen.term.favs.alt', onCmdTermFavsAlt)
    zvsterms.ensureTerm()
}

function onCmdTermFavs(curFileUri: vs.Uri) {
    const now = Date.now(),
        fmtfile = (curFileUri.scheme === "file") ? curFileUri.fsPath : curFileUri.toString(),
        fmtdir = node_path.dirname(fmtfile),
        btnclose = now.toString(),
        cmditems = zvscfg.termStickies().concat(btnclose),
        fmtcmd = u.strReplacer({ "${dir}": fmtdir, "${file}": fmtfile }),
        fmttxt = u.strReplacer({
            "${DIR}": vsproj.asRelativePath(fmtdir),
            "${FILE}": fmtfile ? vsproj.asRelativePath(fmtfile) : ""
        })
    const toitem = (command: string) =>
        ({
            title: (command === btnclose) ? "✕" : ("❬ " + fmttxt(command.toUpperCase()) + " ❭"),
            commandline: fmtcmd(command), isCloseAffordance: (command === btnclose)
        })

    return vswin.showInformationMessage("( Customize via `zen.termStickies` in any `settings.json`. )",
        ...cmditems.map(toitem)).then((cmdpick) => {
            const final = (cmdline: string) => {
                if (cmdline && cmdline !== btnclose)
                    onCmdTermFavsAlt(curFileUri, cmdline)
            }
            if (cmdpick && cmdpick.commandline.includes("${arg}"))
                return vswin.showInputBox({ prompt: cmdpick.commandline, placeHolder: "${arg}" }).then((arg) => {
                    if (arg) final(u.strReplacer({ "${arg}": arg })(cmdpick.commandline))
                }, u.onReject)
            return final(cmdpick ? cmdpick.commandline : '')
        }, u.onReject)
}

function onCmdTermFavsAlt(_curFileUri: vs.Uri, terminalCommand: string = '') {
    if (terminalCommand === '')
        terminalCommand = lastTermFavsCmdLn
    if (terminalCommand)
        zvsterms.showThenClearThenSendText(lastTermFavsCmdLn = terminalCommand)
}
