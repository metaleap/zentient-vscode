import * as vs from 'vscode'
import vscmd = vs.commands
import vsproj = vs.workspace
import vswin = vs.window

import * as z from './zentient'
import * as zconn from './conn'
import * as zproj from './proj'


export type RespCmd = { Title: string , Exists: boolean , Hint: string, More: string }



//  All zen:// requests end up here to retrieve text
export function loadZenProtocolContent (uri: vs.Uri)
:vs.ProviderResult<string> {
    if (zconn.isDead()) throw new Error(zconn.errMsgDead)
    switch (uri.authority) {
        case 'out':
            return decodeURIComponent(uri.toString().slice('zen://out/'.length))
        case 'raw':
            const outfmt = (obj: any)=>
                JSON.stringify(obj, null, '\t\t')
            return zconn.requestJson(uri.query).then (
                (resp: any)=> outfmt(resp),
                (fail: Error)=> {  z.outThrow(fail, "loadZenProtocolContent'raw") }
            )
        case 'cap':
            return zconn.requestJson(uri.query).then((resp: { [_zid: string]: RespCmd[] })=> {
                let     s = "<style type='text/css'>a{ color: #5090d0; font-weight: bold } h2{ border-bottom: 0.088em dotted #808080 }</style>"
                const   cap = uri.query.split(':')[2],
                        mult = cap==='diag' || cap==='intel'
                for (const zid in resp) if (zid && z.langs[zid]) {
                    const   custtool = zproj.cfgCustomTool(zid, cap),
                            captitle = uri.path.split('/')[2],
                            capdesc = uri.fragment
                    s += "<h2>" + captitle + " for: <code>" + z.langs[zid].join('</code>, <code>') +"</code></h2>"
                    if (!resp[zid])
                        s += "<p>(<i>Not supported</i>)</p>"
                    else {
                        s += "<p>The Zentient backend looks for the following tools" + (mult  ?  ""  :  " in this order") + " to furnish <i>" + capdesc + "</i>:</p><ul>"
                        let hadmore = false  ;  if ((!resp[zid].length) && (!custtool)) s += "<li><i>(none / not applicable)</i></li>"
                            else {
                                if (!mult)
                                    s += "<li>(Custom: " + (custtool  ?  ("<b>"+custtool+"</b>")  :  ("<b>none</b>")) + ")<ul><li><i>change this slot via the <code>zen." + zid + "." + cap + ".custom</code> setting in your <code>settings.json</code></i></li></ul></li>"
                                for (const cmd of resp[zid])
                                    try {
                                        if (cmd.More) hadmore = true
                                        s += "<li><b>" + cmd.Title + "</b>" + ((!cmd.More)  ?  ""  :  (" &mdash; " + cmd.More)) + "<ul><li>"
                                        s += (cmd.Exists  ?  "<i>installed</i>"  :  ("<i>not found:</i>"))
                                        if (cmd.Exists && zproj.cfgDisabledTools(zid, cap).includes(cmd.Title)) s += ", <b style='color:gold'>disabled</b>"
                                        if (cmd.Hint) try { s += "</li><li><a href='" + vs.Uri.parse("http://" + cmd.Hint) + "'>" + (cmd.Exists  ?  "update"  :  "install") + "..</a>" } catch (_) { s += "</li><li>" + cmd.Hint }
                                        s += "</li></ul></li>"
                                    } catch (_) {
                                        throw "Zentient backend still (re)initializing.. please retry shortly"
                                    }
                            }
                        if (!mult) s += "</ul><p>and invokes the first one found to be available.</p>"
                            else s += "</ul><p>and combines their outputs as fits the current context.</p><p>Unwanted ones that you don't want to uninstall can be <i>list</i>ed in the <code>zen." +
                                zid + "." + cap + ".disabled</code> setting in your <code>settings.json</code>.</p>" +
                                    ((!hadmore)  ?  ''  :  "<p>For features that multiple tools could equally provide, they'll be tried (if installed and enabled) in the above order.</p>")
                        s += "<p>Newly installed tools from the above list will be detected upon restarting the editor.</p>"
                    }
                    s += "<br/><br/>"
                }
                if (s)  //  this until VScode's page scrolling becomes quirk-free in Gnome
                    s +=  "<br/><br/><br/><br/><br/><br/><br/><br/>"
                return s
            },
            (fail)=> z.outThrow(fail, "loadZenProtocolContent'cap")
            )
        default:
            throw new Error(uri.authority)
    }
}



export function openUriInNewEd (uri: vs.Uri|string) {
    const u: vs.Uri = typeof uri !== 'string'  ?  uri  :  vs.Uri.parse(uri)
    return vsproj.openTextDocument(u).then(vswin.showTextDocument , vswin.showErrorMessage)
}

export function openUriInViewer (uri: vs.Uri|string) {
    const u: vs.Uri = typeof uri !== 'string'  ?  uri  :  vs.Uri.parse(uri)
    return vscmd.executeCommand('vscode.previewHtml', u, vs.ViewColumn.Two)
}


export function zenProtocolUrlFromQueryReq (handler: string, dirpath: string, displaypath: string, query: string) {
    return 'zen://' + handler + '/' + (dirpath ? dirpath : zproj.now.toString()) + '/' + displaypath + '?' + query
}
