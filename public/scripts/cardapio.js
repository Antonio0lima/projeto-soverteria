document.addEventListener("DOMContentLoaded", () => {
    const itens = document.querySelectorAll(".item");

    itens.forEach(item => {
        item.addEventListener("click", () => {

            // Remove a classe 'selecionado' de todos os itens
            itens.forEach(i => i.classList.remove("selecionado"));

            // Adiciona a classe 'selecionado' apenas ao item clicado
            item.classList.add("selecionado");

            // Captura e exibe o nome do produto selecionado
            const nome = item.dataset.nome;
            console.log("Selecionado:", nome);
            
            // DICA: Aqui você pode adicionar a lógica para atualizar
            // o "Painel B" (painel-produto-escolhido) com os dados do item.
        });
    });
});