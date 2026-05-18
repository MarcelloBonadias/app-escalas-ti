// 1. Função para carregar a equipe do MySQL

async function carregarEquipe() {

    try {

        const resposta = await fetch('/api/usuarios');

        const dados = await resposta.json();

        bancoDeEquipe = dados.length > 0 ? dados : defaultTeam;

        renderizar();

    } catch (erro) {

        console.error("Erro ao conectar com o MySQL:", erro);

    }

}


// 2. No botão de SALVAR AGENTE, troque a lógica por esta:

document.getElementById('btn-salvar-agente').onclick = async () => {

    const novoAgente = {

        nome: document.getElementById('edit-nome').value,

        cor: document.getElementById('edit-cor').value,

        empresa: document.getElementById('edit-empresa').value,

        cargo: document.getElementById('edit-cargo').value,

        turno: document.getElementById('edit-turno').value

        // adicione os outros campos conforme seu server.js espera

    };


    try {

        await fetch('/api/usuarios', {

            method: 'POST',

            headers: { 'Content-Type': 'application/json' },

            body: JSON.stringify(novoAgente)

        });

        modal.style.display = 'none';

        carregarEquipe(); // Recarrega do banco após salvar

    } catch (erro) {

        alert("Erro ao salvar no banco MySQL!");

    }

};
