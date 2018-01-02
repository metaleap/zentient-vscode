import * as vs from 'vscode'
import vslang = vs.languages
import vswin = vs.window

import * as node_path from 'path'

import * as u from './util'

import * as z from './zentient'
import * as zcfg from './vsc-settings'
import * as zproj from './z-workspace'
import * as zsrc from './z-src'


export const VSDIAG_ZENPROPNAME_SRCACTIONS = 'zentientDiagSrcActions'

const allDiags: { [_langId: string]: Items } = {},
    vsDiags: { [_langId: string]: vs.DiagnosticCollection } = {}


type Items = { [_filePath: string]: Item[] }

interface Item {
    Cat: string
    Loc: zsrc.Loc
    Msg: string
    SrcActions: vs.Command[]
    Sticky: boolean
}

interface FixUps {
    FilePath: string
    Desc: { [_: string]: string[] }
    Edits: zsrc.ModEdit[]
    Dropped: zsrc.ModEdit[]
}

export interface Resp {
    All: Items
    LangID: string
    FixUps: FixUps[]
}


export function onActivate() {
    for (const langId of zcfg.langs())
        z.regDisp(vsDiags[langId] = vslang.createDiagnosticCollection(z.Z + langId))
}

export function onDiags(msg: Resp) {
    if (msg.All) {
        allDiags[msg.LangID] = msg.All
        refreshVisibleDiags(msg.LangID, [])
    }
    if (msg.FixUps && msg.FixUps.length)
        onFixUps(msg.FixUps)
}

function onFixUps(fixUps: FixUps[]) {
    for (const fixup of fixUps) {
        let numfixups: number = 0
        const fixupsummaries: string[] = []
        for (const kind in fixup.Desc) {
            fixupsummaries.push("**" + kind + "**: " + fixup.Desc[kind].join(" · "))
            numfixups += fixup.Desc[kind].length
        }
        vswin.showInformationMessage(`Apply ${numfixups - fixup.Dropped.length} fix-up(s) to __${node_path.basename(fixup.FilePath)}__? ➜ ` + fixupsummaries.join(" — "), "Yes, OK").then(btn => {
            if (!btn) return
            const te = z.findTextEditor(fixup.FilePath)
            if (!te)
                vswin.showWarningMessage("File is no longer open: " + fixup.FilePath)
            else if (te.document.eol !== vs.EndOfLine.LF)
                vswin.showWarningMessage("Fix-ups only work on LF files, but has CRLF: " + fixup.FilePath)
            else {
                te.edit(ted => {
                    for (const edit of fixup.Edits) {
                        const r = zsrc.toVsRange(edit.At, te.document, edit.At.s, false)
                        if (!edit.Val)
                            ted.delete(r)
                        else if (r.isEmpty)
                            ted.insert(r.start, edit.Val)
                        else
                            ted.replace(r, edit.Val)
                    }
                }).then(ok => {
                    if (!ok)
                        vswin.showWarningMessage(vs.env.appName + " refused to apply those edits. They might have conflicted with one another, or with current content or state.")
                    else
                        te.document.save()
                }, u.onReject)
            }
        }, u.onReject)
    }
}

export function refreshVisibleDiags(langId: string, hideFilePaths: string[]) {
    const all = allDiags[langId], vsDiag = vsDiags[langId]

    vsDiag.clear()
    if (!zproj.writesPending(langId))
        for (const filepath in all) {
            const td = z.findTextFile(filepath),
                diags = all[filepath]
            if (diags && diags.length)
                vsDiag.set(vs.Uri.file(filepath), diags
                    .filter(d => d.Sticky || (td && !hideFilePaths.includes(filepath)))
                    .map<vs.Diagnostic>(i => diagItem2VsDiag(i, td))
                )
        }
}

export function diagItem2VsDiag(diag: Item, td: vs.TextDocument) {
    const vr = zsrc.toVsRange(diag.Loc.r, td, diag.Loc.p)
    const vd = new vs.Diagnostic(vr, diag.Msg, diag.Loc.e)
    vd.source = (!diag.Cat) ? z.Z : `${z.Z} · ${diag.Cat}`
    if (diag.SrcActions && diag.SrcActions.length)
        vd[VSDIAG_ZENPROPNAME_SRCACTIONS] = diag.SrcActions
    return vd
}
