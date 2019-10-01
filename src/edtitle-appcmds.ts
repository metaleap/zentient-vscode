import * as vs from 'vscode'

import * as zvscmd from './vsc-commands'


export function onActivate() {
    zvscmd.ensure('zen.apps.main', onCmdAppsMenu(false))
    zvscmd.ensure('zen.apps.main.alt', onCmdAppsMenu(true))
}

function onCmdAppsMenu(_forceListAllApps: boolean) {
    return () =>
        vs.commands.executeCommand('vsc_appz.main')
}
