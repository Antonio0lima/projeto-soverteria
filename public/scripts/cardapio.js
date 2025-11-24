document.addEventListener("DOMContentLoaded", () => {
    
    console.log("Sistema de Cardápio Iniciado.");

    let dadosGerais = [];

    // --- TENTATIVA 1: Ler do Script JSON (Método Novo e Seguro) ---
    try {
        const elementoJson = document.getElementById('dados-json');
        if (elementoJson && elementoJson.textContent.trim().length > 0) {
            dadosGerais = JSON.parse(elementoJson.textContent);
            console.log("Dados carregados via Script JSON.");
        }
    } catch (e) {
        console.error("Erro ao ler JSON:", e);
    }

    // --- TENTATIVA 2: Ler da Variável Global (Método Antigo - Fallback) ---
    if (dadosGerais.length === 0 && window.dadosCardapio) {
        dadosGerais = window.dadosCardapio;
        console.log("Dados carregados via Variável Global.");
    }

    // --- VERIFICAÇÃO DE SEGURANÇA ---
    if (dadosGerais.length === 0) {
        alert("Atenção: Os dados do cardápio não foram carregados corretamente. Verifique se existem categorias cadastradas no banco.");
        console.error("Dados vazios. O array de categorias está vazio.");
        return; // Para o script aqui se não tiver dados
    }

    // Elementos da DOM
    const botoesCategoria = document.querySelectorAll('.categoria-botao');
    const containerProdutos = document.querySelector('.grid-produtos-container');
    const painelDetalhes = document.querySelector('.painel-produto-escolhido');
    const msgVazia = document.querySelector('.msg-vazia');

    // Verifica se encontrou os botões
    if(botoesCategoria.length === 0) {
        console.warn("Nenhum botão de categoria encontrado no HTML.");
    }

    // --- 1. CLIQUE NA CATEGORIA ---
    botoesCategoria.forEach(btn => {
        btn.addEventListener('click', () => {
            console.log("Clique detectado na categoria!");

            // a) Visual
            botoesCategoria.forEach(b => b.classList.remove('ativo'));
            btn.classList.add('ativo');

            // b) Dados
            const index = btn.getAttribute('data-index');
            const categoriaSelecionada = dadosGerais[index];

            console.log("Categoria selecionada:", categoriaSelecionada);

            if (categoriaSelecionada) {
                renderizarProdutos(categoriaSelecionada.produtos);
            } else {
                alert("Erro: Categoria não encontrada nos dados.");
            }
            
            // d) Limpa a Div 3
            painelDetalhes.innerHTML = '<span style="color: #555; font-size: 0.8em;">Selecione um produto acima</span>';
        });
    });

    // --- FUNÇÃO PARA DESENHAR PRODUTOS ---
    function renderizarProdutos(listaProdutos) {
        containerProdutos.innerHTML = ''; // Limpa a área

        if (!listaProdutos || listaProdutos.length === 0) {
            msgVazia.style.display = 'flex';
            msgVazia.querySelector('span').innerText = 'Nenhum produto nesta categoria.';
            return;
        }

        msgVazia.style.display = 'none'; // Esconde a mensagem "Selecione uma categoria"

        listaProdutos.forEach(prod => {
            const divItem = document.createElement('div');
            divItem.classList.add('item');
            
            divItem.innerHTML = `
                <div class="item-circulo"></div>
                <span>${prod.nome}</span>
            `;

            divItem.addEventListener('click', () => {
                console.log("Produto clicado:", prod.nome);
                document.querySelectorAll('.item').forEach(i => i.classList.remove('selecionado'));
                divItem.classList.add('selecionado');
                mostrarDetalhes(prod);
            });

            containerProdutos.appendChild(divItem);
        });
    }

    // --- FUNÇÃO PARA MOSTRAR TAMANHOS ---
    function mostrarDetalhes(dadosProduto) {
        let htmlTamanhos = '';

        if (dadosProduto.opcoes && dadosProduto.opcoes.length > 0) {
            dadosProduto.opcoes.forEach(opcao => {
                const precoFormatado = parseFloat(opcao.preco).toFixed(2).replace('.', ',');
                
                htmlTamanhos += `
                    <button class="btn-tamanho" style="margin: 5px; padding: 10px; cursor: pointer; border: 2px solid #ddd; border-radius: 10px; background: white;">
                        <div style="font-weight:bold; color: #ff914d;">${opcao.tamanho}</div>
                        <div style="font-size: 1.1em;">R$ ${precoFormatado}</div>
                    </button>
                `;
            });
        } else {
            htmlTamanhos = '<p>Indisponível.</p>';
        }

        painelDetalhes.innerHTML = `
            <div style="text-align: center; width: 100%; animation: fadeIn 0.3s;">
                <h2 style="margin-bottom: 5px;">${dadosProduto.nome}</h2>
                <p style="font-size: 0.8em; color: #666; margin-top: 0;">${dadosProduto.descricao || ''}</p>
                <hr style="opacity: 0.2; margin: 10px 0;">
                <div class="lista-tamanhos" style="display: flex; flex-wrap: wrap; justify-content: center;">
                    ${htmlTamanhos}
                </div>
            </div>
        `;
    }
});