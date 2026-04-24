/* portal.js */

document.addEventListener('DOMContentLoaded', () => {
    
    // ====================================================
    // 1. LÓGICA DO CURSOR ANIMADO
    // ====================================================
    const cursorBlur = document.getElementById('cursor-blur');
    
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let cursorX = mouseX;
    let cursorY = mouseY;

    function animate() {
        let distX = mouseX - cursorX;
        let distY = mouseY - cursorY;
        
        cursorX += distX * 0.1;
        cursorY += distY * 0.1;
        
        if (cursorBlur) {
            cursorBlur.style.left = `${cursorX}px`;
            cursorBlur.style.top = `${cursorY}px`;
        }
        
        requestAnimationFrame(animate);
    }

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    animate();
    console.log("%c[SYSTEM] GRIMÓRIO_OPS PORTAL INITIALIZED", "color: #a6e3a1; font-weight: bold;");


    // ====================================================
    // 2. LÓGICA DO MODAL DE SENHA ADMIN
    // ====================================================
    const btnAdmin = document.getElementById('btn-admin');
    const modalSenha = document.getElementById('modal-senha');
    const btnFecharSenha = document.getElementById('btn-fechar-senha');
    const btnConfirmarSenha = document.getElementById('btn-confirmar-senha');
    const inputSenha = document.getElementById('input-senha');
    const erroSenha = document.getElementById('erro-senha');

    // Abre o modal ao clicar em ADMINISTRADORES
    if (btnAdmin) {
        btnAdmin.addEventListener('click', function(event) {
            event.preventDefault(); 
            modalSenha.style.display = 'flex';
            inputSenha.value = ''; 
            erroSenha.style.display = 'none';
            inputSenha.style.borderColor = 'var(--border-glass)';
            setTimeout(() => inputSenha.focus(), 100); // Foca para digitar na hora
        });
    }

    // Função para validar a senha
    function verificarSenha() {
        // >>> AQUI VOCÊ PODE MUDAR A SUA SENHA <<<
        if (inputSenha.value === "St33lB4llRun") {
            window.location.href = "index.html?admin=true";
        } else {
            erroSenha.style.display = 'block';
            inputSenha.style.borderColor = 'var(--accent-red)';
            inputSenha.value = ''; // Limpa o campo
            inputSenha.focus();
        }
    }

    // Clique no botão ENTRAR
    if (btnConfirmarSenha) {
        btnConfirmarSenha.addEventListener('click', verificarSenha);
    }

    // Apertar a tecla ENTER no teclado
    if (inputSenha) {
        inputSenha.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') verificarSenha();
        });
    }

    // Clique no botão CANCELAR
    if (btnFecharSenha) {
        btnFecharSenha.addEventListener('click', function() {
            modalSenha.style.display = 'none';
        });
    }
});

