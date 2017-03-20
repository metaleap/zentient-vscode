import * as vs from 'vscode'
import vsproj = vs.workspace
import vswin = vs.window

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
            fmtfile = (ed && ed.document.uri.scheme=="file") ? ed.document.fileName : "",
            fmtdir = node_path.dirname(fmtfile),
            fmtroot = vsproj.rootPath + "",
            btnclose = Date.now().toString(),
            cmditems = vsproj.getConfiguration().get<string[]>("zen.term.favcommands", []).concat(btnclose)
    const   fmtcmd = (command :string)=> command
                .replace("${file}" , fmtfile)
                .replace("${dir}" , fmtdir)
                .replace("${root}" , fmtroot)
    const   fmttxt = (command :string)=> command
                .replace("${FILE}" , fmtfile ? vsproj.asRelativePath(fmtfile) : "")
                .replace("${DIR}" , vsproj.asRelativePath(fmtdir)).replace("${ROOT}" , fmtroot)
    const   toitem = (command :string)=>
                ({ commandline: fmtcmd(command), title: command===btnclose ? "✕" : ("❬" + fmttxt(command.toUpperCase()) + "❭"), isCloseAffordance: command===btnclose })
    return vswin.showInformationMessage( "(Customize via `zen.term.favcommands` in `settings.json`)", ...cmditems.map(toitem) ).then( (cmdpick)=>
        ((!cmdpick) || cmdpick.commandline===btnclose) ? z.thenHush() : z.thenDo( ()=>
            { z.vsTerm.show(true)  ;  z.vsTerm.sendText(cmdpick.commandline) } ) )
}
