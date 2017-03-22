import * as vs from 'vscode'


export function sliceUntilLast (needle: string, haystack: string) {
    const idx = haystack.lastIndexOf(needle)
    return idx <= 0  ?  haystack  :  haystack.slice(0, idx)
}


//  not the most efficient for tight loops with big strings, just-fine for the episodic one-off / small strings
export function strReplacer (repls: {[_: string]: string}) {
    return (val: string)=> {
        for (const old in repls) val = val.replace(old, repls[old])
        return val
    }
}



export function thenDo  (...steps: (string|(()=>void))[]):
Thenable<void> {
    let prom: Thenable<void> = undefined,
        chain: Thenable<void> = undefined
    for (let i = 0 , step = steps[0]   ;   i < steps.length   ;   step = steps[++i]) {
        prom = typeof step === 'string' ? vs.commands.executeCommand<void>(step as string)
                                        : new Promise<void>((ondone)=> { (step as ()=>void)() ; ondone() })
        chain = chain  ?  chain.then(()=> prom)  :  prom
    }
    return chain  ?  chain  :  Promise.resolve()
}

export function thenDont () {
    return thenDo()
}

export function thenFail (reason: string) {
    return Promise.reject<string>(reason)
}

export function thenHush () {
    return Promise.resolve<string>(null)
}
