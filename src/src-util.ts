import * as vs from 'vscode'
import vswin = vs.window

import * as u from './util'



export type Pos = {
    o: number // 1-based Offset
    l: number // 1-based Line
    c: number // 1-based Col
}

export type Lens = {
    fp: string  // FilePath
    sf: string  // SrcFull
    ss: string  // SrcSel
    p0: Pos
    p1: Pos
}



export function applyMod(td: vs.TextDocument, srcMod: Lens) {
    if (td && srcMod) {
        const edit = new vs.WorkspaceEdit()
        if (srcMod.ss) {
            const range = toVsRangeFrom(srcMod)
            edit.replace(td.uri, range, srcMod.ss)
        } else {
            const txt = td.getText()
            const range = new vs.Range(new vs.Position(0, 0), td.positionAt(txt.length))
            edit.replace(td.uri, range, srcMod.sf)
        }
        if (edit.size)
            vs.workspace.applyEdit(edit).then(editapplied => {
                if (!editapplied)
                    vswin.showWarningMessage("Edit not applied?!")
            }, u.onReject)
    }
}

// function fromVsOff(td: vs.TextDocument, o: number) {
//     const p = td.positionAt(o)
//     return { l: p.line + 1, c: p.character + 1, o: o } as Pos
// }

function fromVsPos(td: vs.TextDocument, p: vs.Position) {
    return { l: p.line + 1, c: p.character + 1, o: td.offsetAt(p) } as Pos
}

export function fromVsRange(td: vs.TextDocument, range: vs.Range, into: Lens) {
    into.p0 = fromVsPos(td, range.start)
    if (!range.isEmpty)
        into.p1 = fromVsPos(td, range.end)
}

function toVsPos(pos: Pos) {
    return new vs.Position(pos.l - 1, pos.c - 1)
}

function toVsRange(p1: Pos, p2: Pos) {
    return new vs.Range(toVsPos(p1), toVsPos(p2))
}

function toVsRangeFrom(lens: Lens) {
    return toVsRange(lens.p0, lens.p1)
}
