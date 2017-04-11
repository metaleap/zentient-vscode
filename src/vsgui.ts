import * as vs from 'vscode'
import vscmd = vs.commands
import vsproj = vs.workspace
import vswin = vs.window

import * as u from './util'
import * as z from './zentient'
import * as zconn from './conn'
import * as zpage from './page'

import * as node_path from 'path'
import * as node_fs from 'fs'
import * as node_os from 'os'


export  let statusRight:    vs.StatusBarItem,
            statusLeft:     vs.StatusBarItem,
            vsTerm:     vs.Terminal

let vsreg = false




export function onActivate (disps: vs.Disposable[]) {
    if (!vsreg) {
        z.regCmd('zen.vse.dir.openNew', onCmdDirOpen(true))
        z.regCmd('zen.vse.dir.openHere', onCmdDirOpen(false))
        z.regCmd('zen.term.favs', onCmdTermFavs)
        z.regCmd('zen.folder.favsHere', onCmdFolderFavs(false))
        z.regCmd('zen.folder.favsNew', onCmdFolderFavs(true))
        z.regEdCmd('zen.caps.fmt', onCmdCaps("Formatting", "document/selection re-formatting", zconn.MSG_CAPS, 'fmt'))
        z.regEdCmd('zen.caps.diag', onCmdCaps("Code Diagnostics", "workspace-wide code diagnostics (error / warning / info / hint notices)", zconn.MSG_CAPS, 'diag'))


        const reinitTerm = ()=> disps.push(vsTerm = vswin.createTerminal("⟨ℤ⟩"))
        reinitTerm()
        disps.push(vswin.onDidCloseTerminal((term: vs.Terminal)=> {
            if (term===vsTerm) reinitTerm()
        }))


        disps.push(statusRight = vswin.createStatusBarItem(vs.StatusBarAlignment.Right, 12345))
        disps.push(statusLeft = vswin.createStatusBarItem(vs.StatusBarAlignment.Left, 0))
        statusLeft.color = 'white'
        // statusitemleft.command = 'zen.caps.diag'
        statusLeft.text = "ℤ..."
        statusLeft.tooltip = "Zentient status"
        statusLeft.show()
        statusRight.command = 'zen.caps.fmt'
        statusRight.text = ":"
        statusRight.tooltip = "Current byte offset"
        statusRight.show()

        disps.push(vswin.onDidChangeTextEditorSelection(onEdSelectionChanged))


        vsreg = true
    }
}


function onEdSelectionChanged (ev: vs.TextEditorSelectionChangeEvent) {
    const pos = ev.textEditor.selection.active
    statusRight.text = ":" + ev.textEditor.document.offsetAt(pos).toString()
}


function onCmdCaps (title: string, desc: string, querymsg: string, cap: string) {
    return (ed: vs.TextEditor, _: vs.TextEditorEdit, ..._args: any[])=> {
        let zids = [ z.langZid(ed.document) ]
        if (!zids[0]) { zids = []  ;  for (const zid in z.langs) zids.push(zid) }
        const zidstr = zids.join(',')
        zpage.openUriInViewer(zpage.zenProtocolUrlFromQueryMsg('cap', 'Capabilities', title + '/' + zidstr, querymsg + zidstr + ':' + cap + '#' + desc))
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
        const items = cfgdirs.map((dir)=>u.sliceWhileEndsWith(node_path.sep, dir)).map((dir)=>
            ({ isCloseAffordance: dir===btnclose, dirpath: dir,
                title: (dir===btnclose)  ?  "✕"  :  (dir===btncustom)  ?  "⋯"  :  ("❬ " + fmt(dir) + " ❭")  }))

        return vswin.showInformationMessage( "( Customize via `zen.favFolders` in any `settings.json`. )", ...items).then( (dirpick)=>
            ((!dirpick) || dirpick.dirpath===btnclose)  ?  u.thenDont()
                        :  dirpick.dirpath===btncustom  ?  u.thenDo(innewwindow ? 'zen.vse.dir.openNew' : 'zen.vse.dir.openHere')
                                                        :  u.thenDo(()=> { vscmd.executeCommand('vscode.openFolder', vs.Uri.file(dirpick.dirpath), innewwindow) })
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
            termshow = ()=> vsTerm.show(true)
    const   toitem = (command: string)=>
                ({ title: command===btnclose   ?   "✕"   :   ("❬ " + fmttxt(command.toUpperCase()) + " ❭"),
                    commandline: fmtcmd(command), isCloseAffordance: command===btnclose })

    return vswin.showInformationMessage( "( Customize via `zen.termStickies` in any `settings.json`. )", ...cmditems.map(toitem) ).then( (cmdpick)=>
        ((!cmdpick) || cmdpick.commandline===btnclose)  ? u.thenDont()
            : u.thenDo( termclear , termshow , ()=> { vsTerm.sendText(cmdpick.commandline) } )
    )
}
