import * as vs from 'vscode'
import vsproj = vs.workspace

function get<T>(section: string, def: T) {
    return vsproj.getConfiguration().get<T>(section, def)
}

function getDiagSev(section: string, def: vs.DiagnosticSeverity) {
    return get<number>(section, def) as vs.DiagnosticSeverity
}

function getStrs(section: string, def: string[]) {
    return get<string[]>(section, def)
}

let _langs: string[] = undefined
export function langs() {
    if (_langs === undefined) {
        _langs = []
        const langprogs = langProgs()
        for (const langid in langprogs)
            if (langprogs[langid])
                _langs.push(langid)
    }
    return _langs
}

export function langOk(langId: string) {
    return langId && langs().includes(langId)
}

export function langProg(langid: string) {
    return langProgs()[langid]
}

let _progs: { [_langId: string]: string } = undefined
export function langProgs() {
    if (_progs === undefined)
        _progs = get<{}>("zentient.langProgs", {})
    return _progs
}

export function diagSeverityStickiness() {
    return getDiagSev("zentient.diagSeverityStickiness", vs.DiagnosticSeverity.Error)
}

export function favFolders() {
    return getStrs("zentient.favFolders", [])
}
export function termStickies() {
    return getStrs("zentient.termStickies", [])
}
