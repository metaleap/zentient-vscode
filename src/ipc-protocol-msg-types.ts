import * as vs from 'vscode'


export enum CaddyStatus {
    PENDING,
    ERROR,
    BUSY,
    GOOD
}


export enum IDs {
    _,

    MENUS_MAIN,
    MENUS_PKGS,
    MENUS_TOOLS,

    OBJ_SNAPSHOT,
    PAGE_HTML,
    TREEVIEW_GETITEM,
    TREEVIEW_CHILDREN,
    TREEVIEW_CHANGED,
    CFG_RESETALL,
    CFG_LIST,
    CFG_SET,
    NOTIFY_INFO,
    NOTIFY_WARN,
    NOTIFY_ERR,

    PROJ_CHANGED,
    PROJ_POLLEVTS,

    SRCDIAG_LIST,
    SRCDIAG_RUN_CURFILE,
    SRCDIAG_RUN_OPENFILES,
    SRCDIAG_RUN_ALLFILES,
    SRCDIAG_FORGETALL,
    SRCDIAG_PEEKHIDDEN,
    SRCDIAG_PUB,
    SRCDIAG_AUTO_TOGGLE,
    SRCDIAG_AUTO_ALL,
    SRCDIAG_AUTO_NONE,
    SRCDIAG_STARTED,
    SRCDIAG_FINISHED,

    SRCMOD_FMT_SETDEFMENU,
    SRCMOD_FMT_SETDEFPICK,
    SRCMOD_FMT_RUNONFILE,
    SRCMOD_FMT_RUNONSEL,
    SRCMOD_RENAME,
    SRCMOD_ACTIONS,

    SRCINTEL_HOVER,
    SRCINTEL_SYMS_FILE,
    SRCINTEL_SYMS_PROJ,
    SRCINTEL_CMPL_ITEMS,
    SRCINTEL_CMPL_DETAILS,
    SRCINTEL_HIGHLIGHTS,
    SRCINTEL_ANNS,
    SRCINTEL_SIGNATURE,
    SRCINTEL_REFERENCES,
    SRCINTEL_DEFSYM,
    SRCINTEL_DEFTYPE,
    SRCINTEL_DEFIMPL,

    EXTRAS_INTEL_LIST,
    EXTRAS_INTEL_RUN,
    EXTRAS_QUERY_LIST,
    EXTRAS_QUERY_RUN,
}



export interface Req {
    ri: number
    ii: IDs
    ia: any

    projUpd: WorkspaceChanges
    srcLens: SrcLens
}

export interface Resp {
    ii: IDs                     // IpcID
    ri: number                  // ReqID
    err: string                 // ErrMsg

    sI: RespSrcIntel               // SrcIntel
    srcDiags: RespDiag          // SrcDiags
    srcMods: SrcLens[]          // SrcMod
    srcActions: vs.Command[]    // SrcActions
    extras: RespExtras          // Extras
    menu: RespMenu              // Menu
    caddy: Caddy                // CaddyUpdate
    val: any                    // Val
}

export interface RespDiag {
    All: DiagItems
    LangID: string
    FixUps: DiagFixUps[]
}

export interface RespExtras extends SrcIntels {
    Items: ExtrasItem[]
    Warns: string[]
    Desc: string
    Url: string
}

interface RespMenu {
    SubMenu: Menu
    WebsiteURL: string
    NoteInfo: string
    NoteWarn: string
    UxActionLabel: string
    Refs: SrcLoc[]
}

interface RespSrcIntel extends SrcIntels {
    Sig: vs.SignatureHelp
    Syms: SrcLens[]
    Cmpl: vs.CompletionItem[]
    Anns: SrcAnnotaction[]
}

export interface Caddy {
    ID: string
    LangID?: string
    Icon: string
    Title: string
    Status: {
        Flag: CaddyStatus
        Desc: string
    }
    Details?: string
    UxActionID: string
    ShowTitle?: boolean
}

export interface DiagFixUps {
    FilePath: string
    Desc: { [_: string]: string[] }
    Edits: SrcModEdit[]
    Dropped: SrcModEdit[]
}

export interface DiagItem {
    Cat: string
    Loc: SrcLoc
    Msg: string
    SrcActions: vs.Command[]
    Sticky: boolean
    Tags: vs.DiagnosticTag[]
}

export type DiagItems = { [_filePath: string]: DiagItem[] }

export interface ExtrasItem extends vs.QuickPickItem {
    id?: string
    arg?: string
    fPos?: string
}

interface Menu {
    desc: string
    topLevel: boolean
    items: MenuItem[]
}

export interface MenuItem {
    ii: IDs
    ia: any     // IpcArgs
    c: string   // Category
    t: string   // Title
    d: string   // Description
    h: string   // Hint
    q: string   // Confirm
}

interface SrcAnnotaction {
    Range: SrcRange
    Title: string
    Desc: string
    CmdName: string
}

export interface SrcInfoTip {
    value: string
    language: string
}

interface SrcIntels {
    InfoTips: SrcInfoTip[]
    Refs: SrcLoc[]
}

// corresponds to SrcLens on the Go (backend) side.
// used in both certain reqs & resps. a use-what-you-need-how-you-need-to a-la-carte type
export interface SrcLens extends SrcLoc {
    t: string   // Txt (src-full, or longer text for that IpcID)
    s: string   // Str (src-sel, sym name, or shorter text for that IpcID)
    l: boolean  // CrLf
}

export interface SrcLoc {
    e: number   // enumish Flag: vs.SymbolKind | vs.DiagnosticSeverity
    f: string   // FilePath
    p: SrcPos
    r: SrcRange
}

export interface SrcModEdit {
    At: SrcRange
    Val: string
}

export interface SrcPos {
    o: number // 1-based Offset
    l: number // 1-based Line
    c: number // 1-based Col
}

export interface SrcRange {
    s: SrcPos  // Start
    e: SrcPos  // End
}

export interface WorkspaceChanges {
    AddedDirs?: string[]
    RemovedDirs?: string[]
    OpenedFiles?: string[]
    ClosedFiles?: string[]
    WrittenFiles?: string[]
    LiveFiles?: { [_filePath: string]: string }
}
