let _overlay = null;
let _message = null;
let _button = null;
let _ready = false;

function _init() {
  if (_ready) return;
  _overlay = document.getElementById('gameOverOverlay');
  _message = document.getElementById('gameOverMessage');
  _button = document.getElementById('gameOverContinue');
  if (_button) {
    _button.addEventListener('click', () => {
      hideGameOverOverlay();
    });
  }
  _ready = true;
}

export function showGameOverOverlay(text) {
  _init();
  if (!_overlay) return;
  if (_message && text) {
    _message.textContent = text;
  }
  _overlay.classList.remove('hidden');
  _overlay.setAttribute('aria-hidden', 'false');
}

export function hideGameOverOverlay() {
  _init();
  if (!_overlay) return;
  _overlay.classList.add('hidden');
  _overlay.setAttribute('aria-hidden', 'true');
}
