import * as vs from 'vscode'
import vscmd = vs.commands
import vslang = vs.languages
import vswin = vs.window

//  code.visualstudio.com/Search?q=foo

import * as u from './util'
import * as z from './zentient'
import * as zconn from './conn'
import * as zlang from './lang'
import * as zpage from './page'
import * as zproj from './proj'




const   tmpaction:              vs.Command              = { arguments: [], command: 'zen.caps.fmt',
                                                            title: "Foo Action" },
        tmplocation:            vs.Location             = new vs.Location (
                                                            vs.Uri.parse(zpage.zenProtocolUrlFromQueryMsg('raw', '', zconn.MSG_ZEN_STATUS + ".json", zconn.MSG_ZEN_STATUS)),
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
        yield vslang.registerDocumentHighlightProvider(lids, { provideDocumentHighlights: onHighlights })
        yield vslang.registerRenameProvider(lids, { provideRenameEdits: onRename })
        yield vslang.registerSignatureHelpProvider(lids, { provideSignatureHelp: onSignature }, '(', ',')
        yield vslang.registerWorkspaceSymbolProvider({ provideWorkspaceSymbols: onSymbolsInDir })

        yield vslang.registerReferenceProvider(lids, { provideReferences: onReference })
        yield vslang.registerDefinitionProvider(lids, { provideDefinition: onGoToDef })
        yield vslang.registerImplementationProvider(lids, { provideImplementation: onGoToImplOrType })
        yield vslang.registerTypeDefinitionProvider(lids, { provideTypeDefinition: onGoToImplOrType })
        vsreg = true
    }
}


//  seems to be invoked on the same events as `onHighlights` below; plus on doc-tab-activate.
function onCodeActions (td: vs.TextDocument, _range: vs.Range, ctx: vs.CodeActionContext, _cancel: vs.CancellationToken):
vs.ProviderResult<vs.Command[]> {
    const cmds: vs.Command[] = []
    for (const cmd of zlang.diagFixupCommands(td, ctx.diagnostics))
        cmds.push(cmd)

    if (cmds.length===0)
        cmds.push(tmpaction)
    return cmds
}


//  on doc-tab-activate and on edit --- not on save or cursor movements
function onCodeLenses (_td: vs.TextDocument, _cancel: vs.CancellationToken):
vs.ProviderResult<vs.CodeLens[]> {
    //  reminder: both a lens' range and cmd can also be set on-demand with a resolveCodeLens handler
    return [ new vs.CodeLens(new vs.Range(10,18 , 12,14), tmpaction) ]
}

            let tmpcmpls: vs.CompletionItem[] = []
function onCompletion (_td: vs.TextDocument, _pos: vs.Position, _cancel: vs.CancellationToken):
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

function onGoToDef (td: vs.TextDocument, pos: vs.Position, _cancel: vs.CancellationToken):
vs.ProviderResult<vs.Definition> {
    const zid = z.langZid(td)
    if (zconn.isAlive())
        return zconn.requestJson(zconn.MSG_QUERY_DEFLOC, [zid], { ffp: td.fileName, o: td.offsetAt(pos).toString(), i: td.getText() }).then(   (resp: zlang.SrcMsg)=> {
            return (!resp)  ?  null  :  new vs.Location(vs.Uri.file(resp.Ref), new vs.Position(resp.Pos1Ln-1, resp.Pos1Ch-1))
        }, (fail)=> {  vswin.setStatusBarMessage(fail, 4567)  ;  throw fail })
    return null
}

function onGoToImplOrType (_td: vs.TextDocument, _pos: vs.Position, _cancel: vs.CancellationToken):
vs.ProviderResult<vs.Definition> {
    return tmplocation
}

//  seems to fire whenever the cursor *enters* a word: not when moving from whitespace to white-space, not
//  when moving from word to white-space, not from moving inside the same word (except after doc-tab-activation)
function onHighlights (td: vs.TextDocument, pos: vs.Position, _cancel: vs.CancellationToken):
vs.ProviderResult<vs.DocumentHighlight[]> {
    return u.fileTextRanges(td, pos).then ( (matches)=>
        matches.map((r)=> new vs.DocumentHighlight(r)) )
}

function onHover (td: vs.TextDocument, pos: vs.Position, _cancel: vs.CancellationToken):
vs.ProviderResult<vs.Hover> {
    const txt = u.edWordAtPos(td, pos)
    if (!txt) return undefined
    return new Promise<vs.Hover>((onreturn, _oncancel)=> {
        const   hovers: vs.MarkedString[] = [],
                diags = zproj.fileDiags(td, pos)
        let     msg: string,
                dd: zlang.DiagData

        if (diags) for (const d of diags) if ((dd = d['zen:data'] as zlang.DiagData)) {
            if (dd.rf && dd.rt) {
                msg = "### " + u.strAfter(" ➜  ",d.message) + ":"
                if (dd.rn && dd.rn.length) for (const n of dd.rn) msg += "\n* " + n
                msg += "\n\n*Current code:*\n```" + td.languageId + "\n" + dd.rf + "\n```\n*could be:*\n```" + td.languageId + "\n" + dd.rt + "\n```\n"
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
function onLinks (_td: vs.TextDocument, _cancel: vs.CancellationToken):
vs.ProviderResult<vs.DocumentLink[]> {
    //  reminder: both a link's range and target uri can also be set on-demand with a resolveDocumentLink handler
    return [ new vs.DocumentLink(new vs.Range(2, 0, 2, 2), vs.Uri.parse('command:' + tmpaction.command)) ]
}


type RespFmt = { Result: string , Warnings: string[] }

function onRangeFormattingEdits (td: vs.TextDocument, range: vs.Range, opt: vs.FormattingOptions, cancel: vs.CancellationToken):
vs.ProviderResult<vs.TextEdit[]> {
    const   src = td.getText(range),
            zid = z.langZid(td),
            noui = vs.workspace.getConfiguration().get<boolean>("editor.formatOnSave") || vs.workspace.getConfiguration().get<boolean>("go.editor.formatOnSave")
    return  (!zid) || (!src)  ?  []  :  zconn.requestJson(zconn.MSG_DO_FMT, [zid], { c: zproj.cfgTool(zid, 'fmt'), t: opt.tabSize, s: src }).then(
        (resp: RespFmt)=> {
            if (!cancel.isCancellationRequested) {
                if (resp) {
                    if (resp.Warnings) {
                        z.out(resp.Warnings.join('\n\t\t'))
                        if (!noui) resp.Warnings.reverse().map(u.strPreserveIndent).map( (w)=> vswin.showWarningMessage(w) )
                    }
                    if (resp.Result) return [vs.TextEdit.replace(range, resp.Result)]
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

function onReference (_td: vs.TextDocument, _pos: vs.Position, _ctx: vs.ReferenceContext, _cancel: vs.CancellationToken):
vs.ProviderResult<vs.Location[]> {
    return [tmplocation]
}



function onRename (td: vs.TextDocument, pos: vs.Position, newname: string, cancel: vs.CancellationToken):
vs.ProviderResult<vs.WorkspaceEdit> {
    for (const ed of vswin.visibleTextEditors) if (ed.document.isDirty) throw "Save all modified files before attempting this request."

    const zid = z.langZid(td)  ;  const wr = td.getWordRangeAtPosition(pos)
    const p2s = (p: vs.Position)=> td.offsetAt(p).toString()
    const req = { c: zproj.cfgTool(zid, 'ren'), nn: newname, o: p2s(pos), rfp: zproj.relFilePath(td), no: td.getText(wr), o1: p2s(wr.start), o2: p2s(wr.end), e: td.eol==vs.EndOfLine.CRLF  ?  '\r\n'  :  '\n' }

    return zconn.requestJson(zconn.MSG_DO_RENAME, [zid], req).then((resp: { [_ffp:string]: zlang.SrcMsg[] })=> {
        if (cancel.isCancellationRequested) return null
        const edits = new vs.WorkspaceEdit()
        for (const ffp in resp) if (ffp && resp[ffp]) {
            // resp[ffp].map((fed)=> { console.log(ffp)  ;  console.log(fed) })
            const eds = resp[ffp].map((fed)=> new vs.TextEdit(new vs.Range(fed.Pos1Ln, fed.Pos1Ch, fed.Pos2Ln, fed.Pos2Ch), fed.Msg))
            if (eds.length) edits.set(vs.Uri.file(ffp), eds)
        }
        if (edits.size===0) throw "No edits were obtained for this rename request, but no error details were given either."
        return edits
    }, (failreason: string)=> {
        return u.thenDo( 'zen.caps.ren' ).then(()=> u.thenFail(failreason))
    })
}


function onSignature (_td: vs.TextDocument, _pos: vs.Position, _cancel: vs.CancellationToken):
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
function onSymbolsInFile (_td: vs.TextDocument, _cancel: vs.CancellationToken):
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
