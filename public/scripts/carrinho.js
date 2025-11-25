document.addEventListener("DOMContentLoaded", () => {
    const listaContainer = document.getElementById("lista-carrinho");
    const subtotalEl = document.getElementById("subtotal");
    const totalFinalEl = document.getElementById("total-final");
    const btnFinalizar = document.getElementById("btn-finalizar");
    const btnLimpar = document.getElementById("btn-limpar");
    
    // Pega o ID do cliente do input hidden
    const idClienteElement = document.getElementById("id-cliente");
    const idCliente = idClienteElement ? idClienteElement.value : "";

    let carrinho = JSON.parse(localStorage.getItem('carrinho_sorveteria') || '[]');

    function renderizarCarrinho() {
        listaContainer.innerHTML = "";
        let total = 0;

        if (carrinho.length === 0) {
            listaContainer.innerHTML = '<p class="msg-vazia" style="text-align:center;">Seu carrinho está vazio.</p>';
            subtotalEl.innerText = "R$ 0,00";
            totalFinalEl.innerText = "R$ 0,00";
            return;
        }

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

    // Função global para remover item individual
    window.removerItem = function(index) {
        carrinho.splice(index, 1);
        localStorage.setItem('carrinho_sorveteria', JSON.stringify(carrinho));
        renderizarCarrinho();
    };

    // --- AQUI ESTÁ A MUDANÇA: LIMPAR TUDO SEM POPUP ---
    if(btnLimpar) {
        btnLimpar.addEventListener("click", () => {
            // Removemos o "confirm" e limpamos direto
            carrinho = [];
            localStorage.removeItem('carrinho_sorveteria');
            renderizarCarrinho();
        });
    }

    // Finalizar Pedido
    if (btnFinalizar) {
        btnFinalizar.addEventListener("click", async () => {
            if (carrinho.length === 0) {
                alert("Seu carrinho está vazio!");
                return;
            }

            // Monta a descrição do pedido para o banco
            let descricaoProdutos = carrinho.map(item => {
                let desc = `${item.quantidade}x ${item.produto_nome} (${item.tamanho})`;
                if(item.adicionais.length > 0) {
                    desc += ` c/ ${item.adicionais.map(a => a.nome).join('+')}`;
                }
                return desc;
            }).join(" | ");

            const totalPedido = carrinho.reduce((acc, item) => acc + item.preco_total, 0);

            const dadosPedido = {
                id_cliente: idCliente,
                produtos: descricaoProdutos,
                valor: totalPedido
            };

            try {
                const resp = await fetch('/finalizar-pedido', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dadosPedido)
                });

                const resultado = await resp.json();

                if (resultado.sucesso) {
                    alert("✅ Pedido realizado com sucesso!");
                    localStorage.removeItem('carrinho_sorveteria');
                    window.location.href = "/perfil"; 
                } else {
                    alert("Erro ao realizar pedido: " + (resultado.erro || "Desconhecido"));
                }
            } catch (err) {
                console.error(err);
                alert("Erro de conexão ao enviar pedido.");
            }
        });
    }

    renderizarCarrinho();
});