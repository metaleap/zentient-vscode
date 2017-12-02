import * as vs from 'vscode'
import vslang = vs.languages

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
    }
}

function onHover(td: vs.TextDocument, pos: vs.Position, _cancel: vs.CancellationToken): vs.ProviderResult<vs.Hover> {
    const onresp = (_langid: string, respmsg: zipc_resp.MsgResp): vs.Hover => {
        if (respmsg && respmsg.srcIntel && respmsg.srcIntel.h && respmsg.srcIntel.h.length)
            return new vs.Hover(zsrc.srcHovsToVsMarkStrs(respmsg.srcIntel.h))
        return new vs.Hover({ language: 'json', value: JSON.stringify(respmsg, null, "    ") })
    }
    return zipc_req.forFile<vs.Hover>(td, zipc_req.MsgIDs.srcIntel_Hover, undefined, onresp, undefined, undefined, pos)
}

function onFormatFile(td: vs.TextDocument, opt: vs.FormattingOptions, cancel: vs.CancellationToken): vs.ProviderResult<vs.TextEdit[]> {
    return zipc_req.forFile<vs.TextEdit[]>(td, zipc_req.MsgIDs.srcFmt_RunOnFile, opt, editsFromRespSrcMod(td, cancel))
}

function onFormatRange(td: vs.TextDocument, range: vs.Range, opt: vs.FormattingOptions, cancel: vs.CancellationToken): vs.ProviderResult<vs.TextEdit[]> {
    return zipc_req.forFile<vs.TextEdit[]>(td, zipc_req.MsgIDs.srcFmt_RunOnSel, opt, editsFromRespSrcMod(td, cancel), undefined, range)
}

function editsFromRespSrcMod(td: vs.TextDocument, cancel: vs.CancellationToken, range?: vs.Range) {
    return (_langid: string, respmsg: zipc_resp.MsgResp): vs.TextEdit[] => {
        zipc_resp.throwIf(cancel)
        const edit = zsrc.srcModToVsEdit(td, respmsg.srcMod, range)
        return edit ? [edit] : []
    }
}
