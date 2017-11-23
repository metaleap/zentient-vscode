import * as vs from 'vscode'

//  not the most efficient for critical loops with big strings, ok for the occasional one-off / small strings
export function strReplacer(repls: { [_: string]: string }) {
    return (val: string) => {
        for (const old in repls)
            while (val.includes(old))
                val = val.replace(old, repls[old])
        return val
    }
}

export function thenDo(...steps: (string | (() => void))[]):
    Thenable<void> {
    let prom: Thenable<void> = undefined,
        chain: Thenable<void> = undefined
    for (let i = 0, step = steps[0]; i < steps.length; step = steps[++i]) {
        prom = typeof step === 'string' ? vs.commands.executeCommand<void>(step as string)
            : new Promise<void>((ondone) => { (step as () => void)(); ondone() })
        chain = chain ? chain.then(() => prom) : prom
    }
    return chain ? chain : Promise.resolve()
}

export function thenDont() {
    return thenDo()
}

export function thenFail(reason: any) {
    return Promise.reject<any>(reason)
}

export function thenHush() {
    return Promise.resolve<string>(null)
}

export function then<T>(v: T) {
    return Promise.resolve<T>(v)
}
