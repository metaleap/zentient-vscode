import * as vs from 'vscode'
import vsproj = vs.workspace
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
    p: Pos
    r0: Pos
    r1: Pos
}

export type RefLocMsg = {
    Ref: string
    Msg: string
    Misc: string
    Pos1Ln: number
    Pos1Ch: number
    Pos2Ln: number
    Pos2Ch: number
    Flag: number
    Data: { [_: string]: any }
}

export type Intel = {
    hovs: IntelHover[]
    syms: RefLocMsg[]
}

export type IntelHover = {
    value: string
    language: string
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
            vsproj.applyEdit(edit).then(editapplied => {
                if (!editapplied)
                    vswin.showWarningMessage("Edit not applied?!")
            }, u.onReject)
    }
}

// function fromVsOff(td: vs.TextDocument, o: number) {
//     const p = td.positionAt(o)
//     return { l: p.line + 1, c: p.character + 1, o: o } as Pos
// }

export function fromVsPos(td: vs.TextDocument, p: vs.Position) {
    return { l: p.line + 1, c: p.character + 1, o: td.offsetAt(p) } as Pos
}

export function fromVsRange(td: vs.TextDocument, range: vs.Range, into: Lens) {
    into.r0 = fromVsPos(td, range.start)
    if (!range.isEmpty)
        into.r1 = fromVsPos(td, range.end)
}

function toVsPos(pos: Pos) {
    return new vs.Position(pos.l - 1, pos.c - 1)
}

function toVsRange(p1: Pos, p2: Pos) {
    return new vs.Range(toVsPos(p1), toVsPos(p2))
}

function toVsRangeFrom(lens: Lens) {
    return toVsRange(lens.r0, lens.r1)
}

function refLocMsg2VsLoc(srcRefLocMsg: RefLocMsg) {
    const uri = srcRefLocMsg.Ref.includes('://') ? vs.Uri.parse(srcRefLocMsg.Ref) : vs.Uri.file(srcRefLocMsg.Ref)
    return new vs.Location(uri, new vs.Position(srcRefLocMsg.Pos1Ln - 1, srcRefLocMsg.Pos1Ch - 1))
}

export function refLocMsg2VsSym(srcRefLocMsg: RefLocMsg) {
    return new vs.SymbolInformation(srcRefLocMsg.Msg, srcRefLocMsg.Flag, srcRefLocMsg.Misc, refLocMsg2VsLoc(srcRefLocMsg))
}

function srcHovToVsMarkStr(hov: IntelHover) {
    if ((!hov.language) || hov.language === 'markdown')
        return new vs.MarkdownString(hov.value)
    else {
        return hov as vs.MarkedString
    }
}

export function srcHovsToVsMarkStrs(hovs: IntelHover[]) {
    return hovs.map<vs.MarkedString>(srcHovToVsMarkStr)
}

export function srcModToVsEdit(td: vs.TextDocument, srcMod: Lens, range?: vs.Range) {
    let edit: vs.TextEdit
    if (srcMod)
        if (srcMod.ss) {
            if (!range)
                range = toVsRangeFrom(srcMod)
            edit = new vs.TextEdit(range, srcMod.ss)
        } else {
            if (!range)
                range = new vs.Range(new vs.Position(0, 0), td.positionAt(td.getText().length))
            edit = new vs.TextEdit(range, srcMod.sf)
        }
    return edit
}
