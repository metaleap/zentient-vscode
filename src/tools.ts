import * as vs from 'vscode'
import vscmd = vs.commands
import vsproj = vs.workspace
import vswin = vs.window

import * as u from './util'
import * as z from './zentient'
import * as zconn from './conn'

import * as node_path from 'path'
import * as node_fs from 'fs'
import * as node_os from 'os'


export function onActivate () {
    z.regCmd('zen.vse.dir.openNew', onCmdDirOpen(true))
    z.regCmd('zen.vse.dir.openHere', onCmdDirOpen(false))
    z.regCmd('zen.term.favs', onCmdTermFavs)
    z.regCmd('zen.folder.favsHere', onCmdFolderFavs(false))
    z.regCmd('zen.folder.favsNew', onCmdFolderFavs(true))
    z.regEdCmd('zen.caps.fmt', onCmdCaps("Formatters", zconn.MSG_CAP_FMT))
}


function onCmdCaps (title :string, querymsg :string) {
    return (ed: vs.TextEditor, _: vs.TextEditorEdit, ..._args: any[])=> {
        const zid = z.langZid(ed.document)
        if (!zid) { vswin.showInformationMessage("Only available from (" + Array.from(z.edLangs()).join(" / ") + ") editors.")  ;  return }
        z.openUriInViewer(zconn.zenProtocolUrlFromQueryMsg('cap', 'Capabilities', title + "/" + ed.document.languageId + "", querymsg + zid))
    }
}


function onCmdDirOpen (innewwindow: boolean) {
    return (uri: vs.Uri)=> vscmd.executeCommand('vscode.openFolder', uri ? uri : undefined, innewwindow) // vscode quirk: uri *may* be undefined (shows dialog) *but* not null (errors out)
}


function onCmdFolderFavs (innewwindow: boolean) {
    return ()=> {
        const   btnclose = Date.now().toString(),
                btncustom = (Date.now() * 2).toString(),
                homedir = node_os.homedir()

        let cfgdirs = vsproj.getConfiguration().get<string[]>("zen.favFolders", [])
        cfgdirs = cfgdirs.map( (d)=> (!d.startsWith('~'))  ?  d  :  node_path.join(homedir, d.slice(1)) )
        for (let i = 0; i < cfgdirs.length; i++)
            if (cfgdirs[i].endsWith('*')) {
                const parent = cfgdirs[i].slice(0, cfgdirs[i].length-1)
                const append = cfgdirs.slice(i + 1)
                cfgdirs = cfgdirs.slice(0, i)
                for (const subdir of node_fs.readdirSync(parent)) {
                    const subdirpath = node_path.join(parent, subdir)
                    if ((!subdir.startsWith('.')) && u.isDir(subdirpath)) cfgdirs.push(subdirpath)
                }
                cfgdirs.push(...append)
            }
        cfgdirs = cfgdirs.filter((d)=> !u.goPaths().includes(d) )
        cfgdirs.push(...u.goPaths().map((gp)=> node_path.join(gp, 'src')))
        cfgdirs.push(btncustom, btnclose)
        const fmt = (dir: string)=> {
            if (dir.startsWith(homedir)) dir = '~' + dir.slice(homedir.length)
            for (let i = 0; i < dir.length; i++) if (dir[i] == node_path.sep)
                dir = dir.slice(0, i) + ' ' + node_path.sep + ' ' + dir.slice(++i)
            return dir.toUpperCase()
        }
        const items = cfgdirs.map((dir)=> ({ isCloseAffordance: dir===btnclose, dirpath: dir,
            title: (dir===btnclose)  ?  "✕"  :  (dir===btncustom)  ?  "⋯"  :  ("❬ " + fmt(dir) + " ❭")  }))

        return vswin.showInformationMessage( "(Customize via `zen.favFolders` in any `settings.json`)", ...items).then( (dirpick)=>
            ((!dirpick) || dirpick.dirpath===btnclose)  ?  u.thenDont()
                        :  dirpick.dirpath===btncustom  ?  u.thenDo(innewwindow ? 'zen.vse.dir.openNew' : 'zen.vse.dir.openHere')
                                                        :  u.thenDo(()=> { vscmd.executeCommand('vscode.openFolder', vs.Uri.parse(dirpick.dirpath), innewwindow) })
        )
    }
}


function onCmdTermFavs () {
    const   ed = vswin.activeTextEditor,
            fmtfile = (ed && ed.document.uri.scheme==="file")  ?  ed.document.fileName  :  "",
            fmtdir = node_path.dirname(fmtfile),
            fmtroot = vsproj.rootPath + "", // could be undefined but still need to replace placeholder
            btnclose = Date.now().toString(),
            cmditems = vsproj.getConfiguration().get<string[]>("zen.termStickies", []).concat(btnclose),
            fmtcmd = u.strReplacer({ "${root}":fmtroot,  "${dir}":fmtdir,  "${file}":fmtfile }),
            fmttxt = u.strReplacer({ "${ROOT}":fmtroot,  "${DIR}":vsproj.asRelativePath(fmtdir),  "${FILE}":fmtfile  ?  vsproj.asRelativePath(fmtfile)  :  "" }),
            termclear = 'workbench.action.terminal.clear',
            termshow = ()=> z.vsTerm.show(true)
    const   toitem = (command: string)=>
                ({ title: command===btnclose   ?   "✕"   :   ("❬ " + fmttxt(command.toUpperCase()) + " ❭"),
                    commandline: fmtcmd(command), isCloseAffordance: command===btnclose })

    return vswin.showInformationMessage( "(Customize via `zen.termStickies` in any `settings.json`)", ...cmditems.map(toitem) ).then( (cmdpick)=>
        ((!cmdpick) || cmdpick.commandline===btnclose)  ? u.thenDont()
            : u.thenDo( termclear , termshow , ()=> { z.vsTerm.sendText(cmdpick.commandline) } )
    )
}
