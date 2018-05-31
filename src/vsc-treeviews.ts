import * as vs from 'vscode'
import vswin = vs.window

import * as z from './zentient'
import * as zipc_req from './ipc-req'
import * as zipc_resp from './ipc-resp'



const treeViewIDs = ['pkgSyms', 'pkgDeps']


type Item = string

export interface DataProvider extends vs.TreeDataProvider<Item> {
    onDidChange(_: Item): void
}



let dataProviders: { [_: string]: DataProvider } = {}



export function onActivate() {
    for (const treeviewid of treeViewIDs) {
        const dp = newDataProvider(treeviewid)
        dataProviders[treeviewid] = dp
        z.regDisp(vswin.registerTreeDataProvider('zen.treeView.' + treeviewid, dp))
    }
}

export function onChange(treePathParts: Item) {
    if (treePathParts) {
        const pos = treePathParts.indexOf(':')
        if (pos > 0) {
            const treeid = treePathParts.substring(0, pos)
            const dp = dataProviders[treeid]
            if (dp)
                dataProviders[treeid].onDidChange(treePathParts)
        }
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
            const onresp = (_langid: string, resp: zipc_resp.Msg): Item[] => resp.val as Item[]
            return zipc_req.forLang<Item[]>(undefined, zipc_req.IpcIDs.TREEVIEW_CHILDREN, elem, onresp)
        },

        getTreeItem: (elem: Item): vs.ProviderResult<vs.TreeItem> => {
            const onresp = (_langid: string, resp: zipc_resp.Msg): vs.TreeItem => resp.val as vs.TreeItem
            return zipc_req.forLang<vs.TreeItem>(undefined, zipc_req.IpcIDs.TREEVIEW_GETITEM, elem, onresp)
        }
    }
    return treeview
}
