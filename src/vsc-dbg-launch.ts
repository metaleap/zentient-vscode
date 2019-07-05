import * as vs from 'vscode'
import vswin = vs.window
import * as z from './zentient'
import * as zcfg from './vsc-settings'
import * as zipc_pipeio from './ipc-pipe-io'
import * as zvscmd from './vsc-commands'


const dbgCfg = [{ type: 'zentient.dbg', name: '⟨ℤ⟩', request: 'launch' }]


export function onActivate() {
    zvscmd.ensure('zentient.dbg.progInfo', dbgProgInfo)
    vs.debug.registerDebugConfigurationProvider('zentient.dbg', { provideDebugConfigurations: () => dbgCfg })
}

function dbgProgInfo() {
    const last = zipc_pipeio.last
    const te = vswin.activeTextEditor
    const td = (te && zcfg.languageIdOk(te.document)) ? te.document :
        (last ? z.findTextFile(last.filePath) : undefined)

    if (!(td || last)) return {}

    const args = [td ? td.fileName : last.filePath]
    // for now, the just-below would never occur --- keep around for a possible "run un-saved changes" future
    // if (td && (td.isDirty || td.isUntitled))
    //     args.push(td.getText())
    return { args: args, command: 'zentient-dbg-vsc-' + (td ? td.languageId : last.langId) }
}
