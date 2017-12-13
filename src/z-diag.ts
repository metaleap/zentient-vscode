import * as z from './zentient'
import * as zsrc from './z-src'


let allDiags: { [_langId: string]: Items } = {}


type Items = { [_filePath: string]: Item[] }

interface Item {
    ToolName: string
    FileRef: zsrc.Lens
    Message: string
}

export interface Resp {
    All: Items
    LangID: string
}

export function onDiags(msg: Resp) {
    allDiags[msg.LangID] = msg.All
    z.openJsonDocumentEditorFor(allDiags)
}
