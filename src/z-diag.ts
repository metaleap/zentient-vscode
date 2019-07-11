import * as vs from 'vscode'
import vslang = vs.languages
import vsproj = vs.workspace
import vswin = vs.window

import * as node_path from 'path'

import * as u from './util'

import * as z from './zentient'
import * as zcfg from './vsc-settings'
import * as zipc from './ipc-protocol-msg-types'
import * as zproj from './z-workspace'
import * as zsrc from './z-src'


export const VSDIAG_ZENPROPNAME_SRCACTIONS = 'zentientDiagSrcActions'

const allDiags: { [_langId: string]: zipc.DiagItems } = {},
    vsDiags: { [_langId: string]: vs.DiagnosticCollection } = {}


export function onActivate() {
    for (const langId of zcfg.langs())
        z.regDisp(vsDiags[langId] = vslang.createDiagnosticCollection(z.Z + langId))
}

export function onDiags(msg: zipc.Diags) {
    if (msg.All) {
        allDiags[msg.LangID] = msg.All
        refreshVisibleDiags(msg.LangID, [])
    }
    if (msg.FixUps && msg.FixUps.length)
        onFixUps(msg.FixUps)
}

function onFixUps(fixUps: zipc.DiagFixUps[]) {
    for (const fixup of fixUps) {
        let numfixups: number = 0
        const fixupsummaries: string[] = []
        for (const kind in fixup.Desc) {
            fixupsummaries.push(kind + ": " + u.strUniques(fixup.Desc[kind]).join(" · "))
            numfixups += fixup.Desc[kind].length
        }
        vswin.showInformationMessage(`Apply ${numfixups - fixup.Dropped.length} fix-up(s) to ${node_path.basename(fixup.FilePath)}? ➜ ` + fixupsummaries.join(" — "), "Yes, OK").then(btn => {
            if (!btn) return
            vsproj.openTextDocument(fixup.FilePath).then(td => {
                if (!td)
                    vswin.showWarningMessage("Failed to open: " + fixup.FilePath)
                else if (td.eol !== vs.EndOfLine.LF)
                    vswin.showWarningMessage("Fix-ups only work on LF files, but has CRLF: " + fixup.FilePath)
                else vswin.showTextDocument(td).then(te => {
                    if (!te)
                        vswin.showWarningMessage("Failed to open: " + fixup.FilePath)
                    else
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
                                vswin.showWarningMessage(vs.env.appName + " refused to apply those edits. Maybe they conflicted with one another, or with current file content, recent changes or editing state.")
                            else
                                te.document.save()
                        }, u.onReject)
                }, u.onReject)
            }, u.onReject)
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
                    .map<vs.Diagnostic>(diagitem => diagItem2VsDiag(diagitem, td))
                )
        }
}

export function diagItem2VsDiag(diag: zipc.DiagItem, td: vs.TextDocument) {
    const vr = zsrc.toVsRange(diag.Loc.r, td, diag.Loc.p, true)
    const vd = new vs.Diagnostic(vr, diag.Msg, diag.Loc.e)
    vd.tags = diag.Tags
    vd.source = (!diag.Cat) ? z.Z : `${z.Z} · ${diag.Cat}`
    if (diag.SrcActions && diag.SrcActions.length)
        vd[VSDIAG_ZENPROPNAME_SRCACTIONS] = diag.SrcActions
    return vd
}
