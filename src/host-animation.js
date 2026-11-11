// Two-link leg IK in the character's Y/Z plane. +Z is forward.
export function legPose(phase,weight,bodyY){
 const p=((phase/(2*Math.PI))%1+1)%1;
 const stance=p<.6,progress=stance?p/.6:(p-.6)/.4;
 const z=(stance?.185-.37*progress:-.185+.37*(progress*progress*(3-2*progress)))*weight;
 const lift=stance?0:Math.sin(progress*Math.PI)*.10*weight;
 const y=-.782-bodyY+lift,a=.405,b=.377;
 const distance=Math.min(a+b-.0001,Math.hypot(y,z));
 const clamp=x=>Math.max(-1,Math.min(1,x));
 const knee=Math.PI-Math.acos(clamp((a*a+b*b-distance*distance)/(2*a*b)));
 const hip=Math.atan2(-z,-y)-Math.acos(clamp((a*a+distance*distance-b*b)/(2*a*distance)));
 return {hip,knee,ankle:-hip-knee,z,lift};
}
