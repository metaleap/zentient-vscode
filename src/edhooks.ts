import * as vs from 'vscode'
import vslang = vs.languages

import * as z from './zentient'


let vsreg: boolean = false


export function* onAlive () {
    if (!vsreg) {
        for (const lid of z.edLangs())
            yield vslang.registerDocumentRangeFormattingEditProvider(lid, { provideDocumentRangeFormattingEdits: onRangeFormattingEdits })
        vsreg = true
    }
}


function onRangeFormattingEdits (doc: vs.TextDocument, range: vs.Range, _opt: vs.FormattingOptions, _cancel: vs.CancellationToken):
vs.ProviderResult<vs.TextEdit[]> {
    const   txtold = doc.getText(range),
            txtnew = txtold.split(' ').join('\n')
    return [ vs.TextEdit.replace(range, txtnew) ]
}
