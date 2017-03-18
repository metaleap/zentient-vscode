import * as z from './zentient'

import * as vs from 'vscode'



export function onActivate () {
    z.regCmd('zen.vse.dir.openNew', cmdVseDirOpen)
}


function cmdVseDirOpen (uri :vs.Uri) {
    return vs.commands.executeCommand('vscode.openFolder', uri, true)
}
