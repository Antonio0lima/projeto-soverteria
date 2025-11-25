document.addEventListener("DOMContentLoaded", () => {
    
    // --- 1. ELEMENTOS DO HTML ---
    const listaResumo = document.querySelector('.lista-resumo'); // Onde os itens entram
    const totalEl = document.querySelector('.total-final span'); // Onde fica o preço total
    const btnConcluir = document.querySelector('.btn-concluir'); // Botão vermelho
    const idClienteInput = document.getElementById('id-cliente-final'); // ID do usuário escondido

    // --- 2. CARREGAR DADOS DA MEMÓRIA DO NAVEGADOR (CARRINHO) ---
    // Não consultamos o banco aqui, pois o pedido ainda é "provisório"
    let carrinho = JSON.parse(localStorage.getItem('carrinho_sorveteria') || '[]');

    // Se estiver vazio, volta pro cardápio
    if (carrinho.length === 0) {
        alert("Seu carrinho está vazio!");
        window.location.href = "/cardapio";
        return;
    }

    // --- 3. DESENHAR O RESUMO NA TELA ---
    listaResumo.innerHTML = ""; // Limpa o texto "Carregando itens..."
    let total = 0;

    carrinho.forEach(item => {
        total += item.preco_total;
        
        // Monta texto de adicionais se houver (ex: + Nutella)
        let textoAdd = "";
        if(item.adicionais && item.adicionais.length > 0) {
            const nomes = item.adicionais.map(a => a.nome).join(', ');
            textoAdd = `<div style="font-size:0.8em; color:#d35400; margin-left:10px;">+ ${nomes}</div>`;
        }

        // Cria o elemento visual de cada item
        const div = document.createElement('div');
        div.className = 'item-resumo';
        // Estilização simples via JS para garantir que fique bonito
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

    // Atualiza o preço total lá embaixo
    totalEl.innerText = `R$ ${total.toFixed(2).replace('.', ',')}`;


    // --- 4. AQUI SIM: A LIGAÇÃO COM O BANCO DE DADOS (AO CLICAR) ---
    btnConcluir.addEventListener('click', async () => {
        const idCliente = idClienteInput.value; // Pega o ID do input hidden
        
        if (!idCliente) {
            alert("Você precisa estar logado para concluir!");
            window.location.href = "/"; // Manda pro login se não tiver ID
            return;
        }

        btnConcluir.innerText = "Processando...";
        btnConcluir.disabled = true;

        // Prepara os dados do carrinho para salvar no Banco de Dados
        // Transformamos o array de objetos em uma String legível para o banco
        let descricaoProdutos = carrinho.map(item => {
            let desc = `${item.quantidade}x ${item.produto_nome} (${item.tamanho})`;
            if(item.adicionais.length > 0) {
                desc += ` c/ ${item.adicionais.map(a => a.nome).join('+')}`;
            }
            return desc;
        }).join(" | ");

        const dadosParaBanco = {
            id_cliente: idCliente,
            produtos: descricaoProdutos,
            valor: total
        };

        try {
            // Faz a requisição POST para o seu server.js
            const resp = await fetch('/finalizar-pedido', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosParaBanco)
            });

            const resultado = await resp.json();

            if (resultado.sucesso) {
                alert("✅ Pedido realizado com sucesso!");
                localStorage.removeItem('carrinho_sorveteria'); // Limpa o carrinho
                window.location.href = "/perfil"; // Manda para o histórico de pedidos
            } else {
                alert("Erro ao salvar no banco: " + (resultado.erro || "Desconhecido"));
                btnConcluir.innerText = "CONCLUIR PEDIDO";
                btnConcluir.disabled = false;
            }
        } catch (err) {
            console.error(err);
            alert("Erro de conexão com o servidor.");
            btnConcluir.innerText = "CONCLUIR PEDIDO";
            btnConcluir.disabled = false;
        }
    });

});