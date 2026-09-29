(function (root) {
  'use strict';
  const ENEMIES = [
    ['slime','スライム',75,22,'plains','はじまりの草原','まずは、1秒の感覚をつかもう。'],
    ['goblin','ゴブリン',240,30,'plains','木陰の小径','盾に変わっても、操作は同じ。'],
    ['skeleton','スケルトン',350,36,'plains','忘れられた遺跡','正確な一閃が、旅を短くする。'],
    ['scorpion','サソリ',480,41,'desert','陽炎の砂海','焦らず、いつもの一秒を。'],
    ['bandit','バンディット',640,46,'desert','盗賊の隠れ道','金貨を力に変え、先へ進もう。'],
    ['golem','ゴーレム',820,52,'desert','砂の巨人','重い一撃も、盾で弾ける。'],
    ['dark_knight','ダークナイト',1050,59,'volcano','紅蓮の門','鍛えた剣と盾を、信じよう。'],
    ['demon','デーモン',1280,66,'volcano','灼熱の回廊','炎の中でも、心は静かに。'],
    ['dragon_guard','ドラゴンガード',1550,74,'volcano','魔王城の番人','あと一歩。その一秒を研ぎ澄ませ。'],
    ['demon_king','魔王',1950,84,'demon_castle','最後の一秒','世界の夜明けを、その手で。']
  ].map((v,i)=>({id:v[0],name:v[1],hp:v[2],atk:v[3],region:v[4],title:v[5],flavor:v[6],reward:55+i*20}));
  const CONFIG = {maxHp:100, attackEvery:3, maxHold:1.5, retry:'first-stage', maxLevel:10, defaultDifficulty:'veteran'};
  const SCENE_TIMES = {enemyDefeat:2400,enemyFadeStart:170,enemyFadeEnd:1870,fatalFastFrame:140,fatalSlowFrame:600,deathFall:4000,deathHold:2000,deathTitle:3000,deathFade:700,reveal:600};
  const DIFFICULTIES = {
    rookie:{name:'ルーキー',windows:[.065,.143,.260],gauge:true},
    veteran:{name:'ベテラン',windows:[.020,.035,.050],gauge:true},
    hero:{name:'ヒーロー',windows:[.020,.035,.050],gauge:false}
  };
  function difficulty(key){return Object.hasOwn(DIFFICULTIES,key)?key:CONFIG.defaultDifficulty;}
  // Feedback follows the visible millisecond precision; grade calculation retains raw time.
  function timingDisplay(seconds,timeout=false){const value=seconds.toFixed(3),visible=Number(value);return {value,hint:timeout?'時間超過':visible<1?'少し早い':visible>1?'少し遅い':'ぴったり！'};}
  function fatalAttackPose(ms){const fast=SCENE_TIMES.fatalFastFrame*2,slow=SCENE_TIMES.fatalSlowFrame*2,duration=fast+slow,t=Math.max(0,Math.min(ms,duration));return {frame:t<fast?Math.floor(t/SCENE_TIMES.fatalFastFrame):Math.min(3,2+Math.floor((t-fast)/SCENE_TIMES.fatalSlowFrame)),offset:t<fast?46*t/fast:46+46*(t-fast)/slow,impact:t>=fast,done:t>=duration,duration};}
  function judge(seconds,mode=CONFIG.defaultDifficulty) {const diff=Math.abs(seconds-1),w=DIFFICULTIES[difficulty(mode)].windows;return diff<=w[0]+1e-9?'PERFECT':diff<=w[1]+1e-9?'GREAT':diff<=w[2]+1e-9?'GOOD':'MISS';}
  function attackPower(level){return 24+12*(level-1);}
  function defenseFactor(level){return 1-.05*(level-1);}
  function goldFactor(level){return 1+.2*(level-1);}
  function price(type,level){return level>=10?null:Math.round(({attack:35,defense:30,gold:25}[type])*1.36**(level-1));}
  function calculateScore(s){
    if(s.phase!=='clear')return null;
    const actions=s.stats.attacks+s.stats.guards,perfects=s.stats.perfects;
    const goldBase=s.gold*perfects,accuracyBonus=Math.round(10000*perfects/Math.max(1,actions)),hpBonus=s.hp*50,clearBonus=10000;
    const difficultyMultiplier={rookie:1,veteran:1.5,hero:2}[s.difficulty],actionFactor=100/(100+actions),attempts=s.stats.deaths+1;
    const total=Math.floor((goldBase+accuracyBonus+hpBonus+clearBonus)*difficultyMultiplier*actionFactor/attempts);
    return {total,gold:s.gold,perfects,actions,goldBase,accuracyBonus,hpBonus,clearBonus,difficultyMultiplier,actionFactor,attempts};
  }
  function createRun(mode=CONFIG.defaultDifficulty){return {difficulty:difficulty(mode),stage:0,hp:100,enemyHp:ENEMIES[0].hp,gold:0,levels:{attack:1,defense:1,gold:1},attacksSinceGuard:0,mode:'attack',phase:'ready',last:null,score:null,stats:{attacks:0,guards:0,perfects:0,earned:0,deaths:0},rewarded:false};}
  function begin(s){if(s.phase!=='ready')return false;s.phase='holding';return true;}
  function cancel(s){if(s.phase==='holding'){s.phase='ready';return true;}return false;}
  function resolve(s,seconds,timeout=false){
    if(s.phase!=='holding')return null;
    const grade=timeout?'MISS':judge(seconds,s.difficulty), mode=s.mode;
    const multiplier={PERFECT:3.8,GREAT:1.6,GOOD:.8,MISS:0}[grade];
    let damage;
    if(mode==='attack'){
      damage=Math.floor(attackPower(s.levels.attack)*multiplier);
      s.enemyHp=Math.max(0,s.enemyHp-damage);s.attacksSinceGuard++;s.stats.attacks++;
    }else{
      const ratio={PERFECT:0,GREAT:.25,GOOD:.6,MISS:1}[grade];
      damage=ratio===0?0:Math.max(1,Math.ceil(ENEMIES[s.stage].atk*ratio*defenseFactor(s.levels.defense)));
      s.hp=Math.max(0,s.hp-damage);s.stats.guards++;s.attacksSinceGuard=0;
    }
    if(grade==='PERFECT')s.stats.perfects++;
    s.phase='result';s.last={grade,mode,seconds,damage,timeout};return s.last;
  }
  function finish(s){
    if(s.phase!=='result')return null;
    if(s.hp<=0){s.phase='over';s.stats.deaths++;return 'over';}
    if(s.enemyHp<=0){
      if(!s.rewarded){const amount=Math.round(ENEMIES[s.stage].reward*goldFactor(s.levels.gold));s.gold+=amount;s.stats.earned+=amount;s.rewarded=true;s.last.reward=amount;}
      s.phase=s.stage===ENEMIES.length-1?'clear':'shop';if(s.phase==='clear')s.score=calculateScore(s);return s.phase;
    }
    s.mode=s.attacksSinceGuard>=CONFIG.attackEvery?'defense':'attack';s.phase='ready';return s.mode;
  }
  function buy(s,type){
    if(s.phase!=='shop'||!Object.hasOwn(s.levels,type))return false;
    const cost=price(type,s.levels[type]);if(cost===null||s.gold<cost)return false;
    s.gold-=cost;s.levels[type]++;return true;
  }
  function resetStage(s){s.enemyHp=ENEMIES[s.stage].hp;s.mode='attack';s.attacksSinceGuard=0;s.phase='ready';s.rewarded=false;s.last=null;}
  function next(s){if(s.phase!=='shop'||s.stage>=9)return false;s.stage++;resetStage(s);return true;}
  function retry(s){if(s.phase!=='over')return false;if(CONFIG.retry==='reset'){const fresh=createRun(s.difficulty);Object.assign(s,fresh);}else{if(CONFIG.retry==='first-stage')s.stage=0;s.hp=CONFIG.maxHp;resetStage(s);}return true;}
  const api={ENEMIES,CONFIG,SCENE_TIMES,DIFFICULTIES,difficulty,timingDisplay,fatalAttackPose,judge,attackPower,defenseFactor,goldFactor,price,calculateScore,createRun,begin,cancel,resolve,finish,buy,next,retry};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HeroCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
