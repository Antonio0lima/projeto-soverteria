document.addEventListener("DOMContentLoaded", () => {
    const listaContainer = document.getElementById("lista-carrinho");
    const subtotalEl = document.getElementById("subtotal");
    const totalFinalEl = document.getElementById("total-final");
    const btnFinalizar = document.getElementById("btn-finalizar");
    const btnLimpar = document.getElementById("btn-limpar");
    
    let carrinho = JSON.parse(localStorage.getItem('carrinho_sorveteria') || '[]');

    function renderizarCarrinho() {
        listaContainer.innerHTML = "";
        let total = 0;

        // --- LÓGICA DO BOTÃO DESABILITADO ---
        if (carrinho.length === 0) {
            listaContainer.innerHTML = '<p class="msg-vazia" style="text-align:center;">Seu carrinho está vazio.</p>';
            subtotalEl.innerText = "R$ 0,00";
            totalFinalEl.innerText = "R$ 0,00";
            
            // AQUI: Desabilita o botão se estiver vazio
            if (btnFinalizar) {
                btnFinalizar.disabled = true;
                btnFinalizar.innerText = "Carrinho Vazio"; // (Opcional) Muda o texto
            }
            return;
        } else {
            // Se tiver itens, habilita o botão
            if (btnFinalizar) {
                btnFinalizar.disabled = false;
                btnFinalizar.innerText = "FINALIZAR PEDIDO";
            }
        }
        // -------------------------------------

        carrinho.forEach((item, index) => {
            total += item.preco_total;

            let textoAdicionais = "";
            if (item.adicionais && item.adicionais.length > 0) {
                const nomesAdds = item.adicionais.map(a => a.nome).join(", ");
                textoAdicionais = `<div class="adicionais">+ ${nomesAdds}</div>`;
            }

            const div = document.createElement("div");
            div.className = "item-carrinho";
            div.innerHTML = `
                <div class="info-item">
                    <h3>${item.produto_nome}</h3>
                    <p>Tamanho: ${item.tamanho}</p>
                    ${textoAdicionais}
                </div>
                <div class="preco-acoes">
                    <span class="preco-item">R$ ${item.preco_total.toFixed(2).replace('.', ',')}</span>
                    <button class="btn-remover" onclick="removerItem(${index})">Remover</button>
                </div>
            `;
            listaContainer.appendChild(div);
        });

        const totalFormatado = `R$ ${total.toFixed(2).replace('.', ',')}`;
        subtotalEl.innerText = totalFormatado;
        totalFinalEl.innerText = totalFormatado;
    }

    window.removerItem = function(index) {
        carrinho.splice(index, 1);
        localStorage.setItem('carrinho_sorveteria', JSON.stringify(carrinho));
        renderizarCarrinho();
    };

    if(btnLimpar) {
        btnLimpar.addEventListener("click", () => {
            carrinho = [];
            localStorage.removeItem('carrinho_sorveteria');
            renderizarCarrinho();
        });
    }

    // --- EVENTO DO BOTÃO ---
    if (btnFinalizar) {
        btnFinalizar.addEventListener("click", () => {
            // Removemos o alert. Como o botão estará disabled (HTML),
            // o clique nem vai disparar se estiver vazio.
            // Mas por segurança mantemos a verificação silenciosa:
            if (carrinho.length === 0) return; 
            
            window.location.href = "/finalizacao";
        });
    }

    renderizarCarrinho();
});