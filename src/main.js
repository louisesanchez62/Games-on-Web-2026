import { Game } from './core/Game.js';

const canvas = document.getElementById('renderCanvas');
const overlay = document.getElementById('introOverlay');
const continueButton = document.getElementById('introContinue');
const game = new Game(canvas);

const startPromise = game.start();

const enableContinue = () => {
	continueButton.disabled = false;
	continueButton.textContent = 'Continuer';
};

const showLoadError = () => {
	continueButton.disabled = true;
	continueButton.textContent = 'Erreur de chargement';
};

continueButton.disabled = true;

startPromise.then(enableContinue).catch((err) => {
	console.error(err);
	showLoadError();
});

const closeIntro = () => {
	continueButton.disabled = true;
	startPromise.then(() => {
		overlay.classList.add('hidden');
		overlay.setAttribute('aria-hidden', 'true');
		game.startGameplay();
	});
};

continueButton.addEventListener('click', closeIntro);
