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

  coluna.addEventListener('drop', async () => {
  const cartao = document.querySelector('.arrastando');
  coluna.appendChild(cartao);
  coluna.classList.remove('drag-over');

  // 🧠 Captura os dados
  const id = cartao.dataset.id; // <div class="cartao" data-id="1">
  const novo_status = coluna.dataset.status; // <div class="coluna" data-status="confirmado">

  console.log('Movendo pedido:', id, '->', novo_status); // debug no front

  // ⚙️ Envia para o servidor
  try {
    const resposta = await fetch('/atualizar-status', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id, novo_status })
});

    const data = await resposta.json();
    console.log('Resposta do servidor:', data);

     setTimeout(() => {
        location.reload();
      }, 1);
  } catch (erro) {
    console.error('Erro ao atualizar status:', erro);
  }
});
});