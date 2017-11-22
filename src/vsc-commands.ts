import * as vs from 'vscode'
import vscmd = vs.commands

import * as z from './z'


let regCmds: string[] = []

export type CmdHandler = (_: any) => any
export type EdCmdHandler = (_: vs.TextEditor, __: vs.TextEditorEdit, ...___: any[]) => void

export function ensureCmd(command: string, handler: CmdHandler) {
    if (regCmds.indexOf(command) < 0) {
        z.disps.push(vscmd.registerCommand(command, handler))
        regCmds.push(command)
    }
}

export function ensureEdCmd(command: string, handler: EdCmdHandler) {
    if (regCmds.indexOf(command) < 0) {
        z.disps.push(vscmd.registerTextEditorCommand(command, handler))
        regCmds.push(command)
    }
}
