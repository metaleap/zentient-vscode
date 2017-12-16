import * as vs from 'vscode'
import vslang = vs.languages

import * as z from './zentient'
import * as zcfg from './vsc-settings'
import * as zsrc from './z-src'


const allDiags: { [_langId: string]: Items } = {},
    vsDiags: { [_langId: string]: vs.DiagnosticCollection } = {}


type Items = { [_filePath: string]: Item[] }

interface Item {
    ToolName: string
    FileRef: zsrc.Lens
    Message: string
}

export interface Resp {
    All: Items
    LangID: string
}


export function onActivate() {
    for (const langId of zcfg.langs())
        z.regDisp(vsDiags[langId] = vslang.createDiagnosticCollection(z.Z + " " + langId))
}

export function onDiags(msg: Resp) {
    allDiags[msg.LangID] = msg.All
    refreshVisibleDiags(msg.LangID)
}

export function refreshVisibleDiags(langId: string, hideFilePaths?: string[]) {
    const all = allDiags[langId], vsDiag = vsDiags[langId]

    vsDiag.clear()
    for (const filepath in all) if ((!hideFilePaths) || 1 > 0 || !hideFilePaths.includes(filepath)) {
        const td = z.findTextFile(filepath)
        if (td || 1 > 0) {
            const diags = all[filepath]
            if (diags && diags.length)
                vsDiag.set(vs.Uri.file(filepath), diags.map<vs.Diagnostic>(i => diagItem2VsDiag(i, td)))
        }
    }
}

export function diagItem2VsDiag(diag: Item, td: vs.TextDocument) {
    const vr = zsrc.toVsRange(diag.FileRef.r, td, diag.FileRef.p)
    const vd = new vs.Diagnostic(vr, diag.Message, diag.FileRef.fl)
    vd.source = diag.ToolName
    return vd
}
