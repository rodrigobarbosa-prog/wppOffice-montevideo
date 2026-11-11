export function presenterWaitState({role,connected,client}){
 if(role!=='presenter')return {waiting:false,lockMovement:false};
 const screen=['approaching','viewing'].includes(client?.screenVisit),seated=Boolean(client?.seat?.id);
 return {waiting:screen||connected&&(!client||client.arriving||seated),lockMovement:screen||connected&&seated};
}
