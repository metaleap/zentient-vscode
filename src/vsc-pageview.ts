import * as vs from 'vscode'
import vscmd = vs.commands

import * as z from './zentient'
import * as zvscmd from './vsc-commands'

export function onActivate() {
    z.regDisp(vs.workspace.registerTextDocumentContentProvider('zentient', { provideTextDocumentContent: onLoadPage }))
    zvscmd.ensure('zen.internal.test', onTryIt)
}

function onLoadPage(_uri: vs.Uri, _cancel: vs.CancellationToken): vs.ProviderResult<string> {
    return "<h1>Noice!</h1><p>A graph <a href=\"#last\">of</a>.. <img src=\"http://localhost:60606/doc/gopher/doc.png\"/> ..the para sort!</p><p>A graph of.. <img src=\"http://localhost:60606/doc/gopher/doc.png\"/> ..the para sort!</p><p>A graph of.. <img src=\"http://localhost:60606/doc/gopher/doc.png\"/> ..the para sort!</p><p>A graph of.. <img src=\"http://localhost:60606/doc/gopher/doc.png\"/> ..the para sort!</p><p>A graph of.. <img src=\"http://localhost:60606/doc/gopher/doc.png\"/> ..the para sort!</p><p>A graph of.. <img src=\"http://localhost:60606/doc/gopher/doc.png\"/> ..the para sort!</p><p>A graph of.. <img src=\"http://localhost:60606/doc/gopher/doc.png\"/> ..the para sort!</p><p>A graph of.. <img src=\"http://localhost:60606/doc/gopher/doc.png\"/> ..the para sort!</p><p>A graph of.. <img src=\"http://localhost:60606/doc/gopher/doc.png\"/> ..the para sort!</p><p>A graph of.. <img src=\"http://localhost:60606/doc/gopher/doc.png\"/> ..the para sort!</p><p>A graph of.. <img src=\"http://localhost:60606/doc/gopher/doc.png\"/> ..the para sort!</p><p>A graph of.. <img src=\"http://localhost:60606/doc/gopher/doc.png\"/> ..the para sort!</p><p>A graph of.. <img src=\"http://localhost:60606/doc/gopher/doc.png\"/> ..the para sort!</p><p>A graph of.. <img src=\"http://localhost:60606/doc/gopher/doc.png\"/> ..the para sort!</p><p>A graph of.. <img src=\"http://localhost:60606/doc/gopher/doc.png\"/> ..the para sort!</p><p>A graph of.. <img src=\"http://localhost:60606/doc/gopher/doc.png\"/> ..the para sort!</p><p>A graph of.. <img src=\"http://localhost:60606/doc/gopher/doc.png\"/> ..the para sort!</p><p>A graph of.. <img src=\"http://localhost:60606/doc/gopher/doc.png\"/> ..the para sort!</p><p>A graph of.. <img src=\"http://localhost:60606/doc/gopher/doc.png\"/> ..the para sort!</p><p>A graph of.. <img src=\"http://localhost:60606/doc/gopher/doc.png\"/> ..the para sort!</p><p>A graph of.. <img src=\"http://localhost:60606/doc/gopher/doc.png\"/> ..the para sort!</p><p>A graph of.. <img src=\"http://localhost:60606/doc/gopher/doc.png\"/> ..the para sort!</p><p>A graph of.. <img src=\"http://localhost:60606/doc/gopher/doc.png\"/> ..the para sort!</p><p>A graph of.. <img src=\"http://localhost:60606/doc/gopher/doc.png\"/> ..the para sort!</p><p name=\"last\">A graph of.. <img src=\"http://localhost:60606/doc/gopher/doc.png\"/> ..the para sort!</p>"
}

function onTryIt() {
    openUriInViewer('zentient://some/uri?to=view')
}

export function openUriInViewer(uri: vs.Uri | string, title: string = undefined) {
    const u: vs.Uri = typeof uri !== 'string' ? uri : vs.Uri.parse(uri)
    return vscmd.executeCommand('vscode.previewHtml', u, vs.ViewColumn.Three, title)
}
