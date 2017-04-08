import * as vs from 'vscode'
import vscmd = vs.commands
import vslang = vs.languages
import vswin = vs.window

//  code.visualstudio.com/Search?q=foo

import * as u from './util'
import * as z from './zentient'
import * as zconn from './conn'
import * as zproj from './proj'


const   tmpaction:              vs.Command              = { arguments: [], command: 'zen.caps.fmt',
                                                            title: "Foo Action" },
        tmplocation:            vs.Location             = new vs.Location (
                                                            vs.Uri.parse(zconn.zenProtocolUrlFromQueryMsg('raw', '', zconn.MSG_ZEN_STATUS + ".json", zconn.MSG_ZEN_STATUS)),
                                                            new vs.Range(2, 0, 4, 0) )
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
        yield vslang.registerDocumentSymbolProvider(lids, { provideDocumentSymbols: onSymbolsInFile })
        yield vslang.registerDefinitionProvider(lids, { provideDefinition: onGoToDefOrImplOrType })
        yield vslang.registerImplementationProvider(lids, { provideImplementation: onGoToDefOrImplOrType })
        yield vslang.registerTypeDefinitionProvider(lids, { provideTypeDefinition: onGoToDefOrImplOrType })
        yield vslang.registerDocumentHighlightProvider(lids, { provideDocumentHighlights: onHighlights })
        yield vslang.registerReferenceProvider(lids, { provideReferences: onReference })
        yield vslang.registerRenameProvider(lids, { provideRenameEdits: onRename })
        yield vslang.registerSignatureHelpProvider(lids, { provideSignatureHelp: onSignature }, '(', ',')
        yield vslang.registerWorkspaceSymbolProvider({ provideWorkspaceSymbols: onSymbolsInDir })
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
            cmpl.detail = "Z_Detail"
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

function onGoToDefOrImplOrType (_doc: vs.TextDocument, _pos: vs.Position, _cancel: vs.CancellationToken):
vs.ProviderResult<vs.Definition> {
    return tmplocation
}

//  seems to fire whenever the cursor *enters* a word: not when moving from whitespace to white-space, not
//  when moving from word to white-space, not from moving inside the same word (except after doc-tab-activation)
function onHighlights (doc: vs.TextDocument, pos: vs.Position, _cancel: vs.CancellationToken):
vs.ProviderResult<vs.DocumentHighlight[]> {
    return u.fileTextRanges(doc, pos).then ( (matches)=>
        matches.map((r)=> new vs.DocumentHighlight(r)) )
}

function onHover (doc: vs.TextDocument, pos: vs.Position, _cancel: vs.CancellationToken):
vs.ProviderResult<vs.Hover> {
    const txt = u.edWordAtPos(doc, pos)
    if (!txt) return undefined
    return new Promise<vs.Hover>((onreturn, _oncancel)=> {
        const   hovers: vs.MarkedString[] = [],
                diags = zproj.fileDiags(doc, pos)
        let     msg: string,
                dd: { rf: string, rt: string, rn: string[] }

        if (diags) for (const d of diags) if ((dd = d['data'])) {
            if (dd.rf && dd.rt) {
                msg = "### " + u.strAfter(" ➜  ",d.message) + ":"
                if (dd.rn && dd.rn.length) for (const n of dd.rn) msg += "\n* " + n
                msg += "\n\n*Current code:*\n```" + doc.languageId + "\n" + dd.rf + "\n```\n*could be:*\n```" + doc.languageId + "\n" + dd.rt + "\n```\n"
                hovers.push(msg)
            }
        }

        if (hovers.length===0) {
            hovers.push("**Some** shiny `syntax`:")
            hovers.push({ language: 'markdown' , value: "*McFly!!* A `" + txt + "` isn't a hoverboard." })
            hovers.push("_But_.. here's *more*:")
            hovers.push({ language: "html", value: "<b>Test</b>" })
        }
        onreturn(new vs.Hover(hovers))
    })
}

//  on edit and on activate
function onLinks (_doc: vs.TextDocument, _cancel: vs.CancellationToken):
vs.ProviderResult<vs.DocumentLink[]> {
    //  reminder: both a link's range and target uri can also be set on-demand with a resolveDocumentLink handler
    return [ new vs.DocumentLink(new vs.Range(2, 0, 2, 2), vs.Uri.parse('command:' + tmpaction.command)) ]
}


type RespFmt = { Result: string , Warnings: string[] }

function onRangeFormattingEdits (doc: vs.TextDocument, range: vs.Range, opt: vs.FormattingOptions, cancel: vs.CancellationToken):
vs.ProviderResult<vs.TextEdit[]> {
    const   src = doc.getText(range),
            zid = z.langZid(doc),
            noui = vs.workspace.getConfiguration().get<boolean>("editor.formatOnSave") || vs.workspace.getConfiguration().get<boolean>("go.editor.formatOnSave")
    return  (!zid) || (!src)  ?  []  :  zconn.requestJson(zconn.MSG_DO_FMT + zid + ':' + JSON.stringify({ c: zproj.cfgTool(zid, 'fmt'), t: opt.tabSize, s: src }, null, '')).then(
        (resp: { [_zid: string]: RespFmt })=> {
            if (!cancel.isCancellationRequested) {
                const zr = resp  ?  resp[zid]  :  undefined
                if (zr) {
                    if (zr.Warnings) {
                        z.out(zr.Warnings.join('\n\t\t'))
                        if (!noui) zr.Warnings.reverse().map(u.strPreserveIndent).map( (w)=> vswin.showWarningMessage(w) )
                    }
                    if (zr.Result) return [vs.TextEdit.replace(range, zr.Result)]
                } else {
                    vscmd.executeCommand('zen.caps.fmt')
                    z.outStatus("The Zentient backend could not obtain any re-formatting for the current selection.")
                }
            }
            return []
        }
    ,   (fail: any)=> u.thenDo( ('zen.caps.fmt') , ()=>  noui  ?  z.outThrow(fail, "onRangeFormattingEdits")  :  vswin.showErrorMessage(fail + '') )
    )
}

function onReference (_doc: vs.TextDocument, _pos: vs.Position, _ctx: vs.ReferenceContext, _cancel: vs.CancellationToken):
vs.ProviderResult<vs.Location[]> {
    return [tmplocation]
}

function onRename (doc: vs.TextDocument, pos: vs.Position, newname: string, _cancel: vs.CancellationToken):
vs.ProviderResult<vs.WorkspaceEdit> {
    return u.fileTextRanges(doc, pos).then((matches)=> {
        const edits = new vs.WorkspaceEdit()
        edits.set(doc.uri, matches.map( (range)=> vs.TextEdit.replace(range, newname) ))
        return edits
    })
}

function onSignature (_doc: vs.TextDocument, _pos: vs.Position, _cancel: vs.CancellationToken):
vs.ProviderResult<vs.SignatureHelp> {
    const sighelp = new vs.SignatureHelp()
    sighelp.activeParameter = 0  ;  sighelp.activeSignature = 0
    sighelp.signatures = [ new vs.SignatureInformation("signature :: foo -> baz -> expo", "Function summary here..") ]
    sighelp.signatures[0].parameters.push(new vs.ParameterInformation("foo", "(Parameter info here..)"))
    return sighelp
}

function onSymbolsInDir (_query :string, _cancel :vs.CancellationToken):
vs.ProviderResult<vs.SymbolInformation[]> {
    return onSymbolsInFile(undefined, _cancel)
}

            let tmpsymbols: vs.SymbolInformation[] = []
function onSymbolsInFile (_doc: vs.TextDocument, _cancel: vs.CancellationToken):
vs.ProviderResult<vs.SymbolInformation[]> {
    if (!tmpsymbols.length) {
        const symkinds = {
            'vs.SymbolKind.Array': vs.SymbolKind.Array,
            'vs.SymbolKind.Boolean': vs.SymbolKind.Boolean,
            'vs.SymbolKind.Class': vs.SymbolKind.Class,
            'vs.SymbolKind.Constant': vs.SymbolKind.Constant,
            'vs.SymbolKind.Constructor': vs.SymbolKind.Constructor,
            'vs.SymbolKind.Enum': vs.SymbolKind.Enum,
            'vs.SymbolKind.Field': vs.SymbolKind.Field,
            'vs.SymbolKind.File': vs.SymbolKind.File,
            'vs.SymbolKind.Function': vs.SymbolKind.Function,
            'vs.SymbolKind.Interface': vs.SymbolKind.Interface,
            'vs.SymbolKind.Key': vs.SymbolKind.Key,
            'vs.SymbolKind.Method': vs.SymbolKind.Method,
            'vs.SymbolKind.Module': vs.SymbolKind.Module,
            'vs.SymbolKind.Namespace': vs.SymbolKind.Namespace,
            'vs.SymbolKind.Null': vs.SymbolKind.Null,
            'vs.SymbolKind.Number': vs.SymbolKind.Number,
            'vs.SymbolKind.Object': vs.SymbolKind.Object,
            'vs.SymbolKind.Package': vs.SymbolKind.Package,
            'vs.SymbolKind.Property': vs.SymbolKind.Property,
            'vs.SymbolKind.String': vs.SymbolKind.String,
            'vs.SymbolKind.Variable': vs.SymbolKind.Variable
        }
        for (const symkind in symkinds)
            tmpsymbols.push( new vs.SymbolInformation(symkind, symkinds[symkind], "Z_Container", tmplocation) )
    }
    return tmpsymbols
}
