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
    r: Range
    crlf: boolean
}

export type Range = {
    s: Pos  // Start
    e: Pos  // End
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
    cmpl: vs.CompletionItem[]
    hovs: IntelHover[]
    syms: RefLocMsg[]
    high: Range[]
    sig: vs.SignatureHelp
}

export type IntelHover = {
    value: string
    language: string
}


export function applyMod(td: vs.TextDocument, srcMod: Lens) {
    if (td && srcMod) {
        const edit = new vs.WorkspaceEdit()
        if (srcMod.ss) {
            const range = toVsRange(srcMod.r)
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

export function fromVsPos(vsPos: vs.Position, td?: vs.TextDocument) {
    const pos = { l: vsPos.line + 1, c: vsPos.character + 1 } as Pos
    if (td) pos.o = td.offsetAt(vsPos) + 1
    return pos
}

export function fromVsRange(vsRange: vs.Range, td?: vs.TextDocument) {
    return { s: fromVsPos(vsRange.start, td), e: fromVsPos(vsRange.end, td) } as Range
}

function toVsPos(pos: Pos, td?: vs.TextDocument) {
    if (pos.o && td && !(pos.l && pos.c))
        return td.positionAt(pos.o - 1)
    return new vs.Position(pos.l - 1, pos.c - 1)
}

export function toVsRange(r: Range, td?: vs.TextDocument) {
    return new vs.Range(toVsPos(r.s, td), toVsPos(r.e, td))
}

function refLocMsg2VsLoc(srcRefLocMsg: RefLocMsg) {
    const uri = srcRefLocMsg.Ref.includes('://') ? vs.Uri.parse(srcRefLocMsg.Ref) : vs.Uri.file(srcRefLocMsg.Ref)
    return new vs.Location(uri, new vs.Position(srcRefLocMsg.Pos1Ln - 1, srcRefLocMsg.Pos1Ch - 1))
}

export function refLocMsg2VsSym(srcRefLocMsg: RefLocMsg) {
    return new vs.SymbolInformation(srcRefLocMsg.Msg, srcRefLocMsg.Flag, srcRefLocMsg.Misc, refLocMsg2VsLoc(srcRefLocMsg))
}

function srcHov2VsMarkStr(hov: IntelHover) {
    if ((!hov.language) || hov.language === 'markdown') {
        const md = new vs.MarkdownString(hov.value)
        md.isTrusted = true
        return md
    } else
        return hov as vs.MarkedString
}

export function srcHovs2VsMarkStrs(hovs: IntelHover[]) {
    return hovs.map<vs.MarkedString>(srcHov2VsMarkStr)
}

export function srcMod2VsEdit(td: vs.TextDocument, srcMod: Lens, range?: vs.Range): vs.TextEdit {
    let edit: vs.TextEdit
    if (srcMod)
        if (srcMod.ss) {
            if (!range)
                range = toVsRange(srcMod.r)
            edit = new vs.TextEdit(range, srcMod.ss)
        } else {
            if (!range)
                range = new vs.Range(new vs.Position(0, 0), td.positionAt(td.getText().length))
            edit = new vs.TextEdit(range, srcMod.sf)
        }
    return edit
}

export function srcMods2VsEdit(srcMods: Lens[]): vs.WorkspaceEdit {
    const edit = new vs.WorkspaceEdit()
    srcMods.forEach(srcmod => {
        const range = srcmod.ss ? toVsRange(srcmod.r) : new vs.Range(new vs.Position(0, 0), new vs.Position(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER))
        edit.replace(vs.Uri.file(srcmod.fp), range, srcmod.ss ? srcmod.ss : srcmod.sf)
    })
    return edit
}
