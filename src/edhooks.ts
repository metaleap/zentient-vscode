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
    const   src = doc.getText(range),
            zid = z.langZid(doc)
    return  (!zid) || (!src)  ?  []  :  zconn.requestJson(zconn.MSG_DO_FMT + zid + ':' + JSON.stringify(src, null, '')).then(
        (resp: {[_:string]:{Result:string , Warnings:string[]}})=> {
            const zr = resp[zid]
            if (zr) {
                if (zr.Warnings) zr.Warnings.map( (w)=> vswin.showWarningMessage(u.strAfter(': ', w)) )
                if (zr.Result) return [vs.TextEdit.replace(range, zr.Result)]
            }
            return []
        }
    ,   (fail: any)=> u.thenDo( 'zen.caps.fmt' , ()=> vswin.showErrorMessage(fail + '') )
    )
}
