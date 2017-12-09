import * as vs from 'vscode'
import vslang = vs.languages
import vswin = vs.window

import * as z from './zentient'
import * as zcfg from './vsc-settings'
import * as zipc_req from './ipc-msg-req'
import * as zipc_resp from './ipc-msg-resp'
import * as zsrc from './z-src'


export function onActivate() {
    const langids = zcfg.langs()

    z.regDisp(vslang.registerCodeActionsProvider(langids, { provideCodeActions: onCodeActions }))
    z.regDisp(vslang.registerDocumentFormattingEditProvider(langids, { provideDocumentFormattingEdits: onFormatFile }))
    z.regDisp(vslang.registerDocumentRangeFormattingEditProvider(langids, { provideDocumentRangeFormattingEdits: onFormatRange }))
    z.regDisp(vslang.registerHoverProvider(langids, { provideHover: onHover }))
    z.regDisp(vslang.registerDocumentSymbolProvider(langids, { provideDocumentSymbols: onSymbolsInFile }))
    z.regDisp(vslang.registerCompletionItemProvider(langids, { provideCompletionItems: onCompletionItems, resolveCompletionItem: onCompletionItemInfos }, '.'))
    z.regDisp(vslang.registerDocumentHighlightProvider(langids, { provideDocumentHighlights: onHighlight }))
    z.regDisp(vslang.registerSignatureHelpProvider(langids, { provideSignatureHelp: onSignature }, '(', ','))
    z.regDisp(vslang.registerRenameProvider(langids, { provideRenameEdits: onRename }))
    z.regDisp(vslang.registerReferenceProvider(langids, { provideReferences: onReferences }))
    z.regDisp(vslang.registerDefinitionProvider(langids, { provideDefinition: onDef(zipc_req.IpcIDs.srcIntel_DefSym) }))
    z.regDisp(vslang.registerTypeDefinitionProvider(langids, { provideTypeDefinition: onDef(zipc_req.IpcIDs.srcIntel_DefType) }))
    z.regDisp(vslang.registerImplementationProvider(langids, { provideImplementation: onDef(zipc_req.IpcIDs.srcIntel_DefImpl) }))

    for (const langid of langids)
        z.regDisp(vslang.registerWorkspaceSymbolProvider({ provideWorkspaceSymbols: onSymbolsInProj(langid) }))
}

function onCodeActions(td: vs.TextDocument, range: vs.Range, _ctx: vs.CodeActionContext, cancel: vs.CancellationToken): vs.ProviderResult<vs.Command[]> {
    const onresp = (_langid: string, resp: zipc_resp.Msg): vs.Command[] => {
        if ((!cancel.isCancellationRequested) && resp && resp.srcActions && resp.srcActions.length)
            return resp.srcActions
        return []
    }
    return zipc_req.forFile<vs.Command[]>(td, zipc_req.IpcIDs.srcMod_Actions, undefined, onresp, undefined, range, undefined)
}

function onCompletionItemInfos(item: vs.CompletionItem, cancel: vs.CancellationToken): vs.ProviderResult<vs.CompletionItem> {
    const te = vswin.activeTextEditor
    if (te && item && !(item.documentation && item.detail)) {
        const onresp = (_langid: string, resp: zipc_resp.Msg): vs.CompletionItem => {
            if ((!cancel.isCancellationRequested) && resp && resp.srcIntel && resp.srcIntel.cmpl && resp.srcIntel.cmpl.length) {
                item.detail = resp.srcIntel.cmpl[0].detail
                item.documentation = resp.srcIntel.cmpl[0].documentation
            }
            return item
        }
        const ipcargs = (item.insertText && typeof item.insertText === 'string') ? item.insertText : item.label
        return zipc_req.forEd<vs.CompletionItem>(te, zipc_req.IpcIDs.srcIntel_CmplDetails, ipcargs, onresp, undefined, te.selection.active)
    }
    return item
}

function onCompletionItems(td: vs.TextDocument, pos: vs.Position, cancel: vs.CancellationToken): vs.ProviderResult<vs.CompletionItem[]> {
    const onresp = (_langid: string, resp: zipc_resp.Msg): vs.CompletionItem[] => {
        if ((!cancel.isCancellationRequested) && resp && resp.srcIntel)
            return resp.srcIntel.cmpl
        return undefined
    }
    return zipc_req.forFile<vs.CompletionItem[]>(td, zipc_req.IpcIDs.srcIntel_CmplItems, undefined, onresp, undefined, undefined, pos)
}

function onDef(ipcId: zipc_req.IpcIDs) {
    return (td: vs.TextDocument, pos: vs.Position, cancel: vs.CancellationToken): vs.ProviderResult<vs.Definition> => {
        const onresp = onSymDefOrRef(cancel)
        return zipc_req.forFile<vs.Definition>(td, ipcId, undefined, onresp, undefined, undefined, pos)
    }
}

function onFormatFile(td: vs.TextDocument, opt: vs.FormattingOptions, cancel: vs.CancellationToken): vs.ProviderResult<vs.TextEdit[]> {
    return zipc_req.forFile<vs.TextEdit[]>(td, zipc_req.IpcIDs.srcMod_Fmt_RunOnFile, opt, onFormatRespSrcMod2VsEdits(td, cancel))
}

function onFormatRange(td: vs.TextDocument, range: vs.Range, opt: vs.FormattingOptions, cancel: vs.CancellationToken): vs.ProviderResult<vs.TextEdit[]> {
    return zipc_req.forFile<vs.TextEdit[]>(td, zipc_req.IpcIDs.srcMod_Fmt_RunOnSel, opt, onFormatRespSrcMod2VsEdits(td, cancel), undefined, range)
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
    const onresp = (_langid: string, resp: zipc_resp.Msg): vs.DocumentHighlight[] => {
        if ((!cancel.isCancellationRequested) && resp && resp.srcIntel && resp.srcIntel.high && resp.srcIntel.high.length)
            return resp.srcIntel.high.map(r => {
                return new vs.DocumentHighlight(zsrc.toVsRange(r, td))
            })
        return undefined
    }
    return zipc_req.forFile<vs.DocumentHighlight[]>(td, zipc_req.IpcIDs.srcIntel_Highlights, range ? td.getText(range) : undefined, onresp, undefined, range, pos)
}

function onHover(td: vs.TextDocument, pos: vs.Position, cancel: vs.CancellationToken): vs.ProviderResult<vs.Hover> {
    const onresp = (_langid: string, resp: zipc_resp.Msg): vs.Hover => {
        if ((!cancel.isCancellationRequested) && resp && resp.srcIntel && resp.srcIntel.tips && resp.srcIntel.tips.length)
            return new vs.Hover(zsrc.hovs2VsMarkStrs(resp.srcIntel.tips))
        return undefined
    }
    return zipc_req.forFile<vs.Hover>(td, zipc_req.IpcIDs.srcIntel_Hover, undefined, onresp, undefined, undefined, pos)
}

function onReferences(td: vs.TextDocument, pos: vs.Position, ctx: vs.ReferenceContext, cancel: vs.CancellationToken): vs.ProviderResult<vs.Location[]> {
    const onresp = onSymDefOrRef(cancel)
    ctx.includeDeclaration = false
    return zipc_req.forFile<vs.Location[]>(td, zipc_req.IpcIDs.srcIntel_References, ctx, onresp, undefined, undefined, pos)
}

function onRename(td: vs.TextDocument, pos: vs.Position, newName: string, cancel: vs.CancellationToken): vs.ProviderResult<vs.WorkspaceEdit> {
    const onresp = (_langid: string, resp: zipc_resp.Msg): vs.WorkspaceEdit => {
        if ((!cancel.isCancellationRequested) && resp)
            return (resp.srcMods && resp.srcMods.length) ? zsrc.mods2VsEdit(resp.srcMods) : new vs.WorkspaceEdit()
        return null
    }
    return zipc_req.forFile<vs.WorkspaceEdit>(td, zipc_req.IpcIDs.srcMod_Rename, newName, onresp, undefined, undefined, pos)
}

function onSignature(td: vs.TextDocument, pos: vs.Position, cancel: vs.CancellationToken): vs.ProviderResult<vs.SignatureHelp> {
    const onresp = (_langid: string, resp: zipc_resp.Msg): vs.SignatureHelp => {
        if ((!cancel.isCancellationRequested) && resp && resp.srcIntel && resp.srcIntel.sig)
            return resp.srcIntel.sig
        return undefined
    }
    return zipc_req.forFile<vs.SignatureHelp>(td, zipc_req.IpcIDs.srcIntel_Signature, undefined, onresp, undefined, undefined, pos)
}

function onSymbolsInFile(td: vs.TextDocument, cancel: vs.CancellationToken): vs.ProviderResult<vs.SymbolInformation[]> {
    const onresp = onSymbolsRespRefLocMsgs2VsSyms(cancel)
    return zipc_req.forFile<vs.SymbolInformation[]>(td, zipc_req.IpcIDs.srcIntel_SymsFile, undefined, onresp)
}

function onSymbolsInProj(langId: string) {
    return (query: string, cancel: vs.CancellationToken): vs.ProviderResult<vs.SymbolInformation[]> => {
        const onresp = onSymbolsRespRefLocMsgs2VsSyms(cancel)
        return zipc_req.forLang<vs.SymbolInformation[]>(langId, zipc_req.IpcIDs.srcIntel_SymsProj, query, onresp)
    }
}

function onSymbolsRespRefLocMsgs2VsSyms(cancel: vs.CancellationToken) {
    return (_langid: string, resp: zipc_resp.Msg): vs.SymbolInformation[] => {
        if ((!cancel.isCancellationRequested) && resp && resp.srcIntel && resp.srcIntel.refs && resp.srcIntel.refs.length)
            return resp.srcIntel.refs.map(zsrc.locRef2VsSym)
        return undefined
    }
}

export function onSymDefOrRef(cancel: vs.CancellationToken) {
    return (_langid: string, resp: zipc_resp.Msg): vs.Location[] => {
        if ((!cancel.isCancellationRequested) && resp && resp.srcIntel && resp.srcIntel.refs && resp.srcIntel.refs.length)
            return resp.srcIntel.refs.map(zsrc.locRef2VsLoc)
        return undefined
    }
}
