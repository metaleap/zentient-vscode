import * as zvscmd from './vsc-commands'


export function onActivate() {
    zvscmd.ensure('zen.apps.main', onCmdAppsMenu(false))
    zvscmd.ensure('zen.apps.main.alt', onCmdAppsMenu(true))
}

function onCmdAppsMenu(forceListAllApps: boolean) {
    return () => {
        forceListAllApps = true
        if (forceListAllApps) {
        }
    }
}
