export type Weapon = { id:string; name:string; level:number; cooldown:number; damage:number; speed:number; color:string; evolved?:boolean }
export type Enemy = { id:number; x:number; y:number; hp:number; maxHp:number; speed:number; radius:number; kind:'grunt'|'runner'|'tank'|'elite'|'boss'; color:string }
export type Gem = { id:number; x:number; y:number; value:number }
export type Player = { x:number; y:number; hp:number; maxHp:number; speed:number; level:number; xp:number; nextXp:number; coins:number; weapons:Weapon[]; magnet:number; armor:number; power:number }

const weaponPool:Weapon[] = [
 {id:'orb',name:'Arc Orb',level:1,cooldown:.7,damage:18,speed:420,color:'#7dd3fc'},
 {id:'blade',name:'Storm Blades',level:1,cooldown:1.1,damage:32,speed:0,color:'#c4b5fd'},
 {id:'nova',name:'Nova Pulse',level:1,cooldown:2.3,damage:48,speed:0,color:'#f0abfc'},
 {id:'meteor',name:'Meteor',level:1,cooldown:3.2,damage:75,speed:260,color:'#fb923c'},
 {id:'frost',name:'Frost Ring',level:1,cooldown:2.0,damage:28,speed:0,color:'#67e8f9'},
 {id:'spark',name:'Chain Spark',level:1,cooldown:1.5,damage:40,speed:500,color:'#fde047'}
]

export function createPlayer():Player { return {x:0,y:0,hp:100,maxHp:100,speed:230,level:1,xp:0,nextXp:10,coins:0,weapons:[structuredClone(weaponPool[0])],magnet:90,armor:0,power:1} }
export function pickUpgrades(player:Player):Weapon[] { const owned=new Set(player.weapons.map(w=>w.id)); const choices=[...weaponPool.filter(w=>!owned.has(w.id)),...player.weapons]; return choices.sort(()=>Math.random()-.5).slice(0,3) }
export function applyUpgrade(player:Player,id:string){ const w=player.weapons.find(x=>x.id===id); if(w){w.level++;w.damage=Math.round(w.damage*1.32);w.cooldown=Math.max(.25,w.cooldown*.9); if(w.level>=5)w.evolved=true } else { const base=weaponPool.find(x=>x.id===id); if(base)player.weapons.push(structuredClone(base)) } }
export function gainXp(player:Player,value:number){ player.xp+=value; const levels:number[]=[]; while(player.xp>=player.nextXp){player.xp-=player.nextXp;player.level++;player.nextXp=Math.round(player.nextXp*1.22+4);levels.push(player.level)} return levels }
export function spawnEnemy(id:number,minute:number):Enemy { const a=Math.random()*Math.PI*2; const r=650+Math.random()*180; const roll=Math.random(); let kind:Enemy['kind']='grunt'; if(minute>=2&&roll>.78)kind='runner'; if(minute>=4&&roll>.9)kind='tank'; if(minute>=7&&roll>.96)kind='elite'; const stats={grunt:[32,65,15],runner:[20,115,11],tank:[120,38,23],elite:[300,52,30],boss:[1800,30,46]}[kind]; return {id,x:Math.cos(a)*r,y:Math.sin(a)*r,hp:stats[0]*(1+minute*.13),maxHp:stats[0]*(1+minute*.13),speed:stats[1]*(1+minute*.015),radius:stats[2],kind,color:kind==='tank'?'#64748b':kind==='runner'?'#fb7185':kind==='elite'?'#a78bfa':'#4ade80'} }
export function spawnBoss(id:number,minute:number):Enemy { const a=Math.random()*Math.PI*2; return {id,x:Math.cos(a)*700,y:Math.sin(a)*700,hp:1800+minute*450,maxHp:1800+minute*450,speed:28,radius:48,kind:'boss',color:'#ef4444'} }
export function distance(a:{x:number;y:number},b:{x:number;y:number}){return Math.hypot(a.x-b.x,a.y-b.y)}
