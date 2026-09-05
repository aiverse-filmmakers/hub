/* Native, dependency-free client. No simulated processing or downloads. */
'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const config = window.VSC_CONFIG || {};
  const base = String(config.API_BASE || '').replace(/\/+$/, '');
  const maxBytes = Math.min(Number(config.MAX_UPLOAD_BYTES) || 100000000, 100000000);
  const state = { online: false, file: null, url: null, job: null, data: null, cuts: [], original: [], busy: false, timer: null, xhr: null, epoch: 0, retry: null };
  const show = (id, visible) => { $(id).hidden = !visible; };
  const text = (id, value) => { $(id).textContent = value; };
  const node = (tag, content, className) => { const el = document.createElement(tag); if (content !== undefined) el.textContent = content; if (className) el.className = className; return el; };
  function updateControls() {
    $('upload').disabled = !state.online || !state.file || state.busy || !!state.job;
    $('file').disabled = state.busy || !!state.job;
    show('reset', !!state.file || !!state.job);
  }
  function clearError() { show('error-panel', false); state.retry = null; }
  function fail(message, retry) {
    text('error', message); show('error-panel', true); state.retry = retry || null; show('retry', !!retry);
  }
  async function request(path, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(base + path, { ...options, signal: controller.signal, cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' });
      let body = null; try { body = await response.json(); } catch { /* 204 or non-JSON error */ }
      if (!response.ok) { const detail = body?.detail || body?.error; throw new Error(typeof detail === 'string' ? detail : detail?.message || `Service returned ${response.status}. Please try again.`); }
      return body;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('The service took too long to respond. Check the connection and try again.');
      if (error instanceof TypeError) throw new Error('Cannot reach the processing service. Check your connection or try again later.');
      throw error;
    } finally { clearTimeout(timeout); }
  }
  function jobPath(job = state.job) { return `/api/jobs/${encodeURIComponent(job.id)}`; }
  function authorized(path, job = state.job) { return `${path}?token=${encodeURIComponent(job.token)}`; }
  function fileURL(path) {
    if (typeof path !== 'string' || !path || path.startsWith('/') || path.split('/').some(p => p === '..' || p === '.')) throw new Error('The service returned an invalid file path.');
    return base + authorized(`${jobPath()}/files/${path.split('/').map(encodeURIComponent).join('/')}`);
  }
  async function health() {
    $('check').disabled = true; state.online = false; updateControls();
    try {
      if (!base) throw new Error('Processing unavailable — the API has not been connected yet.');
      const url = new URL(base);
      if (!['https:', 'http:'].includes(url.protocol) || (location.protocol === 'https:' && url.protocol !== 'https:')) throw new Error('Processing unavailable — configure a secure HTTPS API.');
      text('health', 'Checking processing service…');
      const data = await request('/api/health');
      if (data?.status !== 'ok') throw new Error('Processing service is not ready. Try again shortly.');
      state.online = true; text('health', 'Processing service available');
    } catch (error) { text('health', error.message); }
    finally { $('check').disabled = false; updateControls(); }
  }
  function progress(message, value) {
    show('progress-panel', true); text('status', message);
    if (typeof value === 'number' && Number.isFinite(value)) $('progress').value = Math.max(0, Math.min(100, value));
    else $('progress').removeAttribute('value');
  }
  function reset() {
    state.epoch++; clearTimeout(state.timer); if (state.xhr) state.xhr.abort();
    state.xhr = null; state.busy = false; state.job = null; state.data = null; state.cuts = []; state.original = [];
    $('source').pause(); $('source').removeAttribute('src'); $('source').load();
    if (state.url) URL.revokeObjectURL(state.url); state.url = null; state.file = null;
    $('file').value = ''; text('file-info', 'No video selected.');
    for (const id of ['source-wrap', 'review', 'results', 'progress-panel']) show(id, false);
    clearError(); updateControls();
  }
  async function cancel() {
    const job = state.job; reset(); const epoch = state.epoch;
    if (job) {
      try { await request(authorized(jobPath(job), job), { method: 'DELETE' }); }
      catch (error) { if (epoch === state.epoch) fail(`Stopped here, but server cancellation could not be confirmed. ${error.message}`); }
    }
  }
  function selectFile() {
    clearError(); const file = $('file').files[0];
    if (state.url) URL.revokeObjectURL(state.url); state.url = null; state.file = null; show('source-wrap', false);
    if (!file) { text('file-info', 'No video selected.'); updateControls(); return; }
    if (!file.size || file.size > maxBytes) { fail('Choose a non-empty video no larger than 100 MB.'); $('file').value = ''; text('file-info', 'No video selected.'); updateControls(); return; }
    state.file = file; state.url = URL.createObjectURL(file); $('source').src = state.url; show('source-wrap', true);
    text('preview-note', 'Original video preview. Detected cuts may need adjustment.');
    text('file-info', `${file.name} · ${(file.size / 1000000).toFixed(1)} MB`); updateControls();
  }
  async function upload() {
    if (!state.file || !state.online || state.busy || state.job) return;
    clearError(); state.busy = true; updateControls(); progress('Uploading video…'); const epoch = state.epoch;
    const form = new FormData(); form.append('file', state.file);
    const xhr = new XMLHttpRequest(); state.xhr = xhr; xhr.open('POST', base + '/api/jobs'); xhr.timeout = 300000;
    xhr.upload.onprogress = event => { if (epoch === state.epoch) progress('Uploading video…', event.lengthComputable ? event.loaded / event.total * 100 : null); };
    xhr.upload.onload = () => { if (epoch === state.epoch) progress('Upload sent. Waiting for the service…'); };
    const uploadError = message => { if (epoch !== state.epoch) return; state.xhr = null; state.busy = false; show('progress-panel', false); updateControls(); fail(message, upload); };
    xhr.onerror = () => uploadError('Upload failed. Check your connection and try again.');
    xhr.ontimeout = () => uploadError('Upload timed out. Try again with a smaller video or a stronger connection.');
    xhr.onload = () => {
      if (epoch !== state.epoch) return; state.xhr = null;
      let body; try { body = JSON.parse(xhr.responseText); } catch { uploadError('The service returned an unreadable upload response.'); return; }
      if (xhr.status < 200 || xhr.status >= 300 || !body.id || !body.token) { uploadError(typeof body.detail === 'string' ? body.detail : 'The upload was rejected by the service. Try another video.'); return; }
      state.job = { id: body.id, token: body.token }; updateControls(); progress('Finding scene changes…'); poll(epoch);
    };
    xhr.send(form);
  }
  function normalizedCuts(data) {
    const total = Number(data.metadata?.frame_count);
    if (!Number.isInteger(total) || total < 1 || !(Number(data.metadata?.fps) > 0) || !Array.isArray(data.cuts)) throw new Error('The service returned incomplete frame metadata.');
    const cuts = data.cuts.map(cut => typeof cut === 'number' ? { frame: cut } : { ...cut });
    if (cuts.some(cut => !Number.isInteger(cut.frame) || cut.frame < 1 || cut.frame >= total)) throw new Error('The service returned an out-of-range cut.');
    if (new Set(cuts.map(cut => cut.frame)).size !== cuts.length) throw new Error('The service returned duplicate cuts.');
    return cuts.sort((a, b) => a.frame - b.frame);
  }
  async function poll(epoch = state.epoch) {
    if (epoch !== state.epoch || !state.job) return;
    clearTimeout(state.timer);
    try {
      const data = await request(authorized(jobPath())); if (epoch !== state.epoch) return;
      if (!data || !data.status) throw new Error('The service returned an unreadable job status.');
      if (data.status === 'error') throw new Error(typeof data.error === 'string' ? data.error : data.error?.message || 'Processing failed. Start over with another video.');
      if (data.status === 'cancelled') { state.busy = false; show('progress-panel', false); updateControls(); fail('This job was cancelled. Select Start over to choose a video.'); return; }
      if (data.status === 'review') {
        state.data = data; state.cuts = normalizedCuts(data); state.original = state.cuts.map(c => ({ ...c })); state.busy = false;
        show('progress-panel', false); show('review', true); renderCuts(); updateControls(); $('review-title').focus(); return;
      }
      if (data.status === 'complete') {
        state.data = data; renderResults(); state.busy = false; show('progress-panel', false); show('results', true); show('review', false); updateControls(); $('results-title').focus(); return;
      }
      if (!['queued', 'analyzing', 'exporting'].includes(data.status)) throw new Error('The service returned an unknown job state.');
      progress(data.message || (data.status === 'exporting' ? 'Exporting clips and frames…' : 'Finding scene changes…'), data.progress);
      state.timer = setTimeout(() => poll(epoch), Math.max(500, Number(config.POLL_MS) || 1500));
    } catch (error) {
      if (epoch !== state.epoch) return; state.busy = false; show('progress-panel', false); updateControls();
      fail(error.message, () => { clearError(); state.busy = true; updateControls(); progress('Checking job…'); poll(epoch); });
    }
  }
  function previewURL(frame, path) { return path ? fileURL(path) : `${base}${authorized(jobPath() + '/preview')}&frame=${frame}`; }
  function edit(message) { state.cuts.sort((a, b) => a.frame - b.frame); renderCuts(); text('edit-status', message); }
  function moveCut(cut, delta) {
    const frame = cut.frame + delta;
    if (frame <= 0 || frame >= state.data.metadata.frame_count || state.cuts.some(c => c !== cut && c.frame === frame)) { text('edit-status', 'That frame is already a cut or outside the video.'); return; }
    cut.frame = frame; delete cut.before; delete cut.after; edit(`Cut moved to frame ${frame}.`);
    const button = $('cuts').querySelector(`[data-frame="${frame}"] [data-delta="${delta}"]`); button?.focus();
  }
  function renderCuts() {
    const meta = state.data.metadata; const fps = Number(meta.fps); const adjusting = $('adjust').open;
    text('metadata', `${meta.frame_count} frames · ${fps.toFixed(3).replace(/\.?0+$/, '')} fps${meta.width && meta.height ? ` · ${meta.width} × ${meta.height}` : ''}`);
    text('cut-summary', state.cuts.length ? `${state.cuts.length} cuts → ${state.cuts.length + 1} scenes` : 'No cuts selected. The full video will export as one scene.');
    $('add-frame').max = meta.frame_count - 1; $('cuts').replaceChildren();
    for (const [index, cut] of state.cuts.entries()) {
      const li = node('li', undefined, 'cut'); li.dataset.frame = cut.frame;
      const title = node('div', undefined, 'cut-title'); title.append(node('p', `Cut ${index + 1} · frame ${cut.frame}`));
      const seek = node('button', `Preview ${(cut.frame / fps).toFixed(2)}s`, 'secondary'); seek.type = 'button'; seek.addEventListener('click', () => { $('source').currentTime = cut.frame / fps; $('source').pause(); $('source').scrollIntoView({ block: 'center' }); $('source').focus(); }); title.append(seek); li.append(title);
      const thumbs = node('div', undefined, 'thumbs');
      for (const [label, frame, path] of [['Before', cut.frame - 1, cut.before], ['After', cut.frame, cut.after]]) {
        const figure = node('figure'); const img = node('img'); img.alt = `${label} cut: frame ${frame}`; img.loading = 'lazy'; img.referrerPolicy = 'no-referrer'; img.src = previewURL(frame, path);
        const caption = node('figcaption', `${label} · frame ${frame}`); img.addEventListener('error', () => { caption.textContent = `${label} · frame ${frame} — preview unavailable`; }); figure.append(img, caption); thumbs.append(figure);
      }
      li.append(thumbs); const actions = node('div', undefined, 'cut-actions'); actions.hidden = !adjusting;
      for (const delta of [-1, 1]) { const button = node('button', `${delta < 0 ? '−' : '+'}1 frame`, 'secondary'); button.type = 'button'; button.dataset.delta = delta; button.setAttribute('aria-label', `Move cut ${index + 1} ${delta < 0 ? 'back' : 'forward'} one frame`); button.addEventListener('click', () => moveCut(cut, delta)); actions.append(button); }
      const remove = node('button', 'Remove cut', 'secondary'); remove.type = 'button'; remove.setAttribute('aria-label', `Remove cut ${index + 1}`); remove.addEventListener('click', () => { state.cuts = state.cuts.filter(c => c !== cut); edit(`Removed cut at frame ${cut.frame}.`); $('adjust').querySelector('summary').focus(); }); actions.append(remove); li.append(actions); $('cuts').append(li);
    }
  }
  async function exportScenes() {
    if (state.busy || !state.job) return; clearError(); const epoch = state.epoch; state.busy = true; updateControls(); show('review', false); show('results', false); progress('Starting export…');
    try { await request(jobPath() + '/export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: state.job.token, cuts: state.cuts.map(c => c.frame) }) }); if (epoch === state.epoch) poll(epoch); }
    catch (error) { if (epoch !== state.epoch) return; state.busy = false; show('progress-panel', false); show('review', true); updateControls(); fail(error.message, exportScenes); }
  }
  function link(label, path) { const a = node('a', label, 'download'); a.href = fileURL(path); a.download = path.split('/').pop(); a.referrerPolicy = 'no-referrer'; return a; }
  function renderResults() {
    const data = state.data;
    if (!Array.isArray(data.scenes) || !data.scenes.length || !['all', 'scenes', 'first', 'last'].every(key => data.archives?.[key])) throw new Error('Export is missing scenes or ZIP files. Check the job again.');
    const archives = document.createDocumentFragment();
    for (const [key, label] of [['all', 'Everything ZIP'], ['scenes', 'Scene clips ZIP'], ['first', 'First frames ZIP'], ['last', 'Last frames ZIP']]) archives.append(link(label, data.archives[key]));
    const scenes = document.createDocumentFragment();
    for (const [index, scene] of data.scenes.entries()) {
      const li = node('li', undefined, 'scene'); li.append(node('h3', `Scene ${index + 1}`), node('p', `Frames ${scene.start_frame}–${scene.end_frame - 1}`, 'small muted'));
      const links = node('div', undefined, 'scene-links'); links.append(link('MP4 clip ↓', scene.mp4), link('First PNG ↓', scene.first_png), link('Last PNG ↓', scene.last_png)); li.append(links); scenes.append(li);
    }
    $('archives').replaceChildren(archives); $('scenes').replaceChildren(scenes);
  }
  $('check').addEventListener('click', health); $('file').addEventListener('change', selectFile);
  $('upload-form').addEventListener('submit', event => { event.preventDefault(); upload(); });
  $('cancel').addEventListener('click', cancel); $('reset').addEventListener('click', cancel);
  $('retry').addEventListener('click', () => state.retry?.()); $('export').addEventListener('click', exportScenes);
  $('adjust').addEventListener('toggle', () => { for (const actions of $('cuts').querySelectorAll('.cut-actions')) actions.hidden = !$('adjust').open; });
  $('restore').addEventListener('click', () => { state.cuts = state.original.map(c => ({ ...c })); edit('Detected cuts restored.'); });
  $('add-form').addEventListener('submit', event => {
    event.preventDefault(); const frame = Number($('add-frame').value);
    if (!Number.isInteger(frame) || frame < 1 || frame >= state.data.metadata.frame_count || state.cuts.some(c => c.frame === frame)) { text('edit-status', 'Enter an unused whole frame number inside the video.'); return; }
    state.cuts.push({ frame }); $('add-frame').value = ''; edit(`Added cut at frame ${frame}.`); $('add-frame').focus();
  });
  $('back').addEventListener('click', () => { show('results', false); show('review', true); renderCuts(); $('review-title').focus(); });
  $('source').addEventListener('error', () => text('preview-note', 'This browser cannot preview this video format. You can still upload it; the service will check whether it can be processed.'));
  window.addEventListener('beforeunload', event => { if (state.busy) { event.preventDefault(); event.returnValue = ''; } });
  health();
})();
