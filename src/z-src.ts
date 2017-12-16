import * as vs from 'vscode'
import vsproj = vs.workspace
import vswin = vs.window

import * as u from './util'


interface Range {
    s: Pos  // Start
    e: Pos  // End
}

export interface Pos {
    o: number // 1-based Offset
    l: number // 1-based Line
    c: number // 1-based Col
}

// corresponds to SrcLens on the Go (backend) side.
// used in both certain reqs & resps. a use-what-you-need-how-you-need-to a-la-carte type
export interface Lens {
    fp: string  // FilePath
    sf: string  // SrcFull (or longer text for that IpcID)
    ss: string  // SrcSel (or shorter text for that IpcID)
    p: Pos
    r: Range
    lf: boolean // CrLf
    fl: number  // Flag
}

export interface Intel {
    tips: InfoTip[]
    refs: Lens[]
}

export interface IntelResp extends Intel {
    sig: vs.SignatureHelp
    cmpl: vs.CompletionItem[]
    high: Range[]
}

interface InfoTip {
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

export function toVsRange(r: Range, td?: vs.TextDocument, p?: Pos) {
    if ((!r) && p) {
        const pos = toVsPos(p, td)
        return new vs.Range(pos, pos)
    }
    return new vs.Range(toVsPos(r.s, td), toVsPos(r.e, td))
}

export function locRef2VsLoc(srcLens: Lens) {
    const uri = srcLens.fp.includes('://') ? vs.Uri.parse(srcLens.fp) : vs.Uri.file(srcLens.fp)
    return new vs.Location(uri, srcLens.p ? toVsPos(srcLens.p) : toVsRange(srcLens.r))
}

export function locRef2VsSym(srcLens: Lens) {
    return new vs.SymbolInformation(srcLens.ss, srcLens.fl, srcLens.sf, locRef2VsLoc(srcLens))
}

export function mod2VsEdit(td: vs.TextDocument, srcMod: Lens, range?: vs.Range): vs.TextEdit {
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

export function mods2VsEdit(srcMods: Lens[]): vs.WorkspaceEdit {
    const edit = new vs.WorkspaceEdit()
    srcMods.forEach(srcmod => {
        const range = srcmod.ss ? toVsRange(srcmod.r) : new vs.Range(new vs.Position(0, 0), new vs.Position(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER))
        edit.replace(vs.Uri.file(srcmod.fp), range, srcmod.ss ? srcmod.ss : srcmod.sf)
    })
    return edit
}

function hov2VsMarkStr(hov: InfoTip) {
    if ((!hov.language) || hov.language === 'markdown') {
        const md = new vs.MarkdownString(hov.value)
        md.isTrusted = true
        return md
    } else
        return hov as vs.MarkedString
}

export function hovs2VsMarkStrs(hovs: InfoTip[]) {
    return hovs.map<vs.MarkedString>(hov2VsMarkStr)
}
