
  const loginContainer = document.querySelector('.login-container');
  const registroContainer = document.querySelector('.registro-container');
  const botaoRegistro = document.getElementById('botao-registro');
  const botaoVoltar = document.getElementById('botao-voltar');

  // Mostrar formulário de registro
  botaoRegistro.addEventListener('click', () => {
  window.location.href = '/registro';
});

  // Voltar para login
  botaoVoltar.addEventListener('click', () => {
    registroContainer.style.display = 'none';
    loginContainer.style.display = 'flex';
  });

