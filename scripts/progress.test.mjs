import {test} from 'node:test';
import assert from 'node:assert/strict';
import {freshGame,command,tick} from '../src/logic.js';
import {SAVE_KEY,LEGACY_KEY,loadProgress,saveProgress} from '../src/progress.js';
const store=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};
const progress=level=>({state:freshGame(level),history:[],completed:[]});
test('a new player has no implicit second-level save',()=>{assert.equal(loadProgress(store()),null);});
test('legacy progress can be imported, then old-version writes cannot replace the latest campaign',()=>{
 const s=store(),old=progress(2);s.setItem(LEGACY_KEY,JSON.stringify(old));assert.equal(loadProgress(s).state.level,2);
 const current=progress(9);current.state.started=true;command(current.state,50,'dig',1);tick(current.state,1/60);current.history.push(freshGame(9));
 saveProgress(s,current);s.setItem(LEGACY_KEY,JSON.stringify(old));assert.deepEqual(loadProgress(s),current);
 assert.equal(JSON.parse(s.getItem(LEGACY_KEY)).state.level,2,'legacy slot is left intact');
});
test('a broken campaign record never silently reloads the old second-level slot',()=>{
 const s=store();s.setItem(LEGACY_KEY,JSON.stringify(progress(2)));s.setItem(SAVE_KEY,'invalid');assert.equal(loadProgress(s),null);
});
test('storage write failure is reported to the caller instead of claiming success',()=>{
 assert.throws(()=>saveProgress({setItem(){throw new Error('quota');}},progress(9)),/quota/);
});
