// Viewing is self-reported; no player tracking, timer, or learning scores.
window.initEnglishVideo = function () {
  const dialog = document.createElement('dialog');
  dialog.id = 'englishVideoDialog';
  dialog.setAttribute('aria-labelledby', 'englishVideoTitle');
  dialog.innerHTML = `<div class="video-heading"><h2 id="englishVideoTitle">🎬 오늘은 뭐 볼까?</h2><button class="icon-btn" data-close aria-label="영상 선택 닫기">✕</button></div>
    <p class="video-intro">재미있어 보이는 걸 하나 골라봐!</p>
    <div class="video-options">
      <article class="video-card"><h3>📚 Storyline Online</h3><p>그림책 이야기를 영어로 들어요.</p><a class="btn" href="https://storylineonline.net/" target="_blank" rel="noopener noreferrer">영상 보러 가기 →</a></article>
      <article class="video-card"><h3>💬 English Singsing</h3><p>재미있는 애니메이션으로 쉬운 영어를 들어요.</p><a class="btn" href="https://www.youtube.com/@EnglishSingsing" target="_blank" rel="noopener noreferrer">영상 보러 가기 →</a></article>
      <article class="video-card"><h3>🐷 Peppa Pig</h3><p>페파피그 이야기를 영어로 편하게 봐요.</p><a class="btn" href="https://www.youtube.com/@PeppaPigOfficial" target="_blank" rel="noopener noreferrer">영상 보러 가기 →</a></article>
    </div>
    <button class="btn video-other" data-other aria-pressed="false">다른 영어 영상 봤어요</button>
    <p class="video-note" role="status">약 10분, 편하게 보고 돌아와서 눌러주세요.</p>
    <button class="btn primary video-complete" data-complete>🎬 오늘 영어 영상 봤어요!</button>`;
  document.body.appendChild(dialog);
  let complete;
  const other = dialog.querySelector('[data-other]');
  const note = dialog.querySelector('.video-note');
  dialog.querySelector('[data-close]').onclick = () => dialog.close();
  other.onclick = () => {
    const selected = other.getAttribute('aria-pressed') !== 'true';
    other.setAttribute('aria-pressed', String(selected));
    note.textContent = selected ? '다른 영어 영상도 좋아요! 아래 버튼으로 완료해요.' : '약 10분, 편하게 보고 돌아와서 눌러주세요.';
  };
  dialog.querySelector('[data-complete]').onclick = () => { if (complete()) dialog.close(); };
  dialog.addEventListener('close', () => {
    document.querySelector('[data-task="englishVideo"] [data-start]:not(:disabled), [data-view="today"]')?.focus();
  });
  return { open(onComplete) {
    complete = onComplete;
    other.setAttribute('aria-pressed', 'false');
    note.textContent = '약 10분, 편하게 보고 돌아와서 눌러주세요.';
    if (!dialog.open) dialog.showModal();
  }};
};
