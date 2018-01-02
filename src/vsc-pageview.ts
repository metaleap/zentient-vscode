import * as vs from 'vscode'
import vscmd = vs.commands

import * as z from './zentient'
import * as zipc_req from './ipc-req'
import * as zipc_resp from './ipc-resp'
import * as zvscmd from './vsc-commands'


const CSS = `
<style type="text/css">
code { background-color: #2A2621; padding-left: 0.44em; padding-right: 0.44em; }
</style>
    `


export function onActivate() {
    z.regDisp(vs.workspace.registerTextDocumentContentProvider('zentient', { provideTextDocumentContent: onLoadPage }))
    zvscmd.ensure('zen.internal.page', onPageNav)
}

function onLoadPage(uri: vs.Uri, cancel: vs.CancellationToken): vs.ProviderResult<string> {
    const onresp = (_langid: string, resp: zipc_resp.Msg): string => {
        if ((!cancel.isCancellationRequested) && resp.obj && typeof resp.obj === 'string')
            return CSS + resp.obj
        return undefined
    }
    return zipc_req.forLang<string>(uri.authority, zipc_req.IpcIDs.PAGE_HTML, uri.path, onresp)
}

function onPageNav(url: string) {
    openUriInViewer(url)
}

export function openUriInViewer(uri: vs.Uri | string, title: string = undefined) {
    const u: vs.Uri = typeof uri !== 'string' ? uri : vs.Uri.parse(uri)
    return vscmd.executeCommand('vscode.previewHtml', u, vs.ViewColumn.Two, title)
}
