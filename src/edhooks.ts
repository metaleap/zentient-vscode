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


function onRangeFormattingEdits (doc: vs.TextDocument, range: vs.Range, _opt: vs.FormattingOptions, _cancel: vs.CancellationToken): vs.ProviderResult<vs.TextEdit[]> {
    const   txt = JSON.stringify(doc.getText(range), null, ''),
            zid = z.langZid(doc)
    return  (!zid)  ?  []  :  zconn.requestJson(zconn.MSG_DO_FMT + zid + ':' + txt).then(
        (resp: {[_:string]:{Result:string , Warnings:string[] , Error:{}}})=> {
            const zr = resp[zid]
            if (zr) {
                if (zr.Warnings) zr.Warnings.map( (w)=> vswin.showWarningMessage(u.strAfter(': ', w)) )
                if (zr.Error) vswin.showErrorMessage(JSON.stringify(zr.Error, null, ''))
                if (zr.Result) return [vs.TextEdit.replace(range, zr.Result)]
            }
            return []
        }
    ,   (fail: any)=> {
            vswin.showErrorMessage(fail + '') }
    )
}
