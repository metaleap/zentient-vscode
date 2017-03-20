import * as vs from 'vscode'
import vswin = vs.window

import * as z from './zentient'



export function onActivate () {
    z.regCmd('zen.vse.dir.openNew', onCmdDirOpen)
    z.regCmd('zen.term.favs', onCmdTermFavs)
}


function onCmdDirOpen (uri :vs.Uri) {
    return vs.commands.executeCommand('vscode.openFolder', uri, true)
}


function onCmdTermFavs () {
    const items = vs.workspace.getConfiguration().get<string[]>("zen.term.favs", [])
    return vswin.showInformationMessage( "Run in terminal: ", ...items.map((favcmd)=>
        "[ " + favcmd + " ]") ).then( (favpick)=>
            (!favpick) ? z.thenHush() : z.thenDo( ()=>
                { z.vsTerm.show(true)  ;  z.vsTerm.sendText(favpick.slice(2, favpick.length-2)) } ) )
}
