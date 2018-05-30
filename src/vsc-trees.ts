import * as vs from 'vscode'
import vswin = vs.window

import * as z from './zentient'



type Item = string

export interface DataProvider extends vs.TreeDataProvider<Item> {
    onDidChange(_: Item): void
}



let dataProviders: { [_: string]: DataProvider } = {}



export function onActivate() {
    const treeviewids = ['pkgSyms', 'pkgDeps']

    for (const treeviewid of treeviewids) {
        const dp = newDataProvider(treeviewid)
        dataProviders[treeviewid] = dp
        z.regDisp(vswin.registerTreeDataProvider('zen.treeView.' + treeviewid, dp))
    }
}

function newDataProvider(_id: string): DataProvider {
    type listener = (_: Item) => any
    let listeners: listener[] = []
    const treeview: DataProvider = {
        onDidChangeTreeData: (l: listener): vs.Disposable => {
            listeners.push(l)
            return { dispose: () => { listeners = listeners.filter((lis) => lis !== l) } }
        },

        onDidChange: (item: Item) => {
            for (const l of listeners) l(item)
        },

        getChildren: (elem?: Item): vs.ProviderResult<Item[]> => {
            return elem ? [] : []
        },

        getTreeItem: (elem: Item): vs.ProviderResult<vs.TreeItem> => {
            return elem ? null : undefined
        }
    }
    return treeview
}
