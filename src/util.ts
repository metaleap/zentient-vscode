

export function strReplacer (repls :{ [key :string] :string }) {
    return (val :string)=> {
        for (const old in repls) val = val.replace(old, repls[old])
        return val
    }
}
