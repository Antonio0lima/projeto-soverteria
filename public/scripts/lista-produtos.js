
    function abrirPopupNovoProduto() {
      document.getElementById('popupTitulo').textContent = 'Novo Produto';
      document.getElementById('formProduto').reset();
      document.getElementById('produtoId').value = '';
      document.getElementById('tamanhosContainer').innerHTML = '';
      document.getElementById('popupProduto').style.display = 'flex';
    }

    function editarProduto(id) {
      // Aqui você implementaria a busca dos dados do produto
      document.getElementById('popupTitulo').textContent = 'Editar Produto';
      document.getElementById('produtoId').value = id;
      // Preencher os campos com os dados do produto
      document.getElementById('popupProduto').style.display = 'flex';
    }

    function excluirProduto(id) {
      if (confirm('Tem certeza que deseja excluir este produto?')) {
        // Implementar exclusão
        console.log('Excluir produto:', id);
      }
    }

    function editarAdicional(id) {
      // Implementar edição de adicional
      console.log('Editar adicional:', id);
    }

    function excluirAdicional(id) {
      if (confirm('Tem certeza que deseja excluir este adicional?')) {
        // Implementar exclusão
        console.log('Excluir adicional:', id);
      }
    }

    function fecharPopup() {
      document.getElementById('popupProduto').style.display = 'none';
    }

    function adicionarTamanho() {
      const container = document.getElementById('tamanhosContainer');
      const div = document.createElement('div');
      div.className = 'tamanho-item';
      div.innerHTML = `
        <input type="text" placeholder="Nome do tamanho" required>
        <input type="number" placeholder="Preço" step="0.01" min="0" required>
        <button type="button" class="btn-remover-tamanho" onclick="this.parentElement.remove()">
          <i class="fa-solid fa-times"></i>
        </button>
      `;
      container.appendChild(div);
    }

    // Fechar popup clicando fora
    document.getElementById('popupProduto').addEventListener('click', function(e) {
      if (e.target === this) {
        fecharPopup();
      }
    });

    // Submit do formulário
    document.getElementById('formProduto').addEventListener('submit', function(e) {
      e.preventDefault();
      // Implementar salvamento
      console.log('Salvar produto:', {
        id: document.getElementById('produtoId').value,
        nome: document.getElementById('produtoNome').value,
        descricao: document.getElementById('produtoDescricao').value,
        categoria: document.getElementById('produtoCategoria').value
      });
      fecharPopup();
    });
