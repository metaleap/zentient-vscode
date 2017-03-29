import * as vs from 'vscode'
import vslang = vs.languages
import vswin = vs.window

import * as u from './util'
import * as z from './zentient'
import * as zconn from './conn'
import * as zproj from './proj'


const   tmpaction:              vs.Command              = { arguments: [], command: 'zen.caps.fmt',
                                                            title: "Foo Action" }
let     onCodeLensesRefresh:    vs.EventEmitter<void>   = null,
        vsreg:                  boolean                 = false



export function* onAlive () {
    if (!vsreg) {
        const lids = Array.from<string>(z.edLangs())
        yield vslang.registerHoverProvider(lids, { provideHover: onHover })
        yield vslang.registerCodeActionsProvider(lids, { provideCodeActions: onCodeActions })
        yield (onCodeLensesRefresh = new vs.EventEmitter<void>())
        yield vslang.registerCodeLensProvider(lids, { provideCodeLenses: onCodeLenses, onDidChangeCodeLenses: onCodeLensesRefresh.event })
        yield vslang.registerCompletionItemProvider(lids, { provideCompletionItems: onCompletion, resolveCompletionItem: onCompletionDetails }, '.', '$', ' ')
        yield vslang.registerDocumentLinkProvider(lids, { provideDocumentLinks: onLinks })
        yield vslang.registerDocumentRangeFormattingEditProvider(lids, { provideDocumentRangeFormattingEdits: onRangeFormattingEdits })
        vsreg = true
    }
}

//  seems to be invoked on the same events as `onHighlights` below; plus on doc-tab-activate.
function onCodeActions (_doc: vs.TextDocument, _range: vs.Range, _ctx: vs.CodeActionContext, _cancel: vs.CancellationToken):
vs.ProviderResult<vs.Command[]> {
    return [ tmpaction ]
}

//  on doc-tab-activate and on edit --- not on save or cursor movements
function onCodeLenses (_doc: vs.TextDocument, _cancel: vs.CancellationToken):
vs.ProviderResult<vs.CodeLens[]> {
    //  reminder: both a lens' range and cmd can also be set on-demand with a resolveCodeLens handler
    return [ new vs.CodeLens(new vs.Range(0,0 , 1,0), tmpaction) ]
}

            let tmpcmpls: vs.CompletionItem[] = []
function onCompletion (_doc: vs.TextDocument, _pos: vs.Position, _cancel: vs.CancellationToken):
vs.ProviderResult<vs.CompletionItem[]> {
    if (!tmpcmpls.length) {
        const cmplkinds = {
            'vs.CompletionItemKind.Class': vs.CompletionItemKind.Class,
            'vs.CompletionItemKind.Color': vs.CompletionItemKind.Color,
            'vs.CompletionItemKind.Constructor': vs.CompletionItemKind.Constructor,
            'vs.CompletionItemKind.Enum': vs.CompletionItemKind.Enum,
            'vs.CompletionItemKind.Field': vs.CompletionItemKind.Field,
            'vs.CompletionItemKind.File': vs.CompletionItemKind.File,
            'vs.CompletionItemKind.Folder': vs.CompletionItemKind.Folder,
            'vs.CompletionItemKind.Function': vs.CompletionItemKind.Function,
            'vs.CompletionItemKind.Interface': vs.CompletionItemKind.Interface,
            'vs.CompletionItemKind.Keyword': vs.CompletionItemKind.Keyword,
            'vs.CompletionItemKind.Method': vs.CompletionItemKind.Method,
            'vs.CompletionItemKind.Module': vs.CompletionItemKind.Module,
            'vs.CompletionItemKind.Property': vs.CompletionItemKind.Property,
            'vs.CompletionItemKind.Reference': vs.CompletionItemKind.Reference,
            'vs.CompletionItemKind.Snippet': vs.CompletionItemKind.Snippet,
            'vs.CompletionItemKind.Text': vs.CompletionItemKind.Text,
            'vs.CompletionItemKind.Unit': vs.CompletionItemKind.Unit,
            'vs.CompletionItemKind.Value': vs.CompletionItemKind.Value,
            'vs.CompletionItemKind.Variable': vs.CompletionItemKind.Variable
        }
        for (const cmplkindname in cmplkinds) {
            const cmpl = new vs.CompletionItem(cmplkindname, cmplkinds[cmplkindname])
            cmpl.detail = "DAT_DETAIL"
            cmpl.documentation = "Fetching docs.."
            tmpcmpls.push(cmpl)
        }
    }
    return tmpcmpls
}

function onCompletionDetails (item: vs.CompletionItem, _cancel: vs.CancellationToken):
vs.ProviderResult<vs.CompletionItem> {
    return u.thenDelayed<vs.CompletionItem>(1234, ()=> {
        item.documentation = "Lazy-loaded `" + item.label + "` documentation"  ;  return item })
}

function onHover (doc: vs.TextDocument, pos: vs.Position, _cancel: vs.CancellationToken):
vs.ProviderResult<vs.Hover> {
    const txt = doc.getText(doc.getWordRangeAtPosition(pos))
    return new Promise<vs.Hover>((onreturn, _oncancel)=> {
        onreturn(new vs.Hover([ "**Some** shiny `syntax`:", { language: 'markdown' , value: "*McFly!!* A `" + txt + "` isn't a hoverboard." }, "But..", "here's *more*:", { language: "html", value: "<b>Test</b>" } ]))
    })
}

//  on edit and on activate
function onLinks (_doc: vs.TextDocument, _cancel: vs.CancellationToken):
vs.ProviderResult<vs.DocumentLink[]> {
    //  reminder: both a link's range and target uri can also be set on-demand with a resolveDocumentLink handler
    return [ new vs.DocumentLink(new vs.Range(2, 0, 2, 2), vs.Uri.parse('command:' + tmpaction.command)) ]
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
