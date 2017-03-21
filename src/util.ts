import * as vs from 'vscode'



export function strReplacer (repls :{ [key :string] :string }) {
    return (val :string)=> {
        for (const old in repls) val = val.replace(old, repls[old])
        return val
    }
}



export function thenDo (...steps :(string | (()=>void))[]) {
    let prom :Thenable<void> = undefined,
        chain :Thenable<void> = undefined
    for (let i = 0 , step = steps[0]   ;   i < steps.length   ;   step = steps[++i]) {
        prom = typeof step === 'string' ? vs.commands.executeCommand<void>(step as string)
                                        : new Promise<void>((ondone)=> { (step as ()=>void)() ; ondone() })
        chain = chain ? chain.then(()=> prom) : prom
    }
    return chain ? chain : Promise.resolve()
}

export function thenDont () {
    return thenDo()
}

export function thenFail (reason :string) {
    return Promise.reject<string>(reason)
}

export function thenHush () {
    return Promise.resolve<string>(null)
}
