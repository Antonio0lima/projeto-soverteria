
const carrossel = document.querySelector('.carrossel');
const btnLeft = document.querySelector('.btn-left');
const btnRight = document.querySelector('.btn-right');

let scrollAmount = 0;
const visibleCards = 3;

function atualizarDimensoes() {
    const card = document.querySelector('.card');
    const gap = parseInt(getComputedStyle(carrossel).gap);
    const cardWidth = card.offsetWidth + gap;

    const qtdItem = carrossel.children.length;
    const valorMax = cardWidth * (qtdItem - visibleCards);

    return { cardWidth, valorMax };
}

function atualizarBotoes() {
    const { valorMax } = atualizarDimensoes();
    btnLeft.style.opacity = scrollAmount <= 0 ? 0.3 : 1;
    btnLeft.style.pointerEvents = scrollAmount <= 0 ? 'none' : 'auto';
    btnRight.style.opacity = scrollAmount >= valorMax ? 0.3 : 1;
    btnRight.style.pointerEvents = scrollAmount >= valorMax ? 'none' : 'auto';
}

btnRight.addEventListener('click', () => {
    const { cardWidth, valorMax } = atualizarDimensoes();
    scrollAmount += cardWidth;
    if (scrollAmount > valorMax) scrollAmount = valorMax;
    carrossel.style.transform = `translateX(-${scrollAmount}px)`;
    atualizarBotoes();
});

btnLeft.addEventListener('click', () => {
    const { cardWidth } = atualizarDimensoes();
    scrollAmount -= cardWidth;
    if (scrollAmount < 0) scrollAmount = 0;
    carrossel.style.transform = `translateX(-${scrollAmount}px)`;
    atualizarBotoes();
});

// Mantém posição ao redimensionar
window.addEventListener('resize', () => {
    const { valorMax } = atualizarDimensoes();
    if (scrollAmount > valorMax) scrollAmount = valorMax;
    carrossel.style.transform = `translateX(-${scrollAmount}px)`;
    atualizarBotoes();
});


atualizarBotoes();
