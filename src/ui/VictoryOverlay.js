let _overlay = null;
let _button = null;
let _ready = false;

function _init() {
  if (_ready) return;
  _overlay = document.getElementById('victoryOverlay');
  _button = document.getElementById('victoryCloseButton');
  if (_button) {
    _button.addEventListener('click', () => {
      hideVictoryOverlay();
    });
  }
  _ready = true;
}

export function showVictoryOverlay() {
  _init();
  if (!_overlay) return;
  _overlay.classList.remove('hidden');
  _overlay.setAttribute('aria-hidden', 'false');
}

export function hideVictoryOverlay() {
  _init();
  if (!_overlay) return;
  _overlay.classList.add('hidden');
  _overlay.setAttribute('aria-hidden', 'true');
}