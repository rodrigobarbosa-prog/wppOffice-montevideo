export const entryDoorPlan={x:7,z:0,halfSpan:1.12,leafWidth:1.117,thickness:.065,height:2.35,openAngle:Math.PI/2,reach:2.25};

export function doorPanels(angle,plan=entryDoorPlan){
 return [-1,1].map(side=>({x:plan.x+side*plan.halfSpan,z:plan.z,side,angle:side<0?angle:0,width:plan.leafWidth,thickness:plan.thickness}));
}
export function panelBlocks(panel,x,z,radius=.24){
 const dx=x-panel.x,dz=z-panel.z,c=Math.cos(panel.angle),s=Math.sin(panel.angle);
 const lx=dx*c-dz*s,lz=dx*s+dz*c;
 const a=panel.side<0?0:-panel.width,b=panel.side<0?panel.width:0;
 const nearX=Math.max(a,Math.min(b,lx)),nearZ=Math.max(-panel.thickness/2,Math.min(panel.thickness/2,lz));
 return (lx-nearX)**2+(lz-nearZ)**2<radius*radius;
}
export function createEntryDoorState(plan=entryDoorPlan){
 let angle=0,target=0,obstructed=false;
 const blockedAt=(a,x,z,r)=>doorPanels(a,plan).some(p=>panelBlocks(p,x,z,r));
 return {
  get angle(){return angle;},get targetOpen(){return target>0;},get obstructed(){return obstructed;},
  get panels(){return doorPanels(angle,plan);},
  blocked(x,z,r=.24){return blockedAt(angle,x,z,r);},
  canInteract(x,z,yaw){
   const dx=plan.x-x,dz=plan.z-z,distance=Math.hypot(dx,dz);
   return distance<plan.reach&&(distance<.45||(-Math.sin(yaw)*dx-Math.cos(yaw)*dz)/distance>.42);
  },
  applyRemote(snapshot){if(!snapshot||!Number.isFinite(snapshot.angle))return;angle=Math.max(0,Math.min(plan.openAngle,snapshot.angle));target=snapshot.open?plan.openAngle:0;obstructed=Boolean(snapshot.obstructed);},
  toggle(){target=target?0:plan.openAngle;obstructed=false;},
  update(dt,occupant){
   const difference=target-angle;
   if(Math.abs(difference)<.00001){obstructed=false;return false;}
   const next=angle+Math.sign(difference)*Math.min(Math.abs(difference),dt*1.25);
   const steps=Math.max(1,Math.ceil(Math.abs(next-angle)/.015));
   // Sweep the entire leaf movement, not just the destination, so a closing leaf cannot tunnel through a person.
   for(let i=1;i<=steps;i++){
    const candidate=angle+(next-angle)*i/steps;
    const occupants=Array.isArray(occupant)?occupant:occupant?[occupant]:[];
    if(occupants.some(person=>blockedAt(candidate,person.x,person.z,person.radius??.24))){obstructed=true;return false;}
   }
   obstructed=false;angle=next;return true;
  }
 };
}

