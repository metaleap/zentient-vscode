import * as vs from 'vscode'
import vswin = vs.window

import * as node_path from 'path'
import * as node_os from 'os'
import * as node_fs from 'fs'

import * as zvscmd from './vsc-commands'
import * as zvscfg from './vsc-settings'
import * as u from './util'


let homeDirPath: string


export function onActivate() {
    zvscmd.ensure('zen.folder.favsHere', onCmdFolderFavs(false))
    zvscmd.ensure('zen.folder.favsNew', onCmdFolderFavs(true))
    zvscmd.ensure('zen.folder.openNew', onCmdDirOpen(true))
    zvscmd.ensure('zen.folder.openHere', onCmdDirOpen(false))
    try { homeDirPath = node_os.homedir() } catch (_) { }
}

function displayPath(path: string) {
    if (homeDirPath && path.startsWith(homeDirPath))
        path = "~" + path.slice(homeDirPath.length)
    return path
}

function onCmdDirOpen(innewwindow: boolean) {
    return (uri: vs.Uri) =>
        zvscmd.exec('vscode.openFolder', uri ? uri : undefined, innewwindow) // vscode quirk: uri *can* be undefined (shows dialog) *but* not null (errors out)
}

function onCmdFolderFavs(innewwindow: boolean) {
    return () => {
        const now = Date.now(),
            btnclose = now.toString(),
            btncustom = (now * 2).toString()

        let cfgdirs = zvscfg.favFolders()
        cfgdirs = cfgdirs.map((d) =>
            (!(homeDirPath && d.startsWith('~'))) ? d : node_path.join(homeDirPath, d.slice(1))
        )
        for (let i = 0; i < cfgdirs.length; i++)
            if (cfgdirs[i].endsWith('*')) {
                const parent = cfgdirs[i].slice(0, cfgdirs[i].length - 1)
                const append = cfgdirs.slice(i + 1)
                cfgdirs = cfgdirs.slice(0, i)
                for (const subdir of node_fs.readdirSync(parent)) {
                    const subdirpath = node_path.join(parent, subdir)
                    if ((!subdir.startsWith('.')) && u.isDir(subdirpath))
                        cfgdirs.push(subdirpath)
                }
                cfgdirs.push(...append)
            }
        cfgdirs = cfgdirs.filter((d) =>
            !u.goPaths().includes(d)
        )
        cfgdirs.push(...u.goPaths().map((gp) =>
            node_path.join(gp, 'src')
        ))
        cfgdirs.push(btncustom, btnclose)
        const fmt = (dir: string) => {
            dir = displayPath(dir)
            for (let i = 0; i < dir.length; i++)
                if (dir[i] === node_path.sep)
                    dir = dir.slice(0, i) + ' ' + node_path.sep + ' ' + dir.slice(++i)
            return dir.toUpperCase()
        }
        const items = cfgdirs.map((dir) =>
            u.strTrimSuffix(dir, node_path.sep)
        ).map((dir) => ({
            dirpath: dir, isCloseAffordance: dir === btnclose,
            title: (dir === btnclose) ? "✕" : (dir === btncustom) ? "…" : ("❬ " + fmt(dir) + " ❭")
        }))

        return vswin.showInformationMessage("( Customize via `zentient.favFolders` in any `settings.json`. )", ...items).then((dirpick) => {
            if (dirpick && dirpick.dirpath !== btnclose)
                if (dirpick.dirpath === btncustom)
                    zvscmd.exec('zen.folder.open' + (innewwindow ? 'New' : 'Here'))
                else
                    zvscmd.exec('vscode.openFolder', vs.Uri.file(dirpick.dirpath), innewwindow)
        }, u.onReject)
    }
}
