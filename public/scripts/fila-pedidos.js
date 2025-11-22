// ------------------------------------------------
// DRAG & DROP - Fila de pedidos
// ------------------------------------------------

// Seleciona todos os cartões e colunas
let cartoes = document.querySelectorAll('.cartao');
let colunas = document.querySelectorAll('.coluna');

// Torna cada cartão arrastável
cartoes.forEach(cartao => {
  cartao.addEventListener('dragstart', () => {
    cartao.classList.add('arrastando');
  });

  cartao.addEventListener('dragend', () => {
    cartao.classList.remove('arrastando');
  });
});

// Lógica das colunas
colunas.forEach(coluna => {
  
  coluna.addEventListener('dragover', (e) => {
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

    // 📌 Captura dados do cartão e da coluna
    const id = cartao.dataset.id;
    const novo_status = coluna.dataset.status;

    console.log("Movendo pedido:", id, "->", novo_status);

    try {
      const resposta = await fetch("/atualizar-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, novo_status })
      });

      const data = await resposta.json();
      console.log("Resposta do servidor:", data);

      // Atualiza tela rapidinho
      setTimeout(() => location.reload(), 10);

    } catch (erro) {
      console.error("Erro ao atualizar status:", erro);
    }
  });
});
// ------------------------------------------------
// POPUP DE EDIÇÃO
// ------------------------------------------------
const overlay = document.getElementById("overlay");
const popup = document.getElementById("popupEditar");

const inputValor = document.getElementById("editValor");

let idEditando = null;

// Abrir popup ao clicar no lápis
document.querySelectorAll(".bolinha i.fa-pen").forEach(icone => {
  icone.addEventListener("click", () => {
    const cartao = icone.closest(".cartao");

    const id = cartao.dataset.id;
    const valor = cartao.querySelector(".campo.pequeno").innerText.replace("R$ ", "");

    console.log("Editando pedido:", id, "Valor atual:", valor);

    idEditando = id;
    inputValor.value = valor;

    overlay.style.display = "block";
    popup.style.display = "block";
  });
});

// Fechar popup
function fecharPopup() {
  overlay.style.display = "none";
  popup.style.display = "none";
}

overlay.addEventListener("click", fecharPopup);

// Salvar edição
async function salvarEdicao() {
  const novoValor = inputValor.value.trim();

  try {
    const resposta = await fetch('/editar-pedido', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: idEditando,
        valor: novoValor
      })
    });

    if (!resposta.ok) throw new Error("Erro ao editar");

    fecharPopup();
    setTimeout(() => location.reload(), 200);

  } catch (erro) {
    console.error("Erro ao editar pedido:", erro);
  }
}

// deixa acessível no HTML
window.salvarEdicao = salvarEdicao;
window.fecharPopup = fecharPopup;
