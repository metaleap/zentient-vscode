import * as vs from 'vscode'

import * as z from './zentient'



export function onActivate () {
    z.regCmd('zen.vse.dir.openNew', onCmdDirOpen)
}


function onCmdDirOpen (uri :vs.Uri) {
    return vs.commands.executeCommand('vscode.openFolder', uri, true)
}
