export function acceptsMovementKey(event){
 return !event.altKey&&!event.ctrlKey&&!event.metaKey&&!event.target?.closest?.('input,textarea,select,[contenteditable="true"],[role="textbox"]');
}
export function movementKeyCode(event){
 if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code))return event.code;
 return {w:'KeyW',a:'KeyA',s:'KeyS',d:'KeyD',ArrowUp:'ArrowUp',ArrowDown:'ArrowDown',ArrowLeft:'ArrowLeft',ArrowRight:'ArrowRight'}[event.key?.length===1?event.key.toLowerCase():event.key]||null;
}
export function setupMovementKeyboard({target,keys,enabled,focus,onRelease=()=>{}}){
 const down=e=>{const code=movementKeyCode(e);if(!code||!enabled()||!acceptsMovementKey(e))return;e.preventDefault();keys.add(code);focus();};
 const up=e=>{const code=movementKeyCode(e);if(code)keys.delete(code);};
 const release=()=>{keys.clear();onRelease();};
 const regain=()=>{release();if(enabled())focus();};
 target.addEventListener('keydown',down,true);target.addEventListener('keyup',up,true);
 target.addEventListener('blur',release);target.addEventListener('focus',regain);
 return {release,regain};
}
