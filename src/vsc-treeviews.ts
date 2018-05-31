import * as vs from 'vscode'
import vswin = vs.window

import * as z from './zentient'
import * as zipc_req from './ipc-req'
import * as zipc_resp from './ipc-resp'
import * as zipc_pipeio from './ipc-pipe-io'



const treeViewIds = ['pkgSyms', 'pkgDeps']


type Item = string

export interface DataProvider extends vs.TreeDataProvider<Item> {
    onDidChange(_: Item): void
}



let lastLangId: string,
    dataProviders: { [_: string]: DataProvider } = {}



export function onActivate() {
    for (const treeviewid of treeViewIds) {
        const dp = newDataProvider(treeviewid)
        dataProviders[treeviewid] = dp
        z.regDisp(vswin.registerTreeDataProvider('zen.treeView.' + treeviewid, dp))
    }
    z.regDisp(
        vswin.onDidChangeActiveTextEditor(onTextEditorChanged)
    )
}

function onTextEditorChanged(_te: vs.TextEditor) {
    if (zipc_pipeio.last && zipc_pipeio.last.langId && zipc_pipeio.last.langId !== lastLangId) {
        lastLangId = zipc_pipeio.last.langId
        for (const treeviewid of treeViewIds)
            dataProviders[treeviewid].onDidChange(undefined)
    }
}

export function onChange(treeViewID: string, item: Item) {
    const dp = dataProviders[treeViewID]
    if (dp)
        dataProviders[treeViewID].onDidChange(item)
}

function newDataProvider(treeViewId: string): DataProvider {
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
            return zipc_req.forLang<Item[]>(lastLangId, zipc_req.IpcIDs.TREEVIEW_CHILDREN, [treeViewId, elem], onresp)
        },

        getTreeItem: (elem: Item): vs.ProviderResult<vs.TreeItem> => {
            const onresp = (_langid: string, resp: zipc_resp.Msg): vs.TreeItem => resp.val as vs.TreeItem
            return zipc_req.forLang<vs.TreeItem>(lastLangId, zipc_req.IpcIDs.TREEVIEW_GETITEM, [treeViewId, elem], onresp)
        }
    }
    return treeview
}
