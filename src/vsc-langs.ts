import * as vs from 'vscode'
import vscmd = vs.commands
import vslang = vs.languages
import vswin = vs.window

import * as u from './util'

import * as z from './zentient'
import * as zcfg from './vsc-settings'
import * as zdiag from './z-diag'
import * as zipc_req from './ipc-req'
import * as zipc_resp from './ipc-resp'
import * as zsrc from './z-src'


const haveBackendSrcActions = false,
    completionCommitChars = ['(', ',', ')', '{', '}', '.', '[', ']', '<', '>', ':', '=', '|', '&', '!', '+', '-', '*', '/', '%', '$', '\\', '?', '`', ';', '#', '@', '~', '^', '·']

let tempFakeRefs: vs.Location[] = undefined


export function onActivate() {
    const langspecs = zcfg.langs().map(lang => ({ 'language': lang, 'scheme': 'file' } as vs.DocumentFilter))

    z.regDisp(
        vslang.registerCodeActionsProvider(langspecs, { provideCodeActions: onCodeActions }),
        vslang.registerDocumentFormattingEditProvider(langspecs, { provideDocumentFormattingEdits: onFormatFile }),
        vslang.registerDocumentRangeFormattingEditProvider(langspecs, { provideDocumentRangeFormattingEdits: onFormatRange }),
        vslang.registerHoverProvider(langspecs, { provideHover: onHover }),
        vslang.registerDocumentSymbolProvider(langspecs, { provideDocumentSymbols: onSymbolsInFile }),
        vslang.registerCompletionItemProvider(langspecs, { provideCompletionItems: onCompletionItems, resolveCompletionItem: onCompletionItemInfos }, '.'),
        vslang.registerDocumentHighlightProvider(langspecs, { provideDocumentHighlights: onHighlight }),
        vslang.registerSignatureHelpProvider(langspecs, { provideSignatureHelp: onSignature }, '(', ','),
        vslang.registerRenameProvider(langspecs, { provideRenameEdits: onRename }),
        vslang.registerReferenceProvider(langspecs, { provideReferences: onReferences }),
        vslang.registerDefinitionProvider(langspecs, { provideDefinition: onDef(zipc_req.IpcIDs.SRCINTEL_DEFSYM) }),
        vslang.registerTypeDefinitionProvider(langspecs, { provideTypeDefinition: onDef(zipc_req.IpcIDs.SRCINTEL_DEFTYPE) }),
        vslang.registerImplementationProvider(langspecs, { provideImplementation: onDef(zipc_req.IpcIDs.SRCINTEL_DEFIMPL) }),
        vslang.registerCodeLensProvider(langspecs, { provideCodeLenses: onLenses })
    )

    for (const langspec of langspecs)
        z.regDisp(vslang.registerWorkspaceSymbolProvider({ provideWorkspaceSymbols: onSymbolsInProj(langspec.language) }))
}

function onCodeActions(td: vs.TextDocument, range: vs.Range, ctx: vs.CodeActionContext, cancel: vs.CancellationToken): vs.ProviderResult<vs.Command[]> {
    const diagactions: vs.Command[] = []
    if (ctx && ctx.diagnostics && ctx.diagnostics.length) {
        for (const vsdiag of ctx.diagnostics) {
            const zactions = vsdiag[zdiag.VSDIAG_ZENPROPNAME_SRCACTIONS] as vs.Command[]
            if (zactions && zactions.length) {
                for (let i = 0; i < zactions.length; i++)
                    if (zactions[i].command === 'zen.internal.replaceText' && zactions[i].arguments && zactions[i].arguments.length === 2)
                        zactions[i].arguments.push(td, vsdiag.range)
                diagactions.push(...zactions)
            }
        }
    }

    if (!haveBackendSrcActions)
        return diagactions

    const onresp = (_langid: string, resp: zipc_resp.Msg): vs.Command[] => {
        if ((!cancel.isCancellationRequested) && resp && resp.srcActions && resp.srcActions.length)
            diagactions.push(...resp.srcActions)
        return diagactions
    }
    return zipc_req.forFile<vs.Command[]>(td, zipc_req.IpcIDs.SRCMOD_ACTIONS, undefined, onresp, undefined, range, undefined)
}

function onCompletionItemInfos(item: vs.CompletionItem, cancel: vs.CancellationToken): vs.ProviderResult<vs.CompletionItem> {
    const te = vswin.activeTextEditor
    if (te && te.document && te.selection && item && !(item.documentation && item.detail)) {
        const onresp = (_langid: string, resp: zipc_resp.Msg): vs.CompletionItem => {
            if ((!cancel.isCancellationRequested) && resp && resp.sI && resp.sI.Cmpl && resp.sI.Cmpl.length) {
                if (resp.sI.Cmpl[0].detail)
                    item.detail = resp.sI.Cmpl[0].detail
                const doc = resp.sI.Cmpl[0].documentation as vs.MarkdownString
                if ((!(item.documentation = doc)) || !doc.value)
                    item.documentation = " " // circumvents a display quirk in current-gen vsc
            }
            return item
        }
        const ipcargs = (item.insertText && typeof item.insertText === 'string') ? item.insertText : item.label
        return zipc_req.forEd<vs.CompletionItem>(te, zipc_req.IpcIDs.SRCINTEL_CMPL_DETAILS, ipcargs, onresp, te.document.getWordRangeAtPosition(te.selection.active), te.selection.active)
    }
    return item
}

function onCompletionItems(td: vs.TextDocument, pos: vs.Position, cancel: vs.CancellationToken): vs.ProviderResult<vs.CompletionItem[]> {
    const onresp = (_langid: string, resp: zipc_resp.Msg): vs.CompletionItem[] => {
        if ((!cancel.isCancellationRequested) && resp && resp.sI && resp.sI.Cmpl)
            return resp.sI.Cmpl.map<vs.CompletionItem>((c: vs.CompletionItem) => {
                c.commitCharacters = completionCommitChars
                return c
            })
        return undefined
    }
    return zipc_req.forFile<vs.CompletionItem[]>(td, zipc_req.IpcIDs.SRCINTEL_CMPL_ITEMS, undefined, onresp, undefined, undefined, pos)
}

function onDef(ipcId: zipc_req.IpcIDs) {
    return (td: vs.TextDocument, pos: vs.Position, cancel: vs.CancellationToken): vs.ProviderResult<vs.Definition> => {
        if (tempFakeRefs)
            return tempFakeRefs
        const onresp = onSymDefOrRef(cancel)
        return zipc_req.forFile<vs.Definition>(td, ipcId, undefined, onresp, undefined, undefined, pos)
    }
}

function onFormatFile(td: vs.TextDocument, opt: vs.FormattingOptions, cancel: vs.CancellationToken): vs.ProviderResult<vs.TextEdit[]> {
    return zipc_req.forFile<vs.TextEdit[]>(td, zipc_req.IpcIDs.SRCMOD_FMT_RUNONFILE, opt, onFormatRespSrcMod2VsEdits(td, cancel))
}

function onFormatRange(td: vs.TextDocument, range: vs.Range, opt: vs.FormattingOptions, cancel: vs.CancellationToken): vs.ProviderResult<vs.TextEdit[]> {
    return zipc_req.forFile<vs.TextEdit[]>(td, zipc_req.IpcIDs.SRCMOD_FMT_RUNONSEL, opt, onFormatRespSrcMod2VsEdits(td, cancel), undefined, range)
}

function onFormatRespSrcMod2VsEdits(td: vs.TextDocument, cancel: vs.CancellationToken, range?: vs.Range) {
    return (_langid: string, resp: zipc_resp.Msg): vs.TextEdit[] => {
        if (cancel.isCancellationRequested || !(resp && resp.srcMods && resp.srcMods.length))
            return undefined
        const edit = zsrc.mod2VsEdit(td, resp.srcMods[0], range)
        return edit ? [edit] : []
    }
}

function onHighlight(td: vs.TextDocument, pos: vs.Position, cancel: vs.CancellationToken): vs.ProviderResult<vs.DocumentHighlight[]> {
    const range = td.getWordRangeAtPosition(pos)
    let r: vs.Range
    const onresp = (_langid: string, resp: zipc_resp.Msg): vs.DocumentHighlight[] => {
        if ((!cancel.isCancellationRequested) && resp && resp.sI && resp.sI.Refs && resp.sI.Refs.length)
            if ((!zcfg.highlightMultipleOnly()) || resp.sI.Refs.length > 1
                || (range && (r = zsrc.toVsRange(resp.sI.Refs[0].r, td)) && r.contains(range) && !r.isEqual(range)))
                return resp.sI.Refs.map(r =>
                    new vs.DocumentHighlight(zsrc.toVsRange(r.r, td, r.p, true))
                )
        return undefined
    }

    return zipc_req.forFile<vs.DocumentHighlight[]>(td, zipc_req.IpcIDs.SRCINTEL_HIGHLIGHTS, range ? td.getText(range) : undefined, onresp, undefined, range, pos)
}

function onHover(td: vs.TextDocument, pos: vs.Position, cancel: vs.CancellationToken): vs.ProviderResult<vs.Hover> {
    const onresp = (_langid: string, resp: zipc_resp.Msg): vs.Hover => {
        if ((!cancel.isCancellationRequested) && resp && resp.sI && resp.sI.Info && resp.sI.Info.length)
            return new vs.Hover(zsrc.hovs2VsMarkStrs(resp.sI.Info))
        return undefined
    }
    return zipc_req.forFile<vs.Hover>(td, zipc_req.IpcIDs.SRCINTEL_HOVER, undefined, onresp, undefined, undefined, pos)
}

function onLenses(td: vs.TextDocument, cancel: vs.CancellationToken): vs.ProviderResult<vs.CodeLens[]> {
    const onresp = (_langid: string, resp: zipc_resp.Msg): vs.CodeLens[] => {
        if ((!cancel.isCancellationRequested) && resp) {
            // new vs.CodeLens(new vs.Range(2, 0, 2, 4), { title: "A demo CodeLens", command: "", tooltip: "Just to check it out" })
        }
        return undefined
    }
    return zipc_req.forFile<vs.CodeLens[]>(td, zipc_req.IpcIDs.SRCINTEL_INFOBITS, undefined, onresp)
}

function onReferences(td: vs.TextDocument, pos: vs.Position, ctx: vs.ReferenceContext, cancel: vs.CancellationToken): vs.ProviderResult<vs.Location[]> {
    const onresp = onSymDefOrRef(cancel)
    ctx.includeDeclaration = false
    return zipc_req.forFile<vs.Location[]>(td, zipc_req.IpcIDs.SRCINTEL_REFERENCES, ctx, onresp, undefined, undefined, pos)
}

function onRename(td: vs.TextDocument, pos: vs.Position, newName: string, cancel: vs.CancellationToken): vs.ProviderResult<vs.WorkspaceEdit> {
    const onresp = (_langid: string, resp: zipc_resp.Msg): vs.WorkspaceEdit => {
        if ((!cancel.isCancellationRequested) && resp)
            return (resp.srcMods && resp.srcMods.length) ? zsrc.mods2VsEdit(resp.srcMods) : new vs.WorkspaceEdit()
        return null
    }
    return zipc_req.forFile<vs.WorkspaceEdit>(td, zipc_req.IpcIDs.SRCMOD_RENAME, newName, onresp, undefined, undefined, pos)
}

function onSignature(td: vs.TextDocument, pos: vs.Position, cancel: vs.CancellationToken): vs.ProviderResult<vs.SignatureHelp> {
    const onresp = (_langid: string, resp: zipc_resp.Msg): vs.SignatureHelp => {
        if ((!cancel.isCancellationRequested) && resp && resp.sI && resp.sI.Sig)
            return resp.sI.Sig
        return undefined
    }
    return zipc_req.forFile<vs.SignatureHelp>(td, zipc_req.IpcIDs.SRCINTEL_SIGNATURE, undefined, onresp, undefined, undefined, pos)
}

function onSymbolsInFile(td: vs.TextDocument, cancel: vs.CancellationToken): vs.ProviderResult<vs.SymbolInformation[]> {
    const onresp = onSymbolsRespRefLocMsgs2VsSyms(cancel)
    return zipc_req.forFile<vs.SymbolInformation[]>(td, zipc_req.IpcIDs.SRCINTEL_SYMS_FILE, undefined, onresp)
}

function onSymbolsInProj(langId: string) {
    return (query: string, cancel: vs.CancellationToken): vs.ProviderResult<vs.SymbolInformation[]> => {
        const onresp = onSymbolsRespRefLocMsgs2VsSyms(cancel)
        return zipc_req.forLang<vs.SymbolInformation[]>(langId, zipc_req.IpcIDs.SRCINTEL_SYMS_PROJ, query, onresp)
    }
}

function onSymbolsRespRefLocMsgs2VsSyms(cancel: vs.CancellationToken) {
    return (_langid: string, resp: zipc_resp.Msg): vs.SymbolInformation[] => {
        if ((!cancel.isCancellationRequested) && resp && resp.sI && resp.sI.Syms && resp.sI.Syms.length)
            return resp.sI.Syms.map(zsrc.locRef2VsSym)
        return undefined
    }
}

export function onSymDefOrRef(cancel: vs.CancellationToken) {
    return (_langid: string, resp: zipc_resp.Msg): vs.Location[] => {
        if ((!cancel.isCancellationRequested) && resp && resp.sI && resp.sI.Refs && resp.sI.Refs.length)
            return resp.sI.Refs.map(zsrc.locRef2VsLoc)
        return undefined
    }
}

export function peekDefRefLocs(locs: vs.Location[], impls: boolean) {
    tempFakeRefs = locs
    vscmd.executeCommand('editor.action.' + (impls ? 'peekImplementation' : 'previewDeclaration')).then(() => {
        tempFakeRefs = undefined
    }, u.onReject)
}
