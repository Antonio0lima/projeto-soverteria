document.addEventListener("DOMContentLoaded", () => {
    
    // --- 1. ELEMENTOS DO HTML ---
    const listaResumo = document.querySelector('.lista-resumo');
    const totalEl = document.querySelector('.total-final span');
    const btnConcluir = document.querySelector('.btn-concluir');
    const idClienteInput = document.getElementById('id-cliente-final');

    // --- 2. CARREGAR CARRINHO ---
    let carrinho = JSON.parse(localStorage.getItem('carrinho_sorveteria') || '[]');

    if (carrinho.length === 0) {
        alert("Seu carrinho está vazio!");
        window.location.href = "/cardapio";
        return;
    }

    // --- 3. DESENHAR RESUMO ---
    listaResumo.innerHTML = "";
    let total = 0;

    carrinho.forEach(item => {
        total += item.preco_total;
        
        let textoAdd = "";
        if(item.adicionais && item.adicionais.length > 0) {
            const nomes = item.adicionais.map(a => a.nome).join(', ');
            textoAdd = `<div style="font-size:0.8em; color:#d35400; margin-left:10px;">+ ${nomes}</div>`;
        }

        const div = document.createElement('div');
        div.className = 'item-resumo';
        div.style.display = "flex";
        div.style.justifyContent = "space-between";
        div.style.marginBottom = "10px";
        div.style.borderBottom = "1px solid rgba(0,0,0,0.1)";
        div.style.paddingBottom = "5px";

        div.innerHTML = `
            <div>
                <strong>${item.quantidade}x ${item.produto_nome}</strong> <small>(${item.tamanho})</small>
                ${textoAdd}
            </div>
            <div>R$ ${item.preco_total.toFixed(2).replace('.', ',')}</div>
        `;
        listaResumo.appendChild(div);
    });

    totalEl.innerText = `R$ ${total.toFixed(2).replace('.', ',')}`;

    // --- 4. FINALIZAR PEDIDO ---
    btnConcluir.addEventListener('click', async () => {
        const idCliente = idClienteInput.value;
        
        if (!idCliente) {
            alert("Você precisa estar logado para concluir!");
            window.location.href = "/";
            return;
        }

        btnConcluir.innerText = "Processando...";
        btnConcluir.disabled = true;

        // ✅ PREPARA OS DADOS DE FORMA SEGURA
        const dadosParaBanco = {
            id_cliente: parseInt(idCliente), // Garante que é número
            produtos: carrinho, // Array completo
            valor: parseFloat(total.toFixed(2)) // Garante que é número
        };

        console.log("Enviando para servidor:", dadosParaBanco);

        try {
            const resp = await fetch('/finalizar-pedido', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(dadosParaBanco)
            });

            // Verifica se a resposta é JSON
            const contentType = resp.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                throw new Error("Resposta do servidor não é JSON");
            }

            const resultado = await resp.json();

            if (resultado.sucesso) {
                alert("✅ Pedido realizado com sucesso!");
                localStorage.removeItem('carrinho_sorveteria');
                window.location.href = "/perfil";
            } else {
                alert("Erro: " + (resultado.erro || "Desconhecido"));
                btnConcluir.innerText = "CONCLUIR PEDIDO";
                btnConcluir.disabled = false;
            }
        } catch (err) {
            console.error("Erro detalhado:", err);
            alert("Erro de conexão: " + err.message);
            btnConcluir.innerText = "CONCLUIR PEDIDO";
            btnConcluir.disabled = false;
        }
    });
});