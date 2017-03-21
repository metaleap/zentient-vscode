import * as vs from 'vscode'
import vsproj = vs.workspace
import vswin = vs.window

import * as u from './util'
import * as z from './zentient'

import * as node_path from 'path'


export function onActivate () {
    z.regCmd('zen.vse.dir.openNew', onCmdDirOpen)
    z.regCmd('zen.term.favs', onCmdTermFavs)
}


function onCmdDirOpen (uri :vs.Uri) {
    return vs.commands.executeCommand('vscode.openFolder', uri, true)
}


function onCmdTermFavs () {
    const   ed = vswin.activeTextEditor,
            fmtfile = (ed && ed.document.uri.scheme==="file") ? ed.document.fileName : "",
            fmtdir = node_path.dirname(fmtfile),
            fmtroot = vsproj.rootPath + "", // could be undefined but still need to replace placeholder
            btnclose = Date.now().toString(),
            cmditems = vsproj.getConfiguration().get<string[]>("zen.term.stickies", []).concat(btnclose),
            fmtcmd = u.strReplacer({ "${root}":fmtroot,  "${dir}":fmtdir,  "${file}":fmtfile }),
            fmttxt = u.strReplacer({ "${ROOT}":fmtroot,  "${DIR}":vsproj.asRelativePath(fmtdir),  "${FILE}":fmtfile ? vsproj.asRelativePath(fmtfile) : "" }),
            termclear = 'workbench.action.terminal.clear',
            termshow = ()=> z.vsTerm.show(true)
    const   toitem = (command :string)=>
                ({ title: command===btnclose   ?   "✕"   :   ("❬" + fmttxt(command.toUpperCase()) + "❭"),
                    commandline: fmtcmd(command), isCloseAffordance: command===btnclose })

    return vswin.showInformationMessage( "(Customize via `zen.term.stickies` in `settings.json`)", ...cmditems.map(toitem) ).then( (cmdpick)=>
        ((!cmdpick) || cmdpick.commandline===btnclose) ? u.thenDont()
            : u.thenDo( termclear, termshow, ()=>{ z.vsTerm.sendText(cmdpick.commandline) } )
    )
}
