import * as vs from 'vscode'
import vsproj = vs.workspace

export function get<T>(section: string, def: T) {
    return vsproj.getConfiguration().get<T>(section, def)
}

export function getStrs(section: string, def: string[]) {
    return get<string[]>(section, def)
}
