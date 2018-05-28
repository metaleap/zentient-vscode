import * as vs from 'vscode'
import vswin = vs.window

import * as z from './zentient'


type listener = (_: Node) => any

export interface Node extends vs.TreeItem {
    getNodes?: () => Node[]
    nodes?: Node[]
}


export let roots: Node[] = []

let listeners: listener[] = [],

    mainTree: vs.TreeDataProvider<Node> = {
        onDidChangeTreeData: (l: listener): vs.Disposable => {
            listeners.push(l)
            return { dispose: () => { listeners = listeners.filter((lis) => lis !== l) } }
        },

        getChildren: (elem?: Node): vs.ProviderResult<Node[]> =>
            (!elem) ? roots : (elem.getNodes ? elem.getNodes() : (elem.nodes ? elem.nodes : []))
        ,

        getTreeItem: (elem: Node): vs.ProviderResult<vs.TreeItem> =>
            elem
    }


export function onActivate() {
    if (0 > 1) {
        z.regDisp(vswin.registerTreeDataProvider('zen.treeView', mainTree))
        roots.push(
            { label: "root 1", collapsibleState: vs.TreeItemCollapsibleState.Expanded, nodes: [{ label: "sub 1.1" }, { label: "sub 1.2" }], tooltip: "can *we* `markdown` _too_?" },
            { label: "root 2", collapsibleState: vs.TreeItemCollapsibleState.None, nodes: [{ label: "sub 2.1" }, { label: "sub 2.2" }] },
            { label: "root 3", collapsibleState: vs.TreeItemCollapsibleState.Collapsed, nodes: [{ label: "sub 3.1" }, { label: "sub 3.2" }] }
        )
    }
    onUpdated()
}

export function onUpdated(node: Node = undefined) {
    if (node)
        for (const l of listeners)
            l(node)
    else
        for (const l of listeners)
            l(undefined)
    // for (const root of roots)
    //     for (const l of listeners)
    //         l(root)
}
