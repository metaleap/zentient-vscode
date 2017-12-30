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
    f: string   // FilePath
    t: string   // Txt (src-full, or longer text for that IpcID)
    s: string   // Str (src-sel, sym name, or shorter text for that IpcID)
    p: Pos
    r: Range
    l: boolean  // CrLf
    e: number   // enumish Flag: vs.SymbolKind | vs.DiagnosticSeverity
}

export interface Intel {
    Info: InfoTip[]
    Refs: Lens[]
}

export interface IntelResp extends Intel {
    Sig: vs.SignatureHelp
    Cmpl: vs.CompletionItem[]
}

interface InfoTip {
    value: string
    language: string
}


export function applyMod(td: vs.TextDocument, srcMod: Lens) {
    if (td && srcMod) {
        const edit = new vs.WorkspaceEdit()
        if (srcMod.s) {
            const range = toVsRange(srcMod.r)
            edit.replace(td.uri, range, srcMod.s)
        } else {
            const txt = td.getText()
            const range = new vs.Range(new vs.Position(0, 0), td.positionAt(txt.length))
            edit.replace(td.uri, range, srcMod.t)
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

export function toVsRange(r: Range, td?: vs.TextDocument, p?: Pos, preferWordRange?: boolean) {
    if ((!r) && p) {
        const pos = toVsPos(p, td)
        return (preferWordRange && td) ? (td.getWordRangeAtPosition(pos)) : new vs.Range(pos, pos)
    }
    return new vs.Range(toVsPos(r.s, td), toVsPos(r.e, td))
}

export function locRef2VsLoc(srcLens: Lens) {
    const uri = srcLens.f.includes('://') ? vs.Uri.parse(srcLens.f) : vs.Uri.file(srcLens.f)
    return new vs.Location(uri, srcLens.r ? toVsRange(srcLens.r) : (srcLens.p ? toVsPos(srcLens.p) : new vs.Position(0, 0)))
}

export function locRef2VsSym(srcLens: Lens) {
    return new vs.SymbolInformation(srcLens.s, srcLens.e, srcLens.t, locRef2VsLoc(srcLens))
}

export function mod2VsEdit(td: vs.TextDocument, srcMod: Lens, range?: vs.Range): vs.TextEdit {
    let edit: vs.TextEdit
    if (srcMod)
        if (srcMod.s) {
            if (!range)
                range = toVsRange(srcMod.r)
            edit = new vs.TextEdit(range, srcMod.s)
        } else {
            if (!range)
                range = new vs.Range(new vs.Position(0, 0), td.positionAt(td.getText().length))
            edit = new vs.TextEdit(range, srcMod.t)
        }
    return edit
}

export function mods2VsEdit(srcMods: Lens[]): vs.WorkspaceEdit {
    const edit = new vs.WorkspaceEdit()
    srcMods.forEach(srcmod => {
        const range = srcmod.s ? toVsRange(srcmod.r) : new vs.Range(new vs.Position(0, 0), new vs.Position(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER))
        edit.replace(vs.Uri.file(srcmod.f), range, srcmod.s ? srcmod.s : srcmod.t)
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

export function openSrcFileAtPos(filePathWithPos: string) {
    if (filePathWithPos) {
        const parts = filePathWithPos.split(':')
        let fpath = filePathWithPos, posln = 1, poscol = 1, try1 = true
        if (parts.length > 2) {
            try1 = false
            fpath = parts.slice(0, parts.length - 2).join(':')
            try {
                const maybecol = parseInt(parts[parts.length - 1])
                if (maybecol) poscol = maybecol
                const maybeln = parseInt(parts[parts.length - 2])
                if (maybeln) posln = maybeln
            } catch (_) { try1 = true }
        }
        if (try1 && (parts.length > 1)) {
            fpath = parts.slice(0, parts.length - 1).join(':')
            try {
                const maybeln = parseInt(parts[parts.length - 1])
                if (maybeln) posln = maybeln
            } catch (_) { }
        }
        const pos: Pos = { l: posln, c: poscol, o: 0 }
        vsproj.openTextDocument(fpath).then(
            td => vs.window.showTextDocument(td, { selection: toVsRange(undefined, td, pos) }),
            u.onReject
        )
    }
}
