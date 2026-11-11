// Photo pairs 25–27. Metres; inferred from reference photos, not a measured survey.
export const arrival={
 x1:-2,x2:9,z1:0,z2:2.6,height:2.75,
 lifts:[{x:0,side:'far',id:'C14',display:'14'},{x:3,side:'far',id:'E14',display:'20'},{x:3,side:'near',id:'F14',display:'14'}],
 woodDoors:[{x:6.5,side:'far',width:2.30,number:'1402',sign:'CORPORATIVA'}],
 mirrors:[{x:1.48,side:'far',width:.40},{x:4.48,side:'far',width:.40},{x:1.49,side:'near',width:.45}],
 endDoors:[{x:-1.97,width:1.02,handleSide:1},{x:8.97,width:1.02,handleSide:-1}],
};
// Inner return beside the left entrance jamb, shown in the extinguisher photo.
export const entryVestibule={x:5.66,z1:-2.05,z2:0,thickness:.16,height:2.85,fireZ:-1.65};
export const entryBrandWall={
 // Local elevation, rotated +90 degrees around Y into the west face of room 01.
 origin:{x:8.2,z:0},rotation:Math.PI/2,
 x1:0,x2:2.55,z:-.153,pierX:2.71,
 returnDepth:1.65,
 cabinet:{x:2.93,z:.49,width:.69,depth:.54,height:2.02,rotation:-Math.PI/2},
 printer:{x:2.96,z:1.26,width:.68,depth:.60,rotation:-Math.PI/2},
};

