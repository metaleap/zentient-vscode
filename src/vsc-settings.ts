import * as vs from 'vscode'
import vsproj = vs.workspace

export function onActivate() {
    vsproj.onDidChangeConfiguration(() => {
        _langs = undefined
        _progs = undefined
        _livelangs = undefined
    })
}

function get<T>(section: string, def: T) {
    return vsproj.getConfiguration().get<T>(section, def)
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

export function languageIdOk(obj: { languageId: string }) {
    return obj && langOk(obj.languageId)
}

export function langProg(langid: string) {
    return langProgs()[langid]
}

let _progs: { [_langId: string]: string } = undefined
export function langProgs() {
    if (_progs === undefined)
        _progs = get<{ [_langId: string]: string }>("zentient.langProgs", {})
    return _progs
}

let _livelangs: string[] = undefined
export function liveLangs() {
    if (_livelangs === undefined) _livelangs = getStrs("zentient.liveLangs", [])
    return _livelangs
}

export function darkThemedPages() {
    return get<boolean>("zentient.darkThemedPages", false)
}

export function highlightMultipleOnly() {
    return get<boolean>("zentient.highlightMultipleOnly", false)
}

export function favFolders() {
    return getStrs("zentient.favFolders", [])
}

export function termStickies() {
    return getStrs("zentient.termStickies", [])
}
