import * as vs from 'vscode'
import vscmd = vs.commands
import vsproj = vs.workspace
import vswin = vs.window

import * as u from './util'
import * as z from './zentient'
import * as zconn from './conn'
import * as zproj from './proj'


type RespCmd = { Title: string , Exists: boolean , Hint: string }


//  All zen:// requests end up here to retrieve text
export function loadZenProtocolContent (uri: vs.Uri)
:vs.ProviderResult<string> {
    if (zconn.isDead()) throw new Error(zconn.errMsgDead)
    switch (uri.authority) {
        case 'raw':
            const outfmt = (obj: any)=>
                '\n' + JSON.stringify(obj, null, '\t\t') + '\n\n'
            return zconn.requestJson(uri.query).then (
                (resp: any)=> outfmt(resp),
                (fail: Error)=> {  z.outThrow(fail, "loadZenProtocolContent'raw") }
            )
        case 'cap':
            return zconn.requestJson(uri.query).then((resp: { [_zid: string]: RespCmd[] })=> {
                let     s = ""
                const   c = uri.query.split(':')[2],
                        mult = c==='diag'
                for (const zid in resp) if (zid && z.langs[zid]) {
                    const custtool = zproj.cfgTool(zid, c)
                    s += "<h2>" + uri.path.split('/')[2] + " for: <code>" + z.langs[zid].join('</code>, <code>') +"</code></h2>"
                    if (!resp[zid])
                        s += "<p>(<i>Not supported</i>)</p>"
                    else {
                        s += "<p>For " + uri.fragment + ", the Zentient backend looks for the following tools" + (mult  ?  ""  :  " in this order") + ":</p><ul>"
                        if ((!resp[zid].length) && (!custtool)) s+= "<li><i>(none / not applicable)</i></li>"
                            else {
                                if (!mult)
                                    s+= "<li>(Custom: " + (custtool  ?  ("<code>"+custtool+"</code>")  :  ("<b>none</b>")) + ")<ul><li>(<i>change this slot via the <code>zen.tool." + c + "." + zid + "</code> setting in your <code>settings.json</code></i>)</li></ul></li>"
                                for (const c of resp[zid])
                                    try {
                                        s+= "<li><code>" + c.Title + "</code><ul><li>"
                                        s+= (c.Exists  ?  "<i>available</i>"  :  ("<b>not available:</b> to install, " + u.strReEnclose('`', '`', '<code>', '</code>', c.Hint)))
                                        s+= "</li></ul></li>"
                                    } catch (_) { // HACKILY HANDLED FOR NOW: why is c[foo] undefined but not c, during very-early-init?!
                                        throw "Zentient backend still (re)initializing.. please retry shortly"
                                    }
                            }
                        if (mult) s += "</ul><p>and merges their outputs.</p>"
                            else s += "</ul><p>and invokes the first one found to be available.</p>"
                    }
                }
                if (s)  //  this until VScode's page scrolling becomes quirk-free in Gnome
                    s +=  "<br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/>"
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


export function zenProtocolUrlFromQueryMsg (handler: string, dirpath: string, displaypath: string, querymsg: string) {
    return 'zen://' + handler + '/' + (dirpath ? dirpath : zproj.now.toString()) + '/' + displaypath + '?' + querymsg
}
