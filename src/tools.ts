import * as vs from 'vscode'
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
            fmtroot = vs.workspace.rootPath + "",
            now = Date.now().toString(),
            cmditems = vs.workspace.getConfiguration().get<string[]>("zen.term.favcommands", []).concat(now)
    const   fmtcmd = (command :string)=> command
                .replace("${file}" , fmtfile)
                .replace("${dir}" , fmtdir)
                .replace("${root}" , fmtroot)
    const   fmttxt = (command :string)=> command
                .replace("${FILE}" , fmtfile ? vs.workspace.asRelativePath(fmtfile) : "")
                .replace("${DIR}" , vs.workspace.asRelativePath(fmtdir))
                .replace("${ROOT}" , fmtroot)
                .replace(now , "WUT?")
    const   toitem = (command :string)=>
                ({ commandline: fmtcmd(command), title: command===now ? "✕" : ("❬" + fmttxt(command.toUpperCase()) + "❭"), isCloseAffordance: command===now })
    // if ((cmditems.length===0) || 1==1) return vswin.showInformationMessage("No custom favorite terminal command-lines defined yet: add to `zen.term.favcommands` in your Settings.")
    return vswin.showInformationMessage( "Run in terminal: ", ...cmditems.map(toitem) ).then( (cmdpick)=>
        ((!cmdpick) || cmdpick.commandline===now) ? z.thenHush() : z.thenDo( ()=>
            { z.vsTerm.show(true)  ;  z.vsTerm.sendText(cmdpick.commandline) } ) )
}
