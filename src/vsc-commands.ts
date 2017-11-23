import * as vs from 'vscode'
import vscmd = vs.commands

import * as z from './zentient'


let regCmds: string[] = []


export type CmdHandler = (_: any) => any
export type EdCmdHandler = (_: vs.TextEditor, __: vs.TextEditorEdit, ...___: any[]) => void

export function ensureCmd(command: string, handler: CmdHandler) {
    if (regCmds.indexOf(command) < 0) {
        regCmds.push(command)
        z.regDisp(vscmd.registerCommand(command, handler))
    }
}

export function ensureEdCmd(command: string, handler: EdCmdHandler) {
    if (regCmds.indexOf(command) < 0) {
        regCmds.push(command)
        z.regDisp(vscmd.registerTextEditorCommand(command, handler))
    }
}

export function exec(cmdId: string): Thenable<{}> {
    return vscmd.executeCommand(cmdId)
}
