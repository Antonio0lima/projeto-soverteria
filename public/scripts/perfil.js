
        let dadosOriginais = {};
        
        function entrarModoEdicao() {
            // Salva dados originais
            dadosOriginais = {
                nome: document.getElementById('nome-edit').value,
                nascimento: document.getElementById('nascimento-edit').value,
                pix: document.getElementById('pix-edit').value
            };
            
            // Alterna entre modos
            document.querySelectorAll('.view-mode').forEach(el => el.style.display = 'none');
            document.querySelectorAll('.edit-mode').forEach(el => el.style.display = 'flex');
            document.getElementById('btn-editar').style.display = 'none';
            document.getElementById('botoes-edicao').style.display = 'flex';
        }
        
        function cancelarEdicao() {
            // Restaura dados originais
            document.getElementById('nome-edit').value = dadosOriginais.nome;
            document.getElementById('nascimento-edit').value = dadosOriginais.nascimento;
            document.getElementById('pix-edit').value = dadosOriginais.pix;
            
            // Volta para modo visualização
            document.querySelectorAll('.view-mode').forEach(el => el.style.display = 'flex');
            document.querySelectorAll('.edit-mode').forEach(el => el.style.display = 'none');
            document.getElementById('btn-editar').style.display = 'flex';
            document.getElementById('botoes-edicao').style.display = 'none';
        }
        
        async function salvarEdicao() {
            const dadosAtualizados = {
                nome: document.getElementById('nome-edit').value.trim(),
                data_nascimento: document.getElementById('nascimento-edit').value,
                chave_pix: document.getElementById('pix-edit').value.trim()
            };
            
            // Validação básica
            if (!dadosAtualizados.nome) {
                alert('Por favor, preencha seu nome');
                return;
            }
            
            try {
                const response = await fetch('/atualizar-perfil', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(dadosAtualizados)
                });
                
                const resultado = await response.json();
                
                if (resultado.sucesso) {
                    // Atualiza a visualização com os novos dados
                    document.getElementById('nome-view').textContent = dadosAtualizados.nome;
                    document.getElementById('pix-view').textContent = dadosAtualizados.chave_pix || 'Não cadastrada';
                    
                    // Formata e atualiza a data de nascimento na visualização
                    if (dadosAtualizados.data_nascimento) {
                        const data = new Date(dadosAtualizados.data_nascimento);
                        const dataFormatada = data.toLocaleDateString('pt-BR');
                        document.getElementById('nascimento-view').textContent = dataFormatada;
                    }
                    
                    // Mostra modal de sucesso
                    document.getElementById('mensagem-sucesso').textContent = resultado.mensagem;
                    document.getElementById('modal-sucesso').style.display = 'flex';
                    
                    // Sai do modo edição
                    cancelarEdicao();
                    
                } else {
                    alert('Erro ao atualizar: ' + (resultado.erro || 'Erro desconhecido'));
                }
            } catch (erro) {
                console.error('Erro:', erro);
                alert('Erro de conexão. Tente novamente.');
            }
        }
        
        // Event Listeners
        document.getElementById('btn-editar').addEventListener('click', entrarModoEdicao);
        document.getElementById('btn-salvar').addEventListener('click', salvarEdicao);
        document.getElementById('btn-cancelar').addEventListener('click', cancelarEdicao);
        document.getElementById('btn-fechar-modal').addEventListener('click', function() {
            document.getElementById('modal-sucesso').style.display = 'none';
        });
        
        // Fecha modal clicando fora
        window.addEventListener('click', function(event) {
            const modal = document.getElementById('modal-sucesso');
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    
        // Função para fazer logout
async function fazerLogout() {
    try {
        const response = await fetch('/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        const resultado = await response.json();
        
        if (resultado.sucesso) {
            // Redireciona para a página inicial após logout
            window.location.href = '/';
        } else {
            alert('Erro ao fazer logout: ' + (resultado.erro || 'Erro desconhecido'));
        }
    } catch (erro) {
        console.error('Erro ao fazer logout:', erro);
        alert('Erro de conexão. Tente novamente.');
    }
}

// Mostrar modal de confirmação de logout
function mostrarModalLogout() {
    document.getElementById('modal-logout').style.display = 'flex';
}

// Fechar modal de logout
function fecharModalLogout() {
    document.getElementById('modal-logout').style.display = 'none';
}

// Event Listeners para logout
document.getElementById('btn-logout').addEventListener('click', mostrarModalLogout);
document.getElementById('btn-confirmar-logout').addEventListener('click', fazerLogout);
document.getElementById('btn-cancelar-logout').addEventListener('click', fecharModalLogout);

// Fecha modal de logout clicando fora
window.addEventListener('click', function(event) {
    const modalLogout = document.getElementById('modal-logout');
    if (event.target === modalLogout) {
        fecharModalLogout();
    }
});

// Fecha modal de logout com ESC
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        fecharModalLogout();
    }
});