
const cartoes = document.querySelectorAll('.cartao');
const colunas = document.querySelectorAll('.coluna');

cartoes.forEach(cartao => {
  cartao.addEventListener('dragstart', () => {
    cartao.classList.add('arrastando');
    setTimeout(() => cartao.style.display = 'none', 0);
  });

  cartao.addEventListener('dragend', () => {
    cartao.classList.remove('arrastando');
    cartao.style.display = 'flex';
  });
});

colunas.forEach(coluna => {
  coluna.addEventListener('dragover', e => {
    e.preventDefault();
    coluna.classList.add('drag-over');
  });

  coluna.addEventListener('dragleave', () => {
    coluna.classList.remove('drag-over');
  });

  coluna.addEventListener('drop', () => {
    const cartao = document.querySelector('.arrastando');
    coluna.appendChild(cartao);
    coluna.classList.remove('drag-over');
  });
});
