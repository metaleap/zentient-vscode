import * as vs from 'vscode'
import vslang = vs.languages
import vswin = vs.window

import * as z from './zentient'
import * as zcfg from './vsc-settings'
import * as zipc_req from './ipc-msg-req'
import * as zipc_resp from './ipc-msg-resp'
import * as zsrc from './src-util'


export function onActivate() {
    for (const langid in zcfg.langProgs()) {
        z.regDisp(vslang.registerDocumentFormattingEditProvider(langid, { provideDocumentFormattingEdits: onFormatFile }))
        z.regDisp(vslang.registerDocumentRangeFormattingEditProvider(langid, { provideDocumentRangeFormattingEdits: onFormatRange }))
        z.regDisp(vslang.registerHoverProvider(langid, { provideHover: onHover }))
        z.regDisp(vslang.registerDocumentSymbolProvider(langid, { provideDocumentSymbols: onSymbolsInFile }))
        z.regDisp(vslang.registerWorkspaceSymbolProvider({ provideWorkspaceSymbols: onSymbolsInDir(langid) }))
        z.regDisp(vslang.registerCompletionItemProvider(langid, { provideCompletionItems: onCompletionItems, resolveCompletionItem: onCompletionItemInfos }, '.'))
        z.regDisp(vslang.registerDocumentHighlightProvider(langid, { provideDocumentHighlights: onHighlight }))
        z.regDisp(vslang.registerSignatureHelpProvider(langid, { provideSignatureHelp: onSignature }, '(', ','))
        z.regDisp(vslang.registerRenameProvider(langid, { provideRenameEdits: onRename }))
    }
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
        const msgargs = (item.insertText && typeof item.insertText === 'string') ? item.insertText : item.label
        return zipc_req.forEd<vs.CompletionItem>(te, zipc_req.MsgIDs.srcIntel_CmplDetails, msgargs, onresp, undefined, te.selection.active)
    }
    return item
}

function onCompletionItems(td: vs.TextDocument, pos: vs.Position, cancel: vs.CancellationToken): vs.ProviderResult<vs.CompletionItem[]> {
    const onresp = (_langid: string, resp: zipc_resp.Msg): vs.CompletionItem[] => {
        if ((!cancel.isCancellationRequested) && resp && resp.srcIntel)
            return resp.srcIntel.cmpl
        return undefined
    }
    return zipc_req.forFile<vs.CompletionItem[]>(td, zipc_req.MsgIDs.srcIntel_CmplItems, undefined, onresp, undefined, undefined, pos)
}

function onFormatFile(td: vs.TextDocument, opt: vs.FormattingOptions, cancel: vs.CancellationToken): vs.ProviderResult<vs.TextEdit[]> {
    return zipc_req.forFile<vs.TextEdit[]>(td, zipc_req.MsgIDs.srcMod_Fmt_RunOnFile, opt, onFormatRespSrcMod2VsEdits(td, cancel))
}

function onFormatRange(td: vs.TextDocument, range: vs.Range, opt: vs.FormattingOptions, cancel: vs.CancellationToken): vs.ProviderResult<vs.TextEdit[]> {
    return zipc_req.forFile<vs.TextEdit[]>(td, zipc_req.MsgIDs.srcMod_Fmt_RunOnSel, opt, onFormatRespSrcMod2VsEdits(td, cancel), undefined, range)
}

function onFormatRespSrcMod2VsEdits(td: vs.TextDocument, cancel: vs.CancellationToken, range?: vs.Range) {
    return (_langid: string, resp: zipc_resp.Msg): vs.TextEdit[] => {
        if (cancel.isCancellationRequested || !(resp && resp.srcMods && resp.srcMods.length))
            return undefined
        const edit = zsrc.srcMod2VsEdit(td, resp.srcMods[0], range)
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
    return zipc_req.forFile<vs.DocumentHighlight[]>(td, zipc_req.MsgIDs.srcIntel_Highlights, range ? td.getText(range) : undefined, onresp, undefined, range, pos)
}

function onHover(td: vs.TextDocument, pos: vs.Position, cancel: vs.CancellationToken): vs.ProviderResult<vs.Hover> {
    const onresp = (_langid: string, resp: zipc_resp.Msg): vs.Hover => {
        if ((!cancel.isCancellationRequested) && resp && resp.srcIntel && resp.srcIntel.hovs && resp.srcIntel.hovs.length)
            return new vs.Hover(zsrc.srcHovs2VsMarkStrs(resp.srcIntel.hovs))
        return undefined
    }
    return zipc_req.forFile<vs.Hover>(td, zipc_req.MsgIDs.srcIntel_Hover, undefined, onresp, undefined, undefined, pos)
}

function onRename(td: vs.TextDocument, pos: vs.Position, newName: string, cancel: vs.CancellationToken): vs.ProviderResult<vs.WorkspaceEdit> {
    const range = td.getWordRangeAtPosition(pos)
    const onresp = (_langid: string, resp: zipc_resp.Msg): vs.WorkspaceEdit => {
        if ((!cancel.isCancellationRequested) && resp && resp.srcMods && resp.srcMods.length)
            return zsrc.srcMods2VsEdit(resp.srcMods)
        return null
    }
    return zipc_req.forFile<vs.WorkspaceEdit>(td, zipc_req.MsgIDs.srcMod_Rename, newName, onresp, undefined, range, pos)
}

function onSignature(td: vs.TextDocument, pos: vs.Position, cancel: vs.CancellationToken): vs.ProviderResult<vs.SignatureHelp> {
    const onresp = (_langid: string, resp: zipc_resp.Msg): vs.SignatureHelp => {
        if ((!cancel.isCancellationRequested) && resp && resp.srcIntel && resp.srcIntel.sig)
            return resp.srcIntel.sig
        return undefined
    }
    return zipc_req.forFile<vs.SignatureHelp>(td, zipc_req.MsgIDs.srcIntel_Signature, undefined, onresp, undefined, undefined, pos)
}

function onSymbolsInFile(td: vs.TextDocument, cancel: vs.CancellationToken): vs.ProviderResult<vs.SymbolInformation[]> {
    const onresp = onSymbolsRespRefLocMsgs2VsSyms(cancel)
    return zipc_req.forFile<vs.SymbolInformation[]>(td, zipc_req.MsgIDs.srcIntel_SymsFile, undefined, onresp)
}

function onSymbolsInDir(langId: string) {
    return (query: string, cancel: vs.CancellationToken): vs.ProviderResult<vs.SymbolInformation[]> => {
        const onresp = onSymbolsRespRefLocMsgs2VsSyms(cancel)
        return zipc_req.forLang<vs.SymbolInformation[]>(langId, zipc_req.MsgIDs.srcIntel_SymsProj, query, onresp)
    }
}

function onSymbolsRespRefLocMsgs2VsSyms(cancel: vs.CancellationToken) {
    return (_langid: string, resp: zipc_resp.Msg): vs.SymbolInformation[] => {
        if ((!cancel.isCancellationRequested) && resp && resp.srcIntel && resp.srcIntel.syms && resp.srcIntel.syms.length)
            return resp.srcIntel.syms.map(zsrc.refLocMsg2VsSym)
        return undefined
    }
}
