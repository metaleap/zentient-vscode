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
    if ((!curFileUri) && vswin.activeTextEditor && vswin.activeTextEditor.document)
        curFileUri = vswin.activeTextEditor.document.uri;

    const fmtfile = (!curFileUri) ? "" : (curFileUri.scheme === "file") ? curFileUri.fsPath : curFileUri.toString(),
        fmtdir = fmtfile ? node_path.dirname(fmtfile) : "",
        cmditems = zvscfg.termStickies(),
        fmtcmd = u.strReplacer({ "${dir}": fmtdir, "${file}": fmtfile }),
        fmttxt = u.strReplacer({
            "${DIR}": fmtdir ? vsproj.asRelativePath(fmtdir) : "",
            "${FILE}": fmtfile ? vsproj.asRelativePath(fmtfile) : ""
        }),
        toitem = (command: string) => ({
            label: fmttxt(command),
            commandline: fmtcmd(command),
            description: (!command.includes("${arg}")) ? "" : "(will prompt for args)",
        })

    return vswin.showQuickPick(cmditems.map(toitem), { placeHolder: "Customize via `zentient.termStickies` in a `settings.json`:" }).then(cmdpick => {
        const final = (cmdline: string) => {
            if (cmdline)
                onCmdTermFavsAlt(curFileUri, cmdline)
        }
        if (cmdpick && cmdpick.commandline.includes("${arg}"))
            return vswin.showInputBox({ prompt: cmdpick.commandline, placeHolder: "${arg}" }).then((arg) => {
                if (arg) final(u.strReplacer({ "${arg}": arg })(cmdpick.commandline))
            }, u.onReject)
        return final(cmdpick ? cmdpick.commandline : '')
    }, u.onReject)
}

function onCmdTermFavsAlt(_curFileUri: vs.Uri, terminalCommand: any = '') {
    if (typeof (terminalCommand) !== 'string' || !terminalCommand)
        terminalCommand = ''
    if (terminalCommand === '')
        terminalCommand = lastTermFavsCmdLn
    if (terminalCommand)
        zvsterms.showThenClearThenSendText(lastTermFavsCmdLn = terminalCommand)
}
