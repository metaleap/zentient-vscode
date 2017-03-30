import * as vs from 'vscode'
import vslang = vs.languages
import vsproj = vs.workspace
import vswin = vs.window

import * as u from './util'
import * as z from './zentient'
import * as zconn from './conn'


let vsreg: boolean = false,
    diag:   vs.DiagnosticCollection


export function cfgTool (zid: string, cap: string) {
    return vsproj.getConfiguration().get<string>('zen.tool.' + cap + '.' + zid)
}


export function* onAlive () {
    for (const ed of vswin.visibleTextEditors)
        onFileOpen(ed.document)
    if (!vsreg) { // might be respawn
        yield vsproj.onDidOpenTextDocument(onFileOpen)
        yield vsproj.onDidSaveTextDocument(onFileWrite)
        yield vsproj.onDidCloseTextDocument(onFileClose)
        if (!diag) {
            yield (diag = vslang.createDiagnosticCollection("ℤ"))
            refreshDiag()
        }
        vsreg = true
    }
}


function onFileEvent (file: vs.TextDocument, msg: string) {
    const langzid = z.fileLangZid(file)
    if (langzid) {
        zconn.sendMsg(msg + langzid + ':' + vsproj.asRelativePath(file.fileName))
        refreshDiag(file)
    }
}

function onFileClose (file: vs.TextDocument) {
    //  for uri.scheme==='file', occurs only on real close, not on editor tab deactivate
    onFileEvent(file, zconn.MSG_FILE_CLOSE)
}

function onFileOpen (file: vs.TextDocument) {
    //  for uri.scheme==='file', occurs on open and whenever editor tab activate (on linux, BUT on windows only the former apparently WTF?)
    onFileEvent(file, zconn.MSG_FILE_OPEN)
}

function onFileWrite (file: vs.TextDocument) {
    onFileEvent(file, zconn.MSG_FILE_WRITE)
}



function refreshDiag (doc: vs.TextDocument = null) {
    if ((!doc) && vswin.activeTextEditor)
        doc = vswin.activeTextEditor.document
    if (doc && !z.langOK(doc))
        doc = null
    if (doc && diag) {
        // diag.clear()
        const nonissues: vs.Diagnostic[] = []
        const txt = doc.getText().toLowerCase()
        const ihint = txt.indexOf("hint"), iwarn = txt.indexOf("warn"), ierr = txt.indexOf("error")
        const nonissue = (pos: number, msg: string, sev: vs.DiagnosticSeverity) =>
            nonissues.push ( new vs.Diagnostic(doc.getWordRangeAtPosition(doc.positionAt(pos)) as vs.Range, u.strFixupLinesForHover(msg), sev) )

        if (ihint>=0) nonissue(ihint, "IntelliGible: a hint-sight", vs.DiagnosticSeverity.Hint)
        if (iwarn>=0) nonissue(iwarn, "IntelliGible: forearm is fore-warned", vs.DiagnosticSeverity.Warning)
        if (ierr>=0) nonissue(ierr, "IntelliGible: time flies like an error! ---okay here's a fake error:\n\n    • Found hole: _ :: Bool\n    • In the expression: _\n      In a stmt of a pattern guard for\n                     an equation for ‘substitute’:\n        _\n      In an equation for ‘substitute’:\n          substitute old new\n            | old == new = id\n            | _ = fmap $ \ item -> if item == old then new else item\n    • Relevant bindings include\n        new :: a (bound at src/Util.hs:178:17)\n        old :: a (bound at src/Util.hs:178:13)\n        substitute :: a -> a -> [a] -> [a] (bound at src/Util.hs:178:1)\n", vs.DiagnosticSeverity.Error)
        nonissues.push( new vs.Diagnostic(new vs.Range(0,0 , 1,0), u.strFixupLinesForHover("IntelliGible: this is the 1st line. For more \"diagnostics\",  type 'hint' or 'warning' or 'error' anywhere."), vs.DiagnosticSeverity.Information) )
        diag.set(doc.uri, nonissues)
    }
}
