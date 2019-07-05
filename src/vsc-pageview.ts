import * as vs from 'vscode'
import vscmd = vs.commands

import * as z from './zentient'
import * as zcfg from './vsc-settings'
import * as zipc from './ipc-protocol-msg-types'
import * as zipc_req from './ipc-req'
import * as zvscmd from './vsc-commands'


const CSS = `
<style type="text/css">
body { font-size: 1.11em ; line-height: 1.88em }
code, pre { padding-left: 0.44em ; padding-right: 0.44em }
pre { padding: 0.88em ; font-size: 1.11em ; overflow: auto }
</style>
`

const CSS_DARK = `
<style type="text/css">
.zentientPageHighlight { background-color: #785020 }
body { background: #6f6a65 ; color: #2a2520 }
code, pre { background-color: #3b3631 ; color: #9f9a95 }
a, a:visited { color: #104050 }
a:active, a:hover { color: #602005 }
code a:hover, pre a:hover,
code a:active, pre a:active,
code a:visited, pre a:visited,
code a, pre a { color: #80B0C0 }
</style>
`

const CSS_LITE = `
<style type="text/css">
.zentientPageHighlight { background-color: #E8C090 }
body { background: #e7e3dd }
code, pre { background-color: #d7d3cd }
a, a:visited { color: #5090A0 }
a:active, a:hover { color: #602005 }
code a:hover, pre a:hover,
code a:active, pre a:active,
code a:visited, pre a:visited,
code a, pre a { color: #6090A0 }
</style>
`


export function onActivate() {
    z.regDisp(vs.workspace.registerTextDocumentContentProvider('zentient', { provideTextDocumentContent: onLoadPage }))
    zvscmd.ensure('zen.internal.page', onPageNav)
}

function onLoadPage(uri: vs.Uri, cancel: vs.CancellationToken): vs.ProviderResult<string> {
    const onresp = (_langid: string, resp: zipc.RespMsg): string => {
        if ((!cancel.isCancellationRequested) && resp.val && typeof resp.val === 'string')
            return CSS + (zcfg.darkThemedPages() ? CSS_DARK : CSS_LITE) + resp.val
        return undefined
    }
    return zipc_req.forLang<string>(uri.authority, zipc.IDs.PAGE_HTML, uri.path + '?' + uri.query + '#' + uri.fragment, onresp)
}

function onPageNav(url: string) {
    openUriInViewer(url)
}

export function openUriInViewer(uri: vs.Uri | string, title: string = undefined) {
    const u: vs.Uri = typeof uri !== 'string' ? uri : vs.Uri.parse(uri)
    return vscmd.executeCommand('vscode.previewHtml', u, vs.ViewColumn.Two, title)
}
