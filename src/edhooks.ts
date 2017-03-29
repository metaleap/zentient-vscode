import * as vs from 'vscode'
import vslang = vs.languages
import vswin = vs.window

import * as u from './util'
import * as z from './zentient'
import * as zconn from './conn'
import * as zproj from './proj'


const   action: vs.Command                              = { arguments: [], command: 'zen.caps.fmt',
                                                            title: "Foo Action" }
let     vsreg:  boolean                                 = false


export function* onAlive () {
    if (!vsreg) {
        const lids = Array.from<string>(z.edLangs())
        yield vslang.registerHoverProvider(lids, { provideHover: onHover })
        yield vslang.registerCodeActionsProvider(lids, { provideCodeActions: onCodeActions })
        yield vslang.registerCodeLensProvider(lids, { provideCodeLenses: onCodeLenses })
        yield vslang.registerDocumentLinkProvider(lids, { provideDocumentLinks: onLinks })
        yield vslang.registerDocumentRangeFormattingEditProvider(lids, { provideDocumentRangeFormattingEdits: onRangeFormattingEdits })
        vsreg = true
    }
}

//  seems to be invoked on the same events as `onHighlights` below; plus on doc-tab-activate.
function onCodeActions (_doc :vs.TextDocument, _range :vs.Range, _ctx :vs.CodeActionContext, _cancel :vs.CancellationToken):
vs.ProviderResult<vs.Command[]> {
    return [ action ]
}

//  on doc-tab-activate and on edit --- not on save or cursor movements
function onCodeLenses (_doc :vs.TextDocument, _cancel :vs.CancellationToken):
vs.ProviderResult<vs.CodeLens[]> {
    return [ new vs.CodeLens(new vs.Range(0,0 , 1,0), action) ]
}

function onHover (doc :vs.TextDocument, pos :vs.Position, _cancel :vs.CancellationToken):
vs.ProviderResult<vs.Hover> {
    const txt = doc.getText(doc.getWordRangeAtPosition(pos))
    return new Promise<vs.Hover>((onreturn, _oncancel)=> {
        onreturn(new vs.Hover([ "**Some** shiny `syntax`:", { language: 'markdown' , value: "*McFly!!* A `" + txt + "` isn't a hoverboard." }, "But..", "here's *more*:", { language: "html", value: "<b>Test</b>" } ]))
    })
}

//  on edit and on activate
function onLinks (_doc :vs.TextDocument, _cancel :vs.CancellationToken):
vs.ProviderResult<vs.DocumentLink[]> {
    return [ new vs.DocumentLink(new vs.Range(2, 0, 2, 2), vs.Uri.parse('command:' + action.command)) ]
}

function onRangeFormattingEdits (doc: vs.TextDocument, range: vs.Range, opt: vs.FormattingOptions, cancel: vs.CancellationToken):
vs.ProviderResult<vs.TextEdit[]> {
    const   src = doc.getText(range),
            zid = z.langZid(doc)
    return  (!zid) || (!src)  ?  []  :  zconn.requestJson(zconn.MSG_DO_FMT + zid + ':' + JSON.stringify({ c: zproj.cfgToolFmt(zid), t: opt.tabSize, s: src }, null, '')).then(
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
