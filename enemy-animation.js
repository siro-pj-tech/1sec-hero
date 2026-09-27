(function(root){
  const heights={goblin:90,skeleton:100,scorpion:92,bandit:100,golem:116,dark_knight:112,demon:120,dragon_guard:116,demon_king:144};
  const specs=Object.fromEntries(Object.entries(heights).map(([id,height])=>[id,{cell:320,anchorX:160,groundY:288,scale:height/160,path:`./assets/enemies/${id}.png`}]));
  specs.slime={cell:128,anchorX:64,groundY:122,scale:1,path:'./assets/enemies/slime.png'};
  const api={specs,actions:['通常','予備動作','攻撃','被弾','撃破']};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.EnemyAnimation=api;
})(typeof globalThis!=='undefined'?globalThis:this);
