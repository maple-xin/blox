import {validSave} from './logic.js';
export const SAVE_KEY='block-and-bloom-campaign-v1';
export const LEGACY_KEY='block-and-bloom-legacy-v1';
export function loadProgress(storage){
 const current=storage.getItem(SAVE_KEY);
 // Once the campaign has a save, never fall back to an older version's slot.
 const raw=current===null?storage.getItem(LEGACY_KEY):current;
 try{const progress=JSON.parse(raw);return validSave(progress?.state)?progress:null;}catch{return null;}
}
export function saveProgress(storage,progress){storage.setItem(SAVE_KEY,JSON.stringify(progress));}
