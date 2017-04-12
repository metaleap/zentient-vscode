import * as vs from 'vscode'
import vswin = vs.window


import * as z from './zentient'


export type SrcMsg = { Ref: string, Msg: string, Pos1Ln: number, Pos1Ch: number, Pos2Ln: number, Pos2Ch: number, Data: { [_:string]: any }, Sev: number }


export type DiagData = { rf: string, rt: string, rn: string[] }

let vsreg = false


export function onAlive () {
    if (!vsreg) {
        z.regEdCmd('zen.coders.diagfixup', cmdCodersDiagFixup)

        vsreg = true
    }
}


export function cmdCodersDiagFixup (ed: vs.TextEditor, edit: vs.TextEditorEdit, d: vs.Diagnostic, dd: DiagData) {
    if (ed.document.isDirty)
        vswin.showInformationMessage("Not in unsaved modified files.")
            else edit.replace(d.range, dd.rt)
}


export function* diagFixupCommands (file: vs.TextDocument, diags: vs.Diagnostic[]) {
    let dd: DiagData
    if (diags && !file.isDirty) for (const d of diags) if ((dd = d['zen:data'] as DiagData) && dd.rf && dd.rt)
        yield { title: "Apply suggestion « " + d.message + " »", command: 'zen.coders.diagfixup', arguments: [d, dd] }
}
