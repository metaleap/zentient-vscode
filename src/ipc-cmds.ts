import * as zvscmd from './vsc-commands'

export function onActivate() {
    zvscmd.ensureEd('zen.cmds.listall', null)
}
