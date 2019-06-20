import * as vs from 'vscode'
import vsproj = vs.workspace
import vswin = vs.window

import * as u from './util'
import * as z from './zentient'
import * as zvscmd from './vsc-commands'


interface Range {
    s: Pos  // Start
    e: Pos  // End
}

export interface ModEdit {
    At: Range
    Val: string
}

export interface Pos {
    o: number // 1-based Offset
    l: number // 1-based Line
    c: number // 1-based Col
}

export interface Loc {
    e: number   // enumish Flag: vs.SymbolKind | vs.DiagnosticSeverity
    f: string   // FilePath
    p: Pos
    r: Range
}

// corresponds to SrcLens on the Go (backend) side.
// used in both certain reqs & resps. a use-what-you-need-how-you-need-to a-la-carte type
export interface Lens extends Loc {
    t: string   // Txt (src-full, or longer text for that IpcID)
    s: string   // Str (src-sel, sym name, or shorter text for that IpcID)
    l: boolean  // CrLf
}

export interface Intel {
    Info: InfoTip[]
    Refs: Loc[]
}

export interface IntelResp extends Intel {
    Sig: vs.SignatureHelp
    Syms: Lens[]
    Cmpl: vs.CompletionItem[]
}

interface InfoTip {
    value: string
    language: string
}


export function onActivate() {
    zvscmd.ensure('zen.internal.openFileAt', openSrcFileAtPos)
    zvscmd.ensure('zen.internal.replaceText', replaceTextFromTo)
}


export function applyMod(td: vs.TextDocument, srcMod: Lens) {
    if (td && srcMod) {
        const edit = new vs.WorkspaceEdit()
        if (srcMod.s) {
            const range = toVsRange(srcMod.r)
            const old = td.getText(range)
            if (old !== srcMod.s)
                edit.replace(td.uri, range, srcMod.s)
        } else {
            const old = td.getText()
            if (old !== srcMod.t) {
                const range = new vs.Range(new vs.Position(0, 0), td.positionAt(old.length))
                edit.replace(td.uri, range, srcMod.t)
            }
        }
        if (edit.size)
            vsproj.applyEdit(edit).then(editapplied => {
                if (!editapplied)
                    vswin.showWarningMessage(`${vs.env.appName} refused to apply ${edit.size} edit(s) to ${srcMod.f}.`)
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
    if (r && r.e && !(r.e.c || r.e.l || r.e.o))
        r.e = r.s
    let range: vs.Range
    if ((!r) && p) {
        const pos = toVsPos(p, td)
        if (preferWordRange && td) range = td.getWordRangeAtPosition(pos)
        if (!range) range = new vs.Range(pos, pos)
    } else {
        range = new vs.Range(toVsPos(r.s, td), toVsPos(r.e, td))
        if (p && ((!range.end) || (!range.start) || isNaN(range.start.line) || isNaN(range.start.character) || isNaN(range.end.line) || isNaN(range.end.character))) {
            const pos = toVsPos(p, td)
            range = new vs.Range(pos, pos)
        }
    }
    return range
}

export function locRef2VsLoc(srcLoc: Loc) {
    const uri = srcLoc.f.includes('://') ? vs.Uri.parse(srcLoc.f) : vs.Uri.file(srcLoc.f)
    return new vs.Location(uri, srcLoc.r ? toVsRange(srcLoc.r) : (srcLoc.p ? toVsPos(srcLoc.p) : new vs.Position(0, 0)))
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
            const old = td.getText(range)
            if (old !== srcMod.s)
                edit = new vs.TextEdit(range, srcMod.s)
        } else {
            const old = td.getText()
            if (old !== srcMod.t) {
                if (!range)
                    range = new vs.Range(new vs.Position(0, 0), td.positionAt(old.length))
                edit = new vs.TextEdit(range, srcMod.t)
            }
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

function replaceTextFromTo(from: string, to: string, td: vs.TextDocument, range: vs.Range) {
    if (from && to && range && td && td.uri && td.uri.fsPath) {
        const te = z.findTextEditor(td.uri.fsPath)
        if (te)
            te.edit(ted => ted.replace(range, to)).then(ok => {
                if (ok) te.document.save()
            }, u.onReject)
    }
}
