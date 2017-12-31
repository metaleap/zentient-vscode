import * as vs from 'vscode'
import vslang = vs.languages

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
    Loc: zsrc.Lens
    Msg: string
    SrcActions: vs.Command[]
    Sticky: boolean
}

export interface Resp {
    All: Items
    LangID: string
}


export function onActivate() {
    for (const langId of zcfg.langs())
        z.regDisp(vsDiags[langId] = vslang.createDiagnosticCollection(z.Z + langId))
}

export function onDiags(msg: Resp) {
    allDiags[msg.LangID] = msg.All
    refreshVisibleDiags(msg.LangID, [])
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
