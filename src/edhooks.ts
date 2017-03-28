import * as vs from 'vscode'
import vslang = vs.languages
import vswin = vs.window

import * as u from './util'
import * as z from './zentient'
import * as zconn from './conn'


let vsreg: boolean = false


export function* onAlive () {
    if (!vsreg) {
        for (const lid of z.edLangs())
            yield vslang.registerDocumentRangeFormattingEditProvider(lid, { provideDocumentRangeFormattingEdits: onRangeFormattingEdits })
        vsreg = true
    }
}


function onRangeFormattingEdits (doc: vs.TextDocument, range: vs.Range, opt: vs.FormattingOptions, cancel: vs.CancellationToken): vs.ProviderResult<vs.TextEdit[]> {
    const   src = doc.getText(range),
            zid = z.langZid(doc)
    return  (!zid) || (!src)  ?  []  :  zconn.requestJson(zconn.MSG_DO_FMT + zid + ':' + JSON.stringify({ t: opt.tabSize, s: src }, null, '')).then(
        (resp: {[_:string]:{Result:string , Warnings:string[]}})=> {
            if (!cancel.isCancellationRequested) {
                const zr = resp[zid]
                if (zr) {
                    if (zr.Warnings) zr.Warnings.map( (w)=> vswin.showWarningMessage(u.strAfter(': ', w)) )
                    if (zr.Result) return [vs.TextEdit.replace(range, zr.Result)]
                } else {
                    z.outStatus("The Zentient backend could not obtain any re-formatting for the current selection.")
                }
            }
            return []
        }
    ,   (fail: any)=> u.thenDo( 'zen.caps.fmt' , ()=> vswin.showErrorMessage(fail + '') )
    )
}
