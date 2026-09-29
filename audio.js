/* Local audio files work over both file:// and static HTTP hosting. */
(() => {
  'use strict';
  const MUSIC={title:'Chronicles of the Divided Realm',battle:'Sword Magic Battle',boss:'Lord of Despair',shop:'Fairy Tree Emporium',clear:'Peace Restored',credits:'Dawn of the New Era',over:'Requiem for the Fallen'};
  const EFFECTS=['hold_start','judge_perfect','judge_great','judge_good','judge_miss','guard_warning','guard_block','guard_perfect','hero_damage','enemy_defeat','shop_buy','shop_charges','ui_confirm','relive'];
  class HeroSound {
    constructor(settings,onError){this.settings=settings;this.onError=onError;this.tracks={};this.current='title';this.unlocked=false;this.suspended=false;this.voices=new Set();this.pool={};this.hold=null;this.holdTimer=null;
      for(const key of EFFECTS){const voice=new Audio(`./assets/audio/se_lab/${key}.mp3`);voice.preload='auto';this.pool[key]=[voice];}
    }
    tryPlay(voice){const promise=voice.play();if(promise)promise.catch(error=>{if(error.name!=='AbortError')this.onError(error);});}
    unlock(){this.unlocked=true;this.ensure();}
    ensure(){if(!this.current||!this.unlocked||this.suspended||this.settings.bgm===0)return;let track=this.tracks[this.current];if(!track){track=new Audio(`./assets/audio/${encodeURIComponent(MUSIC[this.current])}.mp3`);track.loop=true;track.volume=0;track.preload='metadata';this.tracks[this.current]=track;}if(track.paused)this.tryPlay(track);}
    change(key){if(!Object.hasOwn(MUSIC,key))return;this.current=key;if(key==='over'&&this.tracks[key])this.tracks[key].currentTime=0;this.ensure();}
    tick(dt){for(const [key,track]of Object.entries(this.tracks)){const target=!this.suspended&&key===this.current?this.settings.bgm:0;track.volume=Math.max(0,Math.min(1,track.volume+(target-track.volume)*Math.min(1,dt/110)));if(target===0&&track.volume<.004){track.volume=0;track.pause();}}}
    volumesChanged(){for(const voice of this.voices)voice.volume=this.settings.se*(voice===this.hold ? .55 : 1);this.ensure();}
    silenceMusic(){this.current=null;for(const track of Object.values(this.tracks)){track.pause();track.volume=0;}}
    silenceAll(){this.silenceMusic();this.stopHold();for(const voice of [...this.voices])this.stop(voice);}
    stopSE(key){for(const voice of this.pool[key]||[])this.stop(voice);}
    stop(voice){if(!voice)return;voice.pause();voice.currentTime=0;voice.loop=false;this.voices.delete(voice);}
    stopHold(){clearTimeout(this.holdTimer);this.holdTimer=null;this.stop(this.hold);this.hold=null;}
    pause(){this.suspended=true;this.stopHold();for(const voice of [...this.voices])this.stop(voice);for(const track of Object.values(this.tracks)){track.pause();track.volume=0;}}
    resume(){this.suspended=false;this.ensure();}
    playSE(key,{loop=false,gain=1}={}){if(!this.unlocked||this.suspended||this.settings.se===0||!Object.hasOwn(this.pool,key))return null;const pool=this.pool[key];let voice=pool.find(a=>!this.voices.has(a));if(!voice){voice=pool[0].cloneNode();voice.preload='auto';pool.push(voice);}if(this.voices.size>=8)this.stop(this.voices.values().next().value);voice.currentTime=0;voice.loop=loop;voice.volume=this.settings.se*gain;voice.onended=()=>this.voices.delete(voice);voice.onerror=()=>{this.voices.delete(voice);this.onError(new Error('SE: '+key));};this.voices.add(voice);this.tryPlay(voice);return voice;}
    startHold(blind){this.stopHold();this.hold=this.playSE('hold_start',{loop:!blind,gain:.55});if(blind)this.holdTimer=setTimeout(()=>this.stopHold(),80);}
    result(grade,mode){this.stopHold();const key=mode==='defense'&&grade!=='MISS'?(grade==='PERFECT'?'guard_perfect':'guard_block'):'judge_'+grade.toLowerCase();this.playSE(key);}
  }
  HeroSound.music=Object.freeze({...MUSIC});
  window.HeroSound=HeroSound;
})();
