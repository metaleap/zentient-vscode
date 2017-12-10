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

let zlangs: string[] = undefined
export function langs() {
    if (zlangs === undefined) {
        zlangs = []
        const langprogs = langProgs()
        for (const langid in langprogs)
            if (langprogs[langid])
                zlangs.push(langid)
    }
    return zlangs
}

export function langOk(langId: string) {
    return langs().includes(langId)
}

export function langProg(langid: string) {
    return langProgs()[langid]
}

let zprogs: { [_langId: string]: string } = undefined
export function langProgs() {
    if (zprogs === undefined)
        zprogs = get<{}>("zentient.langProgs", {})
    return zprogs
}

export function termStickies() {
    return getStrs("zentient.termStickies", [])
}
