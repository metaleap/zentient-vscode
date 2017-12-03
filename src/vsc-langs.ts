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
        z.regDisp(vslang.registerCompletionItemProvider(langid, { provideCompletionItems: onCompletionItems, resolveCompletionItem: onCompletionItemInfos }))
    }
}

function onCompletionItemInfos(item: vs.CompletionItem, cancel: vs.CancellationToken): vs.ProviderResult<vs.CompletionItem> {
    const te = vswin.activeTextEditor
    if (te && item && !(item.documentation && item.detail)) {
        const onresp = (_langid: string, resp: zipc_resp.MsgResp): vs.CompletionItem => {
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
    const onresp = (_langid: string, resp: zipc_resp.MsgResp): vs.CompletionItem[] => {
        if ((!cancel.isCancellationRequested) && resp && resp.srcIntel)
            return resp.srcIntel.cmpl
        return undefined
    }
    return zipc_req.forFile<vs.CompletionItem[]>(td, zipc_req.MsgIDs.srcIntel_CmplItems, undefined, onresp, undefined, undefined, pos)
}

function onHover(td: vs.TextDocument, pos: vs.Position, cancel: vs.CancellationToken): vs.ProviderResult<vs.Hover> {
    const onresp = (_langid: string, resp: zipc_resp.MsgResp): vs.Hover => {
        if ((!cancel.isCancellationRequested) && resp && resp.srcIntel && resp.srcIntel.hovs && resp.srcIntel.hovs.length)
            return new vs.Hover(zsrc.srcHovsToVsMarkStrs(resp.srcIntel.hovs))
        return undefined
    }
    return zipc_req.forFile<vs.Hover>(td, zipc_req.MsgIDs.srcIntel_Hover, undefined, onresp, undefined, undefined, pos)
}

function onFormatFile(td: vs.TextDocument, opt: vs.FormattingOptions, cancel: vs.CancellationToken): vs.ProviderResult<vs.TextEdit[]> {
    return zipc_req.forFile<vs.TextEdit[]>(td, zipc_req.MsgIDs.srcFmt_RunOnFile, opt, onFormatRespSrcMod2VsEdits(td, cancel))
}

function onFormatRange(td: vs.TextDocument, range: vs.Range, opt: vs.FormattingOptions, cancel: vs.CancellationToken): vs.ProviderResult<vs.TextEdit[]> {
    return zipc_req.forFile<vs.TextEdit[]>(td, zipc_req.MsgIDs.srcFmt_RunOnSel, opt, onFormatRespSrcMod2VsEdits(td, cancel), undefined, range)
}

function onFormatRespSrcMod2VsEdits(td: vs.TextDocument, cancel: vs.CancellationToken, range?: vs.Range) {
    return (_langid: string, resp: zipc_resp.MsgResp): vs.TextEdit[] => {
        if (cancel.isCancellationRequested) return undefined
        const edit = zsrc.srcModToVsEdit(td, resp.srcMod, range)
        return edit ? [edit] : []
    }
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
    return (_langid: string, resp: zipc_resp.MsgResp): vs.SymbolInformation[] => {
        if ((!cancel.isCancellationRequested) && resp && resp.srcIntel && resp.srcIntel.syms && resp.srcIntel.syms.length)
            return resp.srcIntel.syms.map(zsrc.refLocMsg2VsSym)
        return undefined
    }
}
