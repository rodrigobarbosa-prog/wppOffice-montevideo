import {entryVestibule} from './arrival-layout.js';
// Keep the entrance fixed; translate the complete office beyond its inner corner.
export const officeShiftZ=entryVestibule.z1;
// Original game plan: passage2 rotated +90 degrees into the main office.
export const horizontalScale=.6;
export function fromGame(x,z){return {x:7+(x-28.9)*horizontalScale,z:(z-10.18)*horizontalScale};}
export const partition={x:fromGame(13.96,0).x,z1:fromGame(0,-11.85).z,z2:fromGame(0,6.25).z};
// The slogan faces the end of the partition; the service door is just beside it.
export const serviceWall={mottoX:partition.x,mottoWidth:1.75,doorX:partition.x-3,doorWidth:1.03};
export const kitchen={x1:serviceWall.doorX-7.55,x2:serviceWall.doorX-4.15,z1:0,z2:2.45,openingHeight:2.47};
// Remove the excess width beside team J&J, bringing the west facade closer.
export const officeWest=-15.6;
export const cornerColumn={x:officeWest+.45,z:-11.85,size:.65};
export const meetingRooms=[
 {id:'01',x1:9.85,x2:15,z1:-8.2,z2:-2.55,doorZ:-7.35,doorWidth:1.05,seats:6,tableLength:2.7,tableX:11.8},
 {id:'02',x1:9.85,x2:15,z1:-13.6,z2:-8.2,doorZ:-9.05,doorWidth:1.05,seats:8,tableLength:3.2}
];
export const meetingColumn={x:11.25,z:-13.25};
// Add one 1.4 m station at the kitchen end; keep the column end fixed at z=-10.9.
export const perimeterDesk={x:officeWest+.1,z:-6.7,length:8.4,seats:6,rotation:Math.PI/2,wall:true,wallSide:1};
// One wide workstation fills the single window bay beside the J&J wall.
export const kitchenWindowBay={z1:-2.5,z2:0};
export const kitchenWindowDesk={...perimeterDesk,z:-1.325,length:2.35,seats:1};
export const passageDesks=[-6,0,4.8].map(z=>({...fromGame(24.9+z,-1.3-.25),length:15.5*horizontalScale,seats:6,rotation:Math.PI/2}));
export const officeDesks=[-8.1,-3.4,2,9.8].map(x=>({...fromGame(x,-.75),length:(x===-8.1?14.6:17.5)*horizontalScale,seats:6,rotation:Math.PI/2}));
// User correction: the partition-side run has ONE working side, flush to the glass.
Object.assign(officeDesks[officeDesks.length-1],{x:partition.x-.10,wall:true});
// Same-view photo comparison: remove the oversized central gap between the runs.
// Leave roughly one metre between occupied chairs, rather than an empty plaza.
[-12.1,-8.8,-5.5].forEach((x,index)=>{officeDesks[index].x=x;});
// No tabletop may project beyond the near end of the partition into the aisle.
export const deskEndLimit=partition.z2-.12;
for(const row of [...passageDesks,...officeDesks]){
 const farEnd=row.z-row.length/2,nearEnd=Math.min(row.z+row.length/2,deskEndLimit);
 row.length=nearEnd-farEnd;row.z=(farEnd+nearEnd)/2;
}
// The original game's exterior workstation is turned across the other long runs.
export const exteriorDesk={x:officeWest+1.4,z:-12.85,length:3.7*horizontalScale,seats:1,rotation:0,single:true};
// A matching single-sided run belongs on the east (passage 1) side too.
Object.assign(officeDesks.at(-1),{wallSide:-1});
[1.5,4.8,8.1].forEach((x,index)=>{passageDesks[index].x=x;});
passageDesks.unshift({...officeDesks.at(-1),x:partition.x+.10,wallSide:1});
// User-marked block beside the meeting rooms is removed, including its chairs.
passageDesks.pop();
const entryAisleRow=passageDesks.at(-1),entryAisleFar=entryAisleRow.z-entryAisleRow.length/2;
entryAisleRow.length=-4.05-entryAisleFar;entryAisleRow.z=(entryAisleFar-4.05)/2;entryAisleRow.seats=5;
// One double workstation module fills the gap with two facing seats and a divider.
export const aisleEndDesk={x:entryAisleRow.x,z:(-4.05+deskEndLimit)/2,length:deskEndLimit+4.05,seats:1,rotation:Math.PI/2,single:false};

// Chair model faces local +Z; seated users face toward the table, unlike screens.
export function chairYawForSide(side){return side>0?Math.PI:0;}

export const collaboratorDesk=passageDesks[2];
export const collaboratorStation={x:collaboratorDesk.x+1.08,z:collaboratorDesk.z+collaboratorDesk.length/2-collaboratorDesk.length/collaboratorDesk.seats/2+officeShiftZ,yaw:-Math.PI/2};
