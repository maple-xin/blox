const ICONS = {
  bridge: '<path d="M3 17V9m18 8V9M3 12h18M7 12v5m5-5v5m5-5v5M2 18h20"/>',
  water: '<path d="M12 3S5 11 5 15a7 7 0 0 0 14 0c0-4-7-12-7-12ZM8 16c0 2 1 3 3 3"/>',
  wheel: '<circle cx="12" cy="12" r="8"/><path d="M12 4v16M4 12h16M6 6l12 12M6 18 18 6"/>',
  fill: '<path d="m14 3 4 4-7 7m-4-1 4 4-3 4c-2 1-5-2-4-4l3-4ZM16 18h6m-3 3v-6"/>',
  pick: '<path d="m5 19 9-9m-3-5 8 8M8 6c5-3 9-2 12 2-5-1-8 1-10 4"/>',
  paw: '<ellipse cx="6" cy="8" rx="2" ry="3" transform="rotate(-24 6 8)"/><ellipse cx="11" cy="5" rx="2" ry="3"/><ellipse cx="17" cy="6" rx="2" ry="3" transform="rotate(20 17 6)"/><ellipse cx="21" cy="11" rx="1.6" ry="2.5" transform="rotate(32 21 11)"/><path d="M6 17c0-3 4-7 7-7s6 4 6 7c0 5-4 2-6 2s-7 3-7-2Z"/>',
  flag: '<path d="M5 21V4m0 1c5-5 9 5 14 0v10c-5 5-9-5-14 0"/>',
  camp: '<path d="m2 19 10-15 10 15H2Zm5 0 5-9 5 9M9 4l3 1 3-1"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  play: '<path d="m8 5 11 7-11 7Z"/>',
  sound: '<path d="m11 4-5 5H3v6h3l5 5V4Zm4 4c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/>',
  mute: '<path d="m11 4-5 5H3v6h3l5 5V4Zm5 5 5 6m0-6-5 6"/>',
  undo: '<path d="m9 5-5 5 5 5M4 10h9c8 0 8 10 0 10h-2"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 5 2c-2 1-2 1-2 3m0 3h.01"/>',
  left: '<path d="m13 5-7 7 7 7m-4-7h12"/>',
  right: '<path d="m11 5 7 7-7 7m4-7H3"/>',
  plus: '<path d="M5 12h14M12 5v14"/>',
  minus: '<path d="M5 12h14"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  check: '<path d="m5 12 5 5L20 7"/>',
  leaf: '<path d="M20 4C8 2 1 10 7 17c7 6 15-1 13-13ZM5 20 15 10m-5 5v-5m0 5h5"/>',
  helmet: '<path d="M4 15v-3a8 8 0 0 1 16 0v3M2 15h20v4H2Zm8-10v6m4-6v6"/>',
  speed: '<path d="m4 6 7 6-7 6Zm9 0 7 6-7 6Z"/>',
  restart: '<path d="M4 10a8 8 0 1 1 0 5m0-11v6h6"/>',
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.pick}</svg>`;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const toolButton = (tool, glyph, label, key) => `<button type="button" class="tool" data-action="tool" data-tool="${tool}" aria-label="${label}" aria-pressed="false">${icon(glyph)}<span>${label}</span><kbd>${key}</kbd></button>`;
const smallButton = (action, glyph, label, extra = '') => `<button type="button" class="icon-button" data-action="${action}" aria-label="${label}" title="${label}" ${extra}>${icon(glyph)}</button>`;

export function createUI(actions) {
  const root = document.getElementById('ui');
  if (!root) throw new Error('Missing #ui mount');
  let state = null;
  let localDialog = null;
  let winDismissed = false;
  let minerSignature = '';
  let toastTimer;
  let lastFocus;
  let sceneView = false;
  let missionExpanded = false, playArea = null, measureFrame = 0;
  root.dataset.missionExpanded = 'false';
  root.dataset.cameraExpanded = 'false';
  root.innerHTML = `
    <div class="game-hud" data-ui="hud" hidden>
      <section class="objective parchment" aria-label="Mission checklist">
        <div class="chapter"><span class="chapter-number" data-ui="chapter-number">01</span><div><button type="button" class="chapter-picker" data-action="levels" aria-label="Choose a world"><span class="eyebrow" data-ui="level-name">First Dig</span><small>WORLDS ↗</small></button><h1 data-ui="objective-title">Bring the little ones home</h1></div><button type="button" class="mission-toggle" data-action="mission-toggle" aria-label="Show mission details" aria-expanded="false"><span>Goals</span><span data-ui="mission-toggle-icon">${icon('plus')}</span></button></div>
        <div class="mission-summary" data-ui="mission-summary" aria-label="Mission progress summary"></div>
        <div class="mission-details">
        <div class="goal-row" data-ui="animal-goal"><span class="goal-icon animal">${icon('paw')}</span><span>Animals rescued</span><strong data-ui="delivered">0<span> / 2</span></strong><i data-ui="ore-check"></i></div>
        <div data-ui="water-goals"></div><div class="goal-row"><span class="goal-icon">${icon('camp')}</span><span>Crew at camp</span><strong data-ui="home">3<span> / 3</span></strong><i data-ui="home-check"></i></div>
        <div class="goal-foot"><span class="soft-dot"></span><span>Take your time. No timer.</span></div></div>
      </section>
      <div class="crew-list" data-ui="crew" aria-label="Your rescue crew"></div>
      <div class="top-controls">
        <span class="save-note" data-ui="save-note">${icon('check')} Saved locally</span>
        ${smallButton('sound', 'sound', 'Mute sound')}
        ${smallButton('help', 'help', 'Field guide')}
        ${smallButton('pause', 'pause', 'Pause game')}
      </div>
      <div class="world-hint" data-ui="world-hint"><span class="hint-dot"></span><span data-ui="hint">Choose a soft block. Make a little path.</span></div>
      <div class="camera-controls" aria-label="Camera controls">
        ${smallButton('rotate-left', 'left', 'Rotate left')}
        ${smallButton('rotate-right', 'right', 'Rotate right')}
        <span class="control-divider"></span>
        ${smallButton('zoom-in', 'plus', 'Zoom in')}
        ${smallButton('zoom-out', 'minus', 'Zoom out')}
        ${smallButton('fit-camera', 'camp', 'Fit island')}
        ${smallButton('camera-options', 'left', 'More camera controls')}
      </div>
      <div class="selection parchment" data-ui="selection" hidden>
        <span class="selection-symbol" data-ui="selection-symbol">${icon('pick')}</span>
        <div class="selection-copy"><strong data-ui="selection-title"></strong><span data-ui="selection-description"></span></div>
        <button type="button" class="confirm-button" data-action="confirm">Dig this block</button>
        ${smallButton('cancel', 'close', 'Cancel selection')}
      </div>
      <div class="bottom-controls">
        <div class="tool-dock parchment" role="group" aria-label="Crew tools">
          ${toolButton('dig', 'pick', 'Dig', '1')}
          ${toolButton('collect', 'paw', 'Rescue', '2')}
          ${toolButton('move', 'flag', 'Move', '3')}
          <span data-ui="fixture-tool">${toolButton('facility','bridge','Build','4')}</span>
          ${toolButton('fill','fill','Fill','5')}
          <span class="dock-divider"></span>
          <button type="button" class="tool recall-tool" data-action="recall" aria-label="Recall crew">${icon('camp')}<span>Camp</span></button>
        </div>
      </div>
      <div class="fixture-legend parchment" data-ui="fixture-legend" hidden></div><div class="history-controls">
        <button type="button" class="undo-button parchment" aria-label="Undo move" title="Undo move" data-action="undo" disabled>${icon('undo')}<span>Undo move</span></button>
        <button type="button" class="speed-button" data-action="speed" aria-label="Change game speed">${icon('speed')}<span data-ui="speed">1×</span></button>
      </div>
    </div>
    <section class="intro-layer" data-ui="intro" aria-label="Welcome to Block and Bloom">
      <div class="intro-content">
        <div class="intro-stamp"><span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span>THE GARDEN RESCUE CLUB</span></div>
        <p class="intro-kicker">Little worlds. Lovely little problems.</p>
        <h2 class="game-title"><span>BLOCK <i>&</i></span><span>BLOOM<span class="title-dot">.</span></span><small>RESCUE CREW</small></h2>
        <div class="title-rule"><span></span>${icon('leaf')}<span></span></div>
        <p class="intro-description" data-ui="intro-description">A tiny world needs a little helping hand.<br>Dig a way through. Bring everybody home.</p>
        <div class="intro-actions"><button type="button" class="primary-button" data-action="start">${icon('pick')}<span data-ui="start-label">Let’s dig!</span>${icon('right')}</button><button type="button" class="text-button" data-action="help">How to play ${icon('help')}</button></div>
        <div class="intro-tags"><span>${icon('leaf')} 12 little worlds</span><span>${icon('undo')} Undo & explore</span><span>${icon('camp')} Saved locally</span></div>
      </div>
      <div class="intro-level"><span data-ui="intro-number">WORLD 01</span><strong data-ui="intro-name">First Dig</strong><button type="button" class="text-button" data-action="levels">Choose a world</button></div>
    </section>
    <div class="dialog-layer" data-ui="dialog-layer" hidden>
      <section class="game-dialog parchment" data-ui="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title" tabindex="-1"></section>
    </div>
    <div class="toast" data-ui="toast" role="status" aria-live="polite" hidden></div>
    <div class="rotate-note" aria-hidden="true">Rotate your phone for a wider world</div>
    <button type="button" class="scene-toggle" aria-label="Photo mode" data-ui="scene-toggle" data-action="scene-view" aria-pressed="false" hidden>${icon('leaf')}<span>Photo mode</span><kbd>H</kbd></button>`;

  const q = name => root.querySelector(`[data-ui="${name}"]`);
  const buttons = action => root.querySelectorAll(`[data-action="${action}"]`);
  const show = (node, visible) => { node.hidden = !visible; };
  const setText = (name, value) => { const el = q(name); if (el.textContent !== String(value)) el.textContent = value; };
  function toggleSceneView(){sceneView=!sceneView;root.dataset.sceneView=String(sceneView);q('scene-toggle').setAttribute('aria-pressed',String(sceneView));q('scene-toggle').querySelector('span').textContent=sceneView?'Show controls':'Photo mode';if(sceneView)actions.cancel();}
  const htmlCache = new WeakMap();
  const setHTML = (node, value) => { if (htmlCache.get(node) !== value) { node.innerHTML = value; htmlCache.set(node, value); } };

  function notify(message) {
    clearTimeout(toastTimer);
    const el = q('toast');
    el.textContent = message;
    show(el, true);
    toastTimer = setTimeout(() => show(el, false), 3900);
  }

  function openDialog(name) {
    localDialog = name;
    lastFocus = document.activeElement;
    renderDialog();
    q('dialog').focus({preventScroll:true});
  }

  function closeDialog() {
    localDialog = null;
    renderDialog();
    lastFocus?.focus?.({preventScroll:true});
  }

  function renderDialog() {
    if (!state) return;
    const name = localDialog || (state.started && state.won && !winDismissed ? 'win' : state.started && state.paused ? 'pause' : null);
    const layer = q('dialog-layer');
    const signature=`${name}-${state.level?.id}-${(state.completed||[]).join(',')}-${state.saveFailed}`;
    if (layer.dataset.dialog === String(name)&&layer.dataset.signature===signature) return;
    layer.dataset.signature=signature;
    layer.dataset.dialog = String(name);
    root.dataset.dialog = name || '';
    show(layer, !!name);
    q('hud').inert = !!name;
    q('intro').inert = !!name;
    if (!name) return;
    let content = '';
    if (name === 'pause') {
      content = `<div class="dialog-emblem">${icon('camp')}</div><p class="eyebrow">TOOLS DOWN</p><h2 id="dialog-title">Your little world can wait.</h2><p class="dialog-description">${state.saveFailed?'Progress could not be saved. Keep this tab open.':'Your progress is saved. The crew is taking a breather.'}</p><button class="primary-button" type="button" data-action="pause">${icon('play')}Back to work</button><div class="settings-row"><button type="button" data-action="sound">${icon(state.muted ? 'mute' : 'sound')}Sound<span>${state.muted ? 'Off' : 'On'}</span></button><button type="button" data-action="speed">${icon('speed')}Speed<span>${state.speed || 1}×</span></button></div><button class="text-button" type="button" data-action="help">Field guide</button><button class="text-button" type="button" data-action="levels">Choose a world</button><button class="text-button danger-text" type="button" data-action="restart-prompt">${icon('restart')}Restart this world</button>`;
    } else if (name === 'help') {
      content = `<button class="dialog-close icon-button" type="button" data-action="close-dialog" aria-label="Close field guide">${icon('close')}</button><p class="eyebrow">CREW FIELD GUIDE</p><h2 id="dialog-title">Small blocks. Big rescue.</h2><ol class="help-steps"><li><span>${icon('pick')}</span><div><strong>01 / Make a path</strong><p>Choose a crew member, select Dig, then tap a soft block and confirm. Auto crew shares jobs across all three. Digging removes one layer; the crew can step up or down one layer at a time.</p></div></li><li><span>${icon('paw')}</span><div><strong>02 / Bring a friend home</strong><p>Once a path is open, select Rescue, tap an animal and confirm. A crew member carries it all the way to the camp pad. A safe delivery counts toward your mission.</p></div></li><li><span>${icon('camp')}</span><div><strong>03 / Everybody back to camp</strong><p>Finish the animal, water and waterwheel goals in your checklist. Then recall all three crew members. Recall works at any time, including while carrying an animal.</p></div></li></ol><div class="help-note">${icon('water')}${esc(state.level?.description)}<br>Water is limited. Hold a target for 2 seconds to bank it. Build includes bridges, gates, pumps and safe rock clearing.</div><div class="help-note touch-help">${icon('flag')}Touch: drag to move the map, pinch to zoom. Hold a block to open the magnifier, slide to aim, then release to select. Nothing happens until you confirm. Fit island restores an overview.</div><div class="help-note">${icon('leaf')}No timer and no injuries. Fill restores a layer of over-dug ground without undoing a rescue. You can also Undo a move. Keep the flowers intact to earn a bloom badge.</div><button class="primary-button" type="button" data-action="close-dialog">Got it. Let’s explore${icon('right')}</button><p class="keyboard-note">Keys: 1–5 tools · Enter confirm · Q/E rotate · Esc pause · Ctrl / ⌘ + Z undo</p>`;
    } else if (name === 'restart') {
      content = `<div class="dialog-emblem">${icon('restart')}</div><p class="eyebrow">FRESH START</p><h2 id="dialog-title">Try a different little path?</h2><p class="dialog-description">Digging, water and rescue progress in this world will reset.<br>Flowers, animals and crew return to their starting positions.</p><button class="primary-button" type="button" data-action="restart">Restart this world</button><button class="text-button" type="button" data-action="close-dialog">Keep exploring</button>`;
    } else if(name==='levels'){
      content=`<button class="dialog-close icon-button" type="button" data-action="close-dialog" aria-label="Close world picker">${icon('close')}</button><p class="eyebrow">THE WORLD SHELF</p><h2 id="dialog-title">Pick your next little world.</h2><p class="dialog-description">All 12 worlds are open. Play in order or follow your curiosity.<br>Resume your current world; other worlds start fresh. Completed badges stay.</p><div class="level-list">${(state.levels||[]).map(l=>{const unlocked=true,done=(state.completed||[]).includes(l.id);return `<button class="level-card" type="button" data-action="play-level" data-id="${l.id}" ${unlocked?'':'disabled'}><span class="level-card-number">${String(l.id).padStart(2,'0')}</span><span><strong>${esc(l.name)}</strong><small>${esc(l.description)}</small></span><span class="level-card-status">${done?icon('check'):unlocked?icon('right'):'Soon'}</span></button>`;}).join('')}</div>`;
    } else if (name === 'win') {
      const next=state.nextLevel,animalCount=state.goal||0;
      const waterResults=(state.waterGoals||[]).map(g=>`<span>${icon('water')}<strong>✓</strong><small>${esc(g.name)} complete</small></span>`).join('');
      content = `<div class="win-sun"><span></span>${icon(animalCount?'paw':'water')}<span></span></div><p class="eyebrow">WORLD ${String(state.level?.id||1).padStart(2,'0')} · ${esc(state.level?.name)}</p><h2 id="dialog-title">${state.level?.id===12?'A blooming good job!':'Everyone made it home.'}</h2><p class="dialog-description">${animalCount?`${animalCount} little friends are resting at camp. `:'The little garden has its water. '}All three crew members are back at camp.<br>${state.level?.id===12?'You can revisit every world and try a different route.':'One little path. One lovely little adventure.'}</p><div class="win-results">${animalCount?`<span>${icon('paw')}<strong>${animalCount} / ${animalCount}</strong><small>Friends rescued</small></span>`:''}${waterResults}${state.wheel?`<span>${icon('wheel')}<strong>✓</strong><small>Wheel running</small></span>`:''}<span>${icon('helmet')}<strong>3 / 3</strong><small>Crew home</small></span></div>${state.flowersIntact?`<div class="flower-badge">${icon('leaf')}Bloom keeper · every flower saved</div>`:''}${next?`<button class="primary-button" type="button" data-action="next-level">Next world · ${esc(next.name)}${icon('right')}</button><button class="text-button" type="button" data-action="close-win">Stay and admire</button>`:`<button class="primary-button" type="button" data-action="close-win">Admire the workshop${icon('right')}</button><button class="text-button" type="button" data-action="levels">Choose another world</button>`}<button class="text-button" type="button" data-action="restart-prompt">Try another route</button>`;
    }
    q('dialog').innerHTML = content;
    queueMicrotask(() => { if (!layer.hidden) q('dialog').focus({preventScroll:true}); });
  }

  function update(next) {
    const wasWon = state?.won;
    if(state?.level?.id!==next.level?.id){winDismissed=false;localDialog=null;q('dialog-layer').dataset.dialog='';}
    state = next;
    if (!next.won && wasWon) winDismissed = false;
    root.dataset.started = String(!!next.started);
    root.dataset.paused = String(!!next.paused);
    show(q('hud'), next.started);
    show(q('intro'), !next.started);
    show(q('scene-toggle'), !!next.started);
    setText('chapter-number',String(next.level?.id||1).padStart(2,'0'));
    setText('level-name',next.level?.name||'First Dig');
    setText('objective-title',next.level?.objective||'Bring the little ones home');
    setText('intro-number',`WORLD ${String(next.level?.id||1).padStart(2,'0')}`);
    setText('intro-name',next.level?.name||'First Dig');
    setText('start-label', next.hasSave ? `Resume world ${String(next.level?.id||1).padStart(2,'0')}` : 'Let’s dig!');
    setHTML(q('save-note'),`${icon(next.saveFailed?'help':'check')} ${next.saveFailed?'Not saved yet':'Saved locally'}`);
    show(q('animal-goal'),next.goal>0);
    show(q('fixture-tool'),next.facilities>0);
    const extraRows=(next.waterGoals?.length||0)+(next.wheel?1:0)-(next.goal===0?1:0);root.style.setProperty('--goal-extra',`${extraRows*29}px`);
    setText('intro-description',next.level?.description||'Make a little path. Bring your friends home.');
    setHTML(q('water-goals'),(next.waterGoals||[]).map(g=>`<div class="goal-row water-row"><span class="goal-icon">${icon('water')}</span><span>${esc(g.name)}<small>${g.min}–${g.max} m³</small></span><strong>${g.done?'✓':(g.volume||0).toFixed(1)}</strong></div>`).join('')+(next.wheel?`<div class="goal-row water-row"><span class="goal-icon">${icon('wheel')}</span><span>Waterwheel<small>2 seconds of flowing water</small></span><strong>${next.wheel.done?'✓':`${Math.min(2,next.wheel.hold||0).toFixed(1)}s`}</strong></div>`:''));
    setHTML(q('fixture-legend'),[['bridge','Bridge'],['gate','Gate'],['blast','Clear'],['pump','Pump']].filter(([k])=>next.level?.tools?.[k]>0).map(([k,n])=>`<span>${n} <strong>${next.tools?.[k]||0}</strong></span>`).join(''));
    show(q('fixture-legend'),next.tool==='facility'&&!next.selection&&next.facilities>0);
    setHTML(q('delivered'), `${Math.min(next.goal ?? 2, next.delivered || 0)}<span> / ${next.goal ?? 2}</span>`);
    setHTML(q('home'), `${next.crewHome || 0}<span> / 3</span>`);
    setHTML(q('ore-check'), next.delivered >= (next.goal ?? 2) ? icon('check') : '');
    setHTML(q('home-check'), next.crewHome >= 3 ? icon('check') : '');
    setHTML(q('mission-summary'),[
      next.goal>0?`<span title="Animals rescued">${icon('paw')}<strong>${next.delivered||0}/${next.goal}</strong></span>`:'',
      (next.waterGoals||[]).length?`<span title="Water targets">${icon('water')}<strong>${next.waterGoals.length===1?((next.waterGoals[0].done?'✓':(next.waterGoals[0].volume||0).toFixed(1))+' m³'):next.waterGoals.filter(g=>g.done).length+'/'+next.waterGoals.length}</strong></span>`:'',
      next.wheel?`<span title="Waterwheel">${icon('wheel')}<strong>${next.wheel.done?'✓':Math.min(2,next.wheel.hold||0).toFixed(1)+'s'}</strong></span>`:'',
      `<span title="Crew home">${icon('camp')}<strong>${next.crewHome||0}/3</strong></span>`
    ].join(''));
    setText('speed', `${next.speed || 1}×`);
    root.querySelectorAll('[data-action="tool"]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.tool === next.tool)));
    buttons('undo').forEach(button => { button.disabled = !next.canUndo; });
    buttons('sound').forEach(button => {
      if (button.classList.contains('icon-button')) {
        setHTML(button, icon(next.muted ? 'mute' : 'sound'));
        button.setAttribute('aria-label', next.muted ? 'Enable sound' : 'Mute sound');
        button.title = next.muted ? 'Enable sound' : 'Mute sound';
      }
    });
    const hint = next.objectivesReady ? 'Mission complete. Recall your crew to finish.' : next.tool === 'fill' ? 'Fill adds one layer. Repair the banks to keep water in.' : next.tool === 'facility' ? 'Tap a bridge, gate, pump or marked rock to inspect it.' : next.tool === 'collect' ? 'Choose a little animal. Your crew will carry it home.' : next.tool === 'move' ? 'Choose reachable ground to move a crew member.' : next.level?.hint||'Choose a soft block. Make a little path.';
    setText('hint', next.selectedMiner===null||next.objectivesReady?hint:`${next.miners.find(m=>m.id===next.selectedMiner)?.name} selected · Choose a target, then confirm.`);
    const signature = JSON.stringify([next.selectedMiner,(next.miners || []).map(({id,name,helmet,status,phase,carrying,queued}) => ({id,name,helmet,status,phase,carrying,queued}))]);
    if (signature !== minerSignature) {
      minerSignature = signature;
      const statusLabels = {idle:'At camp',walking:'On the way',digging:'Digging',collecting:'Picking up',returning:'Heading home',celebrate:'Celebrating',home:'At camp',moving:'On the way',carrying:'Carrying home'};
      q('crew').innerHTML = (next.miners || []).map((m, i) => {
        const active=next.selectedMiner===m.id,label=m.phase==='settling'?'Settling in':m.carrying?'Carrying home':statusLabels[m.status]||m.status||'At camp';
        return `<button type="button" class="crew-member ${active?'is-selected':''}" data-action="select-miner" data-id="${esc(m.id)}" data-phase="${esc(m.phase)}" aria-pressed="${active}" aria-label="${active?'Selected ':'Select '}${esc(m.name)}, ${esc(label)}${m.queued?`, ${m.queued} queued`:''}"><span class="miner-portrait portrait-${i}" aria-hidden="true" style="--helmet:${/^#[0-9a-f]{3,8}$/i.test(m.helmet || '') ? m.helmet : ['#F2BE22','#E88A1F','#81AD38'][i % 3]}"><span class="portrait-helmet"></span><span class="portrait-face"><i></i><i></i></span><span class="portrait-body"></span></span><span class="crew-copy"><strong>${esc(m.name)}</strong><span>${esc(label)}${m.queued?` · ${m.queued} queued`:''}</span></span><span class="crew-status ${m.carrying?'is-carrying':''}">${active?icon('check'):m.carrying?icon('paw'):''}</span></button>`;
      }).join('')+`<button type="button" class="auto-workers ${next.selectedMiner===null?'is-selected':''}" data-action="auto-workers" aria-pressed="${next.selectedMiner===null}" aria-label="Auto crew">${icon('helmet')}<span>Auto crew</span></button>`;
    }
    const selection = next.selection;
    show(q('selection'), !!selection && next.started && !next.paused && !next.won);
    if (selection) {
      setText('selection-title', `${selection.title}${selection.count > 1 ? ` · ${selection.count} blocks` : ''}`);
      setText('selection-description', selection.description || '');
      setHTML(q('selection-symbol'), icon((selection.kind||next.tool)==='collect'?'paw':(selection.kind||next.tool)==='move'?'flag':['gate','pump'].includes(selection.kind)?'water':selection.kind==='bridge'?'bridge':selection.kind==='fill'?'fill':'pick'));
      const confirm = root.querySelector('[data-action="confirm"]');
      confirm.textContent = selection.confirmLabel || 'Confirm job';
      confirm.disabled = !selection.valid;
      q('selection').classList.toggle('is-invalid', !selection.valid);
    }
    // Rebuild only the small settings dialog when its actual values change.
    if (q('dialog-layer').dataset.dialog === 'pause' && q('dialog-layer').dataset.settings !== `${next.muted}-${next.speed}`) {
      q('dialog-layer').dataset.dialog = '';
      q('dialog-layer').dataset.settings = `${next.muted}-${next.speed}`;
    }
    renderDialog();
    scheduleMeasure();
  }

  function onClick(event) {
    const button = event.target.closest('button[data-action]');
    if (!button || button.disabled || !root.contains(button)) return;
    const action = button.dataset.action;
    if (action === 'mission-toggle') {missionExpanded=!missionExpanded;root.dataset.missionExpanded=String(missionExpanded);button.setAttribute('aria-expanded',String(missionExpanded));button.setAttribute('aria-label',missionExpanded?'Hide mission details':'Show mission details');setHTML(q('mission-toggle-icon'),icon(missionExpanded?'minus':'plus'));scheduleMeasure();}
    else if(action==='camera-options'){const expanded=root.dataset.cameraExpanded!=='true';root.dataset.cameraExpanded=String(expanded);button.setAttribute('aria-expanded',String(expanded));}
    else if(action==='fit-camera')actions.fitCamera();
    else if (action === 'scene-view') toggleSceneView();
    else if(action==='levels') openDialog('levels');
    else if(action==='play-level'){localDialog=null;winDismissed=false;actions.playLevel(Number(button.dataset.id));renderDialog();}
    else if (action === 'help') { actions.showHelp?.(); openDialog('help'); }
    else if (action === 'close-dialog') closeDialog();
    else if (action === 'restart-prompt') openDialog('restart');
    else if (action === 'restart') { localDialog = null; winDismissed = false; actions.restart(); }
    else if (action === 'close-win') { winDismissed = true; actions.closeWin(); renderDialog(); }
    else if (action === 'tool') actions.chooseTool(button.dataset.tool);
    else if(action==='auto-workers') actions.selectMiner(null);
    else if (action === 'select-miner') {
      const miner = state?.miners?.find(m => String(m.id) === button.dataset.id);
      actions.selectMiner(miner?.id ?? Number(button.dataset.id));
    }
    else if (action === 'rotate-left') actions.rotate(-1);
    else if (action === 'rotate-right') actions.rotate(1);
    else if (action === 'zoom-in') actions.zoom(1);
    else if (action === 'zoom-out') actions.zoom(-1);
    else if (action === 'sound') actions.toggleSound();
    else if (action === 'speed') actions.toggleSpeed();
    else if (action === 'pause') actions.togglePause();
    else if (typeof actions[action] === 'function') actions[action]();
  }
  function onKey(event) {
    if(sceneView&&event.key==='Escape'&&q('dialog-layer').hidden){event.preventDefault();event.stopImmediatePropagation();toggleSceneView();return;}
    if(q('dialog-layer').hidden&&state?.started&&event.key.toLowerCase()==='h'&&!event.target.closest?.('input,textarea,[contenteditable]')){event.preventDefault();toggleSceneView();return;}
    if (q('dialog-layer').hidden) return;
    // Dialog buttons retain native Enter/Space activation; game shortcuts stop here.
    event.stopPropagation();
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (localDialog) closeDialog();
      else if (state?.won) { winDismissed = true; actions.closeWin(); renderDialog(); }
      else if (state?.paused) actions.togglePause();
      return;
    }
    if (event.key !== 'Tab') return;
    const items = [...q('dialog').querySelectorAll('button:not(:disabled)')];
    if (!items.length) return;
    const first = items[0], last = items.at(-1);
    if (event.shiftKey && (document.activeElement === first || document.activeElement === q('dialog') || !q('dialog').contains(document.activeElement))) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && !q('dialog').contains(document.activeElement)) { event.preventDefault(); first.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  root.addEventListener('click', onClick);
  document.addEventListener('keydown', onKey, true);
  function measurePlayArea(){
    measureFrame=0;
    const mobile=document.documentElement.dataset.mobile==='true';
    const objective=root.querySelector('.objective'),rect=objective.getBoundingClientRect();
    root.style.setProperty('--objective-height',`${rect.height}px`);
    if(!mobile||!state?.started){playArea=null;return;}
    const landscape=document.documentElement.dataset.orientation==='landscape';
    const crew=q('crew').getBoundingClientRect(),dock=root.querySelector('.bottom-controls').getBoundingClientRect();
    if(landscape)playArea={left:Math.max(224,rect.right+12),right:innerWidth-10,top:12,bottom:Math.max(125,dock.top-12)};
    else {const camera=root.querySelector('.camera-controls').getBoundingClientRect();playArea={left:0,right:innerWidth,top:Math.max(rect.bottom+12,camera.bottom+10),bottom:Math.max(rect.bottom+150,crew.top-48)};}
  }
  function scheduleMeasure(){if(!measureFrame)measureFrame=requestAnimationFrame(measurePlayArea);}
  const objectiveObserver=new ResizeObserver(scheduleMeasure);
  objectiveObserver.observe(root.querySelector('.objective'));objectiveObserver.observe(q('crew'));objectiveObserver.observe(root.querySelector('.bottom-controls'));objectiveObserver.observe(root.querySelector('.camera-controls'));
  window.addEventListener('resize',scheduleMeasure);scheduleMeasure();
  return {update, notify, isSceneView:()=>sceneView, getPlayArea:()=>playArea, destroy() {objectiveObserver.disconnect();cancelAnimationFrame(measureFrame);window.removeEventListener('resize',scheduleMeasure);clearTimeout(toastTimer);root.removeEventListener('click',onClick);document.removeEventListener('keydown',onKey,true);root.innerHTML='';}};
}
