document.addEventListener("DOMContentLoaded", () => {
    
    // --- 1. ELEMENTOS DO HTML ---
    const listaResumo = document.querySelector('.lista-resumo');
    const totalEl = document.querySelector('.total-final span');
    const btnConcluir = document.querySelector('.btn-concluir');
    const idClienteInput = document.getElementById('id-cliente-final');
    
    // Elementos do Upload de Comprovante
    const fileInput = document.getElementById('comprovante-upload');
    const nomeArquivoDiv = document.querySelector('.nome-arquivo');

    // --- 2. CARREGAR CARRINHO ---
    let carrinho = JSON.parse(localStorage.getItem('carrinho_sorveteria') || '[]');

    if (carrinho.length === 0) {
        alert("Seu carrinho está vazio!");
        window.location.href = "/cardapio";
        return;
    }

    // --- 3. EVENTO DE ARQUIVO (Mostrar nome ao selecionar) ---
    if(fileInput) {
        fileInput.addEventListener('change', function() {
            if (this.files && this.files.length > 0) {
                nomeArquivoDiv.textContent = "Arquivo: " + this.files[0].name;
                nomeArquivoDiv.style.color = "#333";
                nomeArquivoDiv.style.fontWeight = "bold";
            } else {
                nomeArquivoDiv.textContent = "";
            }
        });
    }

    // --- 4. DESENHAR RESUMO ---
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

    // --- 5. FINALIZAR PEDIDO (Com Upload) ---
    btnConcluir.addEventListener('click', async () => {
        const idCliente = idClienteInput.value;
        
        if (!idCliente) {
            alert("Você precisa estar logado para concluir!");
            window.location.href = "/";
            return;
        }

        btnConcluir.innerText = "Enviando...";
        btnConcluir.disabled = true;

        // ✅ USANDO FORMDATA PARA ENVIAR ARQUIVO + DADOS
        const formData = new FormData();
        
        // Adiciona dados básicos
        formData.append('id_cliente', idCliente);
        formData.append('valor', total.toFixed(2));
        
        // O carrinho (array) precisa ser transformado em string para ir no FormData
        formData.append('produtos', JSON.stringify(carrinho));

        // Verifica se tem arquivo selecionado e adiciona
        if (fileInput && fileInput.files.length > 0) {
            formData.append('comprovante', fileInput.files[0]);
        }

        try {
            // Nota: Não defina 'Content-Type': 'application/json' aqui!
            // O fetch detecta FormData e configura 'multipart/form-data' automaticamente.
            const resp = await fetch('/finalizar-pedido', {
                method: 'POST',
                body: formData 
            });

            const resultado = await resp.json();

            if (resultado.sucesso) {
                // Limpa o carrinho e redireciona
                localStorage.removeItem('carrinho_sorveteria');
                window.location.href = "/pedido-concluido";
            } else {
                throw new Error(resultado.erro || "Erro desconhecido no servidor");
            }

        } catch (err) {
            console.error("Erro detalhado:", err);
            alert("Erro ao processar pedido: " + err.message);
            btnConcluir.innerText = "CONCLUIR PEDIDO";
            btnConcluir.disabled = false;
        }
    });
});