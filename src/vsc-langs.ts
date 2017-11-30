import * as vs from 'vscode'
import vslang = vs.languages

import * as z from './zentient'
import * as zcfg from './vsc-settings'
import * as zipc_req from './ipc-msg-req'
import * as zipc_resp from './ipc-msg-resp'


export function onActivate() {
    for (const langid in zcfg.langProgs()) {
        z.regDisp(vslang.registerDocumentRangeFormattingEditProvider(langid, { provideDocumentRangeFormattingEdits: dofmtr }))
    }
}

function dofmtr(_td: vs.TextDocument, _range: vs.Range, _opt: vs.FormattingOptions, _cancel: vs.CancellationToken): vs.ProviderResult<vs.TextEdit[]> {
    const prom = zipc_req.reqProm<vs.TextEdit[]>(_td.languageId, zipc_req.MsgIDs.srcFmt_RunOnFile, undefined, (_: zipc_resp.MsgResp) => [])
    return prom
}
