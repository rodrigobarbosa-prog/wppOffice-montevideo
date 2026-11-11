export function createLoadingProgress(onChange){
 const weights={office:55,lighting:10,people:20,welcome:15},values=Object.fromEntries(Object.keys(weights).map(k=>[k,0]));let maximum=0;
 return {set(stage,fraction,message){values[stage]=Math.max(values[stage],Math.min(1,Math.max(0,fraction)));maximum=Math.max(maximum,Math.floor(Object.keys(weights).reduce((sum,k)=>sum+weights[k]*values[k],0)));onChange({percent:maximum,message});}};
}
