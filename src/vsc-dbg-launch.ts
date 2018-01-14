import * as vs from 'vscode'
import vswin = vs.window

import * as zcfg from './vsc-settings'
import * as zvscmd from './vsc-commands'

export function onActivate() {
    zvscmd.ensure('zentient.dbg.progInfo', dbgProgInfo)
    vs.debug.registerDebugConfigurationProvider('zentient.dbg', { provideDebugConfigurations: dbgCfg })
}

function dbgCfg(_folder: vs.WorkspaceFolder, _cancel: vs.CancellationToken): vs.ProviderResult<vs.DebugConfiguration[]> {
    return [{
        type: 'zentient.dbg', name: '⟨ℤ⟩', request: 'launch'
    }]
}

function dbgProgInfo() {
    const te = vswin.activeTextEditor
    if (!te) return undefined
    const td = te.document
    if (!zcfg.languageIdOk(td)) return undefined

    const args = [td.fileName]
    if (td.isDirty || td.isUntitled)
        args.push(td.getText())
    return { args: args, command: 'zentient-dbg-vsc-' + td.languageId }
}
