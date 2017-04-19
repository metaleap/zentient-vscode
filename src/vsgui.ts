import * as vs from 'vscode'
import vscmd = vs.commands
import vsproj = vs.workspace
import vswin = vs.window

import * as u from './util'
import * as z from './zentient'
import * as zconn from './conn'
import * as zpage from './page'
import * as zlang from './lang'
import * as zproj from './proj'
import * as zed from './vseditor'

import * as node_path from 'path'
import * as node_fs from 'fs'
import * as node_os from 'os'



export let  statusRight:    vs.StatusBarItem,
            statusLeft:     vs.StatusBarItem,
            vsTerm:         vs.Terminal,
            homeDir:        string




let vsreg = false,
    lastpos: vs.Position,
    toolsLastResults_intel: SrcRefLocPick[] = [],
    toolsLastDesc: { [_toolkind:string]: string } = {}




export function onActivate (disps: vs.Disposable[]) {
    if (!homeDir) homeDir = node_os.homedir()
    if (!vsreg) {
        z.regCmd('zen.vse.dir.openNew', onCmdDirOpen(true))
        z.regCmd('zen.vse.dir.openHere', onCmdDirOpen(false))
        z.regCmd('zen.term.favs', onCmdTermFavs)
        z.regCmd('zen.tools.intel', onCmdShowToolsMenu('intel', "Code Intel Extras", zconn.REQ_TOOLS_INTEL, true, onCmdIntelToolPicked))
        z.regCmd('zen.tools.intel.last', ()=> vswin.showQuickPick(toolsLastResults_intel, quickPickOpt(toolsLastDesc['intel'])).then(onCmdIntelToolsResultPicked))
        z.regCmd('zen.tools.query', onCmdShowToolsMenu('query', "Query Extras", zconn.REQ_TOOLS_QUERY, false, onCmdQueryToolPicked))
        z.regCmd('zen.tools.query.last', ()=> vswin.showInformationMessage("TODO"))
        z.regCmd('zen.folder.favsHere', onCmdFolderFavs(false))
        z.regCmd('zen.folder.favsNew', onCmdFolderFavs(true))
        z.regEdCmd('zen.caps.fmt', onCmdCaps("Formatting", "document/selection re-formatting", zconn.REQ_QUERY_CAPS, 'fmt'))
        z.regEdCmd('zen.caps.diag', onCmdCaps("Code Diagnostics", "supplementary code-related diagnostic notices for currently opened source files", zconn.REQ_QUERY_CAPS, 'diag'))
        z.regEdCmd('zen.caps.ren', onCmdCaps("Renaming", "workspace-wide symbol renaming", zconn.REQ_QUERY_CAPS, 'ren'))
        z.regEdCmd('zen.caps.intel', onCmdCaps("Code Intel", ["Completion Suggest", "Go to Definition", "Go to Type Definition", "Go to Interfaces/Implementers", "References Lookup", "Symbols Lookup", "Hover Tips", "Semantic Highlighting", "Code Intel Extras"].join("</i>, <i>"), zconn.REQ_QUERY_CAPS, 'intel'))

        const reinitTerm = ()=> disps.push(vsTerm = vswin.createTerminal("⟨ℤ⟩"))
        reinitTerm()
        disps.push(vswin.onDidCloseTerminal((term: vs.Terminal)=> {
            if (term===vsTerm) reinitTerm()
        }))


        disps.push(statusRight = vswin.createStatusBarItem(vs.StatusBarAlignment.Right, 12345))
        disps.push(statusLeft = vswin.createStatusBarItem(vs.StatusBarAlignment.Left, 0))
        statusLeft.color = 'white'
        statusLeft.command = 'zen.dbg.req'
        statusLeft.text = "ℤ..."
        statusLeft.tooltip = "Zentient status"
        statusLeft.show()
        statusRight.command = 'zen.dbg.req.zs'
        statusRight.text = ":"
        statusRight.tooltip = "Current byte offset"
        statusRight.show()


        vsreg = true
    }
}


export function displayPath (path: string) {
    if (vsproj.rootPath && path.startsWith(vsproj.rootPath))
        path = node_path.join("⋯", path.slice(vsproj.rootPath.length))
    else if (path.startsWith(homeDir))
        path = "~" + path.slice(homeDir.length)
    return path
}


export function quickPickOpt (desc: string):
vs.QuickPickOptions {
    return { placeHolder: desc, matchOnDescription: true, matchOnDetail: true }
}


export function onTick () {
    const   ed = vswin.activeTextEditor,
            td = ed  ?  ed.document  :  null
    if (td) {
        const curpos = ed.selection.active
        if ((!lastpos) || !curpos.isEqual(lastpos))
            statusRight.text = td.offsetAt(lastpos = curpos).toString()
    }
}



function onCmdCaps (title: string, desc: string, querymsg: string, cap: string) {
    return (ed: vs.TextEditor, _: vs.TextEditorEdit, ..._args: any[])=> {
        let zids = [ z.langZid(ed.document) ]
        if (!zids[0]) { zids = []  ;  for (const zid in z.langs) zids.push(zid) }
        const zidstr = zids.join(',')
        zpage.openUriInViewer(zpage.zenProtocolUrlFromQueryReq('cap', 'Capabilities', title + '/' + zidstr, querymsg + zidstr + ':' + cap + '#' + desc))
    }
}


function onCmdDirOpen (innewwindow: boolean) {
    return (uri: vs.Uri)=> vscmd.executeCommand('vscode.openFolder', uri ? uri : undefined, innewwindow) // vscode quirk: uri *may* be undefined (shows dialog) *but* not null (errors out)
}


function onCmdFolderFavs (innewwindow: boolean) {
    return ()=> {
        const   btnclose = zproj.now.toString(),
                btncustom = (zproj.now * 2).toString()

        let cfgdirs = vsproj.getConfiguration().get<string[]>("zen.favFolders", [])
        cfgdirs = cfgdirs.map( (d)=> (!d.startsWith('~'))  ?  d  :  node_path.join(homeDir, d.slice(1)) )
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
            dir = displayPath(dir)
            for (let i = 0; i < dir.length; i++) if (dir[i] == node_path.sep)
                dir = dir.slice(0, i) + ' ' + node_path.sep + ' ' + dir.slice(++i)
            return dir.toUpperCase()
        }
        const items = cfgdirs.map((dir)=>u.sliceWhileEndsWith(node_path.sep, dir)).map((dir)=>
            ({ isCloseAffordance: dir===btnclose, dirpath: dir,
                title: (dir===btnclose)  ?  "✕"  :  (dir===btncustom)  ?  "…"  :  ("❬ " + fmt(dir) + " ❭")  }))

        return vswin.showInformationMessage( "( Customize via `zen.favFolders` in any `settings.json`. )", ...items).then( (dirpick)=>
            ((!dirpick) || dirpick.dirpath===btnclose)  ?  u.thenDont()
                        :  dirpick.dirpath===btncustom  ?  u.thenDo(innewwindow ? 'zen.vse.dir.openNew' : 'zen.vse.dir.openHere')
                                                        :  u.thenDo(()=> { vscmd.executeCommand('vscode.openFolder', vs.Uri.file(dirpick.dirpath), innewwindow) })
        )
    }
}


export type SrcRefLocPick = { label: string, description: string, detail: string, loc: vs.Location }
function onCmdShowToolsMenu (kind: string, desc: string, jsonreqmsg: string, showmisc: boolean, ontoolpicked: (_kind: string, _zid: string, _tname: string, _pickedtool: vs.QuickPickItem, _req: zed.IntelReq, _defval: string)=>void) {
    if (!toolsLastDesc[kind]) toolsLastDesc[kind] = "(No " + desc + " were run during this session so far)"
    return ()=> {
    const ed = vswin.activeTextEditor, edsel = ed ? ed.selection : undefined, td = (ed ? ed.document : undefined), zid = (td ? z.langZid(td) : undefined)
    if (!zid)
        return vswin.showInformationMessage("Available in " + Array.from(z.edLangs()).join(" & ") + " documents.")
    let range = td.getWordRangeAtPosition(edsel.active)  ;  if (edsel.start.isBefore(edsel.end)) range = new vs.Range(edsel.start, edsel.end)
    let expr = range ? td.getText(range).trim() : undefined  ;  const tddp = displayPath(td.fileName)  ;  if (expr) {
        let i = expr.indexOf('\n')  ;  let exprsnip = i>0  ;  if (exprsnip) expr = expr.slice(0, i)
        if ((i = expr.indexOf('`')) > 0) { exprsnip = true  ;  expr = expr.slice(0, i) }
        if (expr.length>48) { exprsnip = true  ;  expr = expr.slice(0, 48) }  ;  if (exprsnip) expr = expr + "…"
    }
    return vswin.showQuickPick(zconn.requestJson(jsonreqmsg + zid).then((resp: vs.QuickPickItem[])=> {
        if (!resp) return []
        for (let i = 0 ; i < resp.length ; i++) { resp[i]['__zen__tname'] = resp[i].description  ;  resp[i].description = "" }
        if (showmisc) {
            if (expr) for (let i = 0 ; i < resp.length ; i++)
                resp[i].description = "`" + expr + "`"
            for (let i = 0 ; i < resp.length ; i++)
                if ((resp[i]['__zen__tname'] + '').startsWith("__"))
                    resp[i].description = " ❬for: " + tddp + "❭"
                else if (resp[i].description.length)
                    resp[i].description = " ❬for: " + resp[i].description + "❭"
                else
                    resp[i].description = " ❬for: current cursor position❭"
        } else for (let i = 0 ; i < resp.length ; i++) {
            const idx = resp[i].detail.indexOf("–")  ;  if (idx>0) {
                resp[i].description = " ➜ " + resp[i].detail.slice(0, idx).trim().replace(" ", " ")
                resp[i].detail = resp[i].detail.slice(idx)
            }
        }
        return resp
    }), quickPickOpt(desc + " ➜ " + (showmisc ? tddp : ("pick one, then enter input args next (default `" + expr + "`)")))).then((pickedtool)=> {
        if (pickedtool && pickedtool.detail) {
            const tname = pickedtool['__zen__tname'] + '', req = zed.coreIntelReq(td, edsel.active, tname)
            if (!edsel.isEmpty) {
                req['Pos1'] = td.offsetAt(edsel.start).toString()  ;  req['Pos2'] = td.offsetAt(edsel.end).toString()
            } else {
                delete(req['Pos1'])  ;  delete(req['Pos2'])
            }
            toolsLastDesc[kind] = pickedtool.label + " ➜ " + displayPath(req.Ffp) +  (tname.startsWith("__") ? "" :
                                    (" (" + (edsel.start.line+1) + "," + (edsel.start.character+1)
                                        + (edsel.isEmpty ? "" : (" - " + (edsel.end.line+1) + "," + (edsel.end.character+1)))
                                            + ")" + (expr ? (" – `" + expr + "`") : "")))
            if (ontoolpicked) ontoolpicked(kind, zid, tname, pickedtool, req, range ? td.getText(range) : '')
                else vswin.showWarningMessage(kind + "➜" + zid + "➜" + tname + "➜" + req.Ffp)
        }
    }) }
}
function onCmdIntelToolPicked (kind: string, zid: string, _tname: string, _pickedtool: vs.QuickPickItem, req: zed.IntelReq, _defval: string) {
    toolsLastResults_intel = []
    vswin.showQuickPick<SrcRefLocPick>( zconn.requestJson(zconn.REQ_TOOL_INTEL, [zid], req).then((resp: zlang.SrcMsg[])=> {
        let ret: SrcRefLocPick[] = []
        if (resp && resp.length) {
            ret = (toolsLastResults_intel = resp.map((sr: zlang.SrcMsg)=> {
                const haspos = sr.Pos1Ln && sr.Pos1Ch  ;  const posinfo = haspos ? (" (" + sr.Pos1Ln + "," + sr.Pos1Ch + ") ") : "  "
                return { label: sr.Msg, description: posinfo + displayPath(sr.Ref), detail: sr.Misc, loc: haspos ? zed.srcRefLoc(sr) : undefined } as SrcRefLocPick
            }))
        }
        return ret
    }, (fail)=> { z.out(fail)  ;  vswin.showWarningMessage(fail)  ;  return [] as SrcRefLocPick[] }), quickPickOpt(toolsLastDesc[kind]) ).then(onCmdIntelToolsResultPicked, z.outThrow)
}
function onCmdIntelToolsResultPicked (pick: SrcRefLocPick) {
    if (pick && pick.loc)
        if (pick.loc.uri.scheme.startsWith('http'))
            zpage.openUriInDefault(pick.loc.uri)
        else
            vsproj.openTextDocument(pick.loc.uri).then(vswin.showTextDocument, vswin.showErrorMessage).then((ed: vs.TextEditor)=> {
                if (ed) {
                    ed.revealRange(pick.loc.range, vs.TextEditorRevealType.InCenterIfOutsideViewport)
                    ed.selection = new vs.Selection(pick.loc.range.start, pick.loc.range.end)
                }
            })
}
function onCmdQueryToolPicked (_kind: string, zid: string, _tname: string, pt: vs.QuickPickItem, req: zed.IntelReq, defval: string) {
    if (!defval) defval = req['Sym1'] || ''
    vswin.showInputBox({ placeHolder: defval, ignoreFocusOut: true, prompt: pt.label + pt.description }).then((inargs: string)=> {
        if (inargs===undefined) console.log("cancelled")
        if (inargs==='') console.log("usedefval")
        if (inargs) zconn.requestJson(zconn.REQ_TOOL_QUERY, [zid], req).then((resp: zed.RespTxt)=> {
            for (const warn of resp.Warnings) vswin.showWarningMessage(warn)
            if (resp.Result) {
                const zid = Date.now().toString()
                zpage.toolContentPages[zid] = resp.Result
                zpage.openUriInViewer(zpage.zenProtocolUrlFromQueryReq('tool', resp.Id, '', zid))
            }
        })
    })
}



function onCmdTermFavs () {
    const   ed = vswin.activeTextEditor,
            fmtfile = (ed && ed.document.uri.scheme==="file")  ?  ed.document.fileName  :  "",
            fmtdir = node_path.dirname(fmtfile),
            fmtroot = vsproj.rootPath + "", // could be undefined but still need to replace placeholder
            btnclose = zproj.now.toString(),
            cmditems = vsproj.getConfiguration().get<string[]>("zen.termStickies", []).concat(btnclose),
            fmtcmd = u.strReplacer({ "${root}":fmtroot,  "${dir}":fmtdir,  "${file}":fmtfile }),
            fmttxt = u.strReplacer({ "${ROOT}":fmtroot,  "${DIR}":zproj.relPath(fmtdir),  "${FILE}":fmtfile  ?  zproj.relPath(fmtfile)  :  "" }),
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
