import * as vs from 'vscode'
import vsproj = vs.workspace

function get<T>(section: string, def: T) {
    return vsproj.getConfiguration().get<T>(section, def)
}

function getStrs(section: string, def: string[]) {
    return get<string[]>(section, def)
}

export function favFolders() {
    return getStrs("zentient.favFolders", [])
}

export function langs() {
    const langs: string[] = []
    for (const langid in langProgs())
        langs.push(langid)
    return langs
}

export function langProg(langid: string) {
    return langProgs()[langid]
}

export function langProgs() {
    return get<{}>("zentient.langProgs", {})
}

export function termStickies() {
    return getStrs("zentient.termStickies", [])
}
