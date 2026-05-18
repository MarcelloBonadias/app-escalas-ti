document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // SISTEMA DE TEMA CLARO/ESCURO SINCRONIZADO
    // ==========================================
    const btnThemeEquipe = document.getElementById('btn-theme-equipe');
    if (localStorage.getItem('theme') === 'light') { 
        document.body.classList.add('light-mode'); 
        if (btnThemeEquipe) btnThemeEquipe.innerHTML = '🌙 TEMA'; 
    }
    
    if (btnThemeEquipe) {
        btnThemeEquipe.addEventListener('click', () => {
            document.body.classList.toggle('light-mode');
            const isLight = document.body.classList.contains('light-mode');
            localStorage.setItem('theme', isLight ? 'light' : 'dark');
            btnThemeEquipe.innerHTML = isLight ? '🌙 TEMA' : '☀️ TEMA';
        });
    }

    // ==========================================
    // BOTÃO NOVO OPERADOR
    // ==========================================
    const btnNovoAgente = document.getElementById('btn-novo-agente');
    if (btnNovoAgente) {
        btnNovoAgente.addEventListener('click', () => {
            document.getElementById('modal-titulo').innerText = "➕ NOVA CREDENCIAL";
            document.getElementById('edit-id').value = "novo"; // Marca como um novo cadastro
            document.getElementById('edit-nome').value = "";
            
            const inputContato = document.getElementById('edit-contato');
            if(inputContato) inputContato.value = "";
            
            const inputEmail = document.getElementById('edit-email');
            if(inputEmail) inputEmail.value = "";
            
            const inputDesc = document.getElementById('edit-descricao');
            if(inputDesc) inputDesc.value = "";
            
            const cargoElement = document.getElementById('edit-cargo');
            if(cargoElement) cargoElement.value = "tecnico";

            if (fileInput) fileInput.value = "";
            if (fileNameDisplay) {
                fileNameDisplay.textContent = 'Escolher arquivo...';
                fileNameDisplay.style.color = 'var(--text-main)';
            }
            
            const btnRemover = document.getElementById('btn-remover-agente');
            if(btnRemover) btnRemover.style.display = 'none'; // Esconde o botão de excluir ao criar novo
            
            if(modal) modal.style.display = 'flex';
        });
    }
    let bancoDeEquipe = [];
    const rosterGrid = document.getElementById('roster-grid');
    const inputBusca = document.getElementById('input-busca');
    const modal = document.getElementById('modal-editar-agente');

    const fileInput = document.getElementById('edit-avatar-file');
    const fileNameDisplay = document.getElementById('file-name-display');
    if (fileInput && fileNameDisplay) {
        fileInput.addEventListener('change', function() {
            if (this.files && this.files.length > 0) {
                fileNameDisplay.textContent = '✅ ' + this.files[0].name;
                fileNameDisplay.style.color = 'var(--accent-purple)';
            } else {
                fileNameDisplay.textContent = 'Escolher arquivo...';
                fileNameDisplay.style.color = 'var(--text-color)';
            }
        });
    }

    async function carregarDoBanco() {
        try {
            const resposta = await fetch('/api/usuarios');
            bancoDeEquipe = await resposta.json();
            const filtroBtn = document.querySelector('.filter-btn.active');
            const filtroAtivo = filtroBtn ? filtroBtn.dataset.filter : 'all';
            renderizar(filtroAtivo, inputBusca.value);
        } catch (erro) { console.error("Erro ao puxar dados:", erro); }
    }

    function renderizar(filtro = 'all', busca = '') {
        rosterGrid.innerHTML = '';
        const termo = busca.toLowerCase();
        const equipeOrdenada = [...bancoDeEquipe].sort((a,b) => a.nome.localeCompare(b.nome));

        equipeOrdenada.forEach((agente) => {
            let cargoFiltroTela = 'tecnico';
            if (agente.cargo && agente.cargo.toLowerCase() === 'coordenador') cargoFiltroTela = 'coordenador';
            if (agente.cargo && agente.cargo.toLowerCase() === 'analista') cargoFiltroTela = 'analista';

            if ((filtro === 'all' || cargoFiltroTela === filtro) && agente.nome.toLowerCase().includes(termo)) {
                
                let avatarContent = "👨‍💻"; 
                if (agente.foto && agente.foto.startsWith('data:image')) {
                    avatarContent = `<img src="${agente.foto}" style="width:100%; height:100%; object-fit:cover;">`;
                }

                const badgeClass = cargoFiltroTela === 'coordenador' ? 'badge-coord' : cargoFiltroTela === 'analista' ? 'badge-analista' : 'badge-tecnico';
                
                // Formatação de Nome
                let nomeFormatado = agente.nome.toLowerCase().split(' ').map(palavra => palavra.charAt(0).toUpperCase() + palavra.slice(1)).join(' ');
                let textoDescricao = agente.descricao || "Operador Ativo no NOC Command Center.";
                
                // Formatação de Telefone
                let telOriginal = agente.telefone || "";
                let telFormatado = telOriginal;
                if (telOriginal.replace(/\D/g, '').length === 11) {
                    const t = telOriginal.replace(/\D/g, '');
                    telFormatado = `(${t.substring(0,2)}) ${t.substring(2,7)}-${t.substring(7,11)}`;
                } else if (!telOriginal) {
                    telFormatado = "(00) 00000-0000";
                }

                let mail = agente.email || "operador@empresa.com";
                
                // Caixa de Contatos
                let contatosHTML = `
                    <div style="background: rgba(17, 17, 27, 0.5); border: 1px dashed rgba(166, 173, 200, 0.2); border-radius: 8px; padding: 12px 15px; display: flex; flex-direction: column; gap: 8px; width: 90%; margin: 0 auto; box-sizing: border-box; box-shadow: inset 0 0 10px rgba(0,0,0,0.2);">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="color: #f38ba8; font-size: 1.1em;">📞</span>
                            <span style="color: #89b4fa; font-family: 'Share Tech Mono', monospace; font-size: 0.95em;">${telFormatado}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px; overflow: hidden;">
                            <span style="color: #cdd6f4; font-size: 1.1em;">✉️</span>
                            <span style="color: #89b4fa; font-family: 'Share Tech Mono', monospace; font-size: 0.85em; text-transform: lowercase; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;" title="${mail}">${mail}</span>
                        </div>
                    </div>
                `;

                // A CAPA BORRADA
                let urlCapa = (agente.foto && agente.foto.startsWith('data:image')) 
                    ? agente.foto 
                    : 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1000&auto=format&fit=crop';

                rosterGrid.innerHTML += `
                    <div class="agent-card" style="padding-top: 25px;">
                        <div class="agent-cover" style="background-image: url('${urlCapa}');"></div>
                        
                        <div class="agent-card-content" style="width: 100%; display: flex; flex-direction: column; align-items: center;">
                            <button class="btn-editar-card" onclick="abrirEditor(${agente.id})">✏️</button>
                            <div class="agent-avatar avatar-${cargoFiltroTela}" style="box-shadow: 0 0 15px rgba(0,0,0,0.5);">${avatarContent}</div>
                            
                            <h2 class="agent-name" style="margin-top: 15px; font-size: 1.15rem; line-height: 1.3; text-align: center; padding: 0 10px;">${nomeFormatado}</h2>
                            <div style="margin-top: 5px;"><span class="badge ${badgeClass}">${agente.cargo ? agente.cargo.toUpperCase() : 'TÉCNICO'}</span></div>
                            
                            <p style="font-size:0.85rem; color:var(--text-dim); margin-top:15px; margin-bottom:15px; flex-grow:1; line-height: 1.5; text-align: center; padding: 0 15px;">${textoDescricao}</p>
                            
                            <!-- Adicionado um margin-bottom de 20px para dar um espaço no final do card -->
                            <div class="agent-contacts" style="width: 100%; border: none; background: transparent; padding: 0; text-align: center; margin-bottom: 20px;">
                                ${contatosHTML}
                            </div>
                        </div>
                    </div>
                `;
            }
        });
    }

    inputBusca.addEventListener('input', (e) => {
        const filtroBtn = document.querySelector('.filter-btn.active');
        renderizar(filtroBtn ? filtroBtn.dataset.filter : 'all', e.target.value);
    });

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderizar(btn.dataset.filter, inputBusca.value);
        });
    });

    window.abrirEditor = function(idBanco) {
        try {
            const agente = bancoDeEquipe.find(u => u.id == idBanco);
            if (!agente) return alert("Erro: Agente não encontrado na memória!");

            document.getElementById('modal-titulo').innerText = "✏️ EDITAR CREDENCIAL";
            document.getElementById('edit-id').value = agente.id; 
            document.getElementById('edit-nome').value = agente.nome;
            
            const inputContato = document.getElementById('edit-contato');
            if(inputContato) inputContato.value = agente.telefone || '';
            
            const inputEmail = document.getElementById('edit-email');
            if(inputEmail) inputEmail.value = agente.email || '';
            
            const inputDesc = document.getElementById('edit-descricao');
            if(inputDesc) inputDesc.value = agente.descricao || '';
            
            if (fileInput) fileInput.value = ""; 
            if (fileNameDisplay) {
                fileNameDisplay.textContent = 'Escolher arquivo...';
                fileNameDisplay.style.color = 'var(--text-main)';
            }
            
            let cargoSelect = 'tecnico';
            if (agente.cargo && agente.cargo.toLowerCase() === 'coordenador') cargoSelect = 'coordenador';
            if (agente.cargo && agente.cargo.toLowerCase() === 'analista') cargoSelect = 'analista';
            
            const cargoElement = document.getElementById('edit-cargo');
            if(cargoElement) cargoElement.value = cargoSelect;
            
            const btnRemover = document.getElementById('btn-remover-agente');
            if(btnRemover) btnRemover.style.display = 'block';
            
            if(modal) modal.style.display = 'flex';
        } catch (error) {
            alert("Erro bloqueando o modal: " + error.message);
        }
    };

    document.getElementById('btn-salvar-agente').onclick = async () => {
        const btnSalvar = document.getElementById('btn-salvar-agente');
        btnSalvar.innerText = "⏳...";
        btnSalvar.style.pointerEvents = "none";

        const idBanco = document.getElementById('edit-id').value;
        const agente = bancoDeEquipe.find(u => u.id == idBanco);
        if (!agente) return;

        agente.nome = document.getElementById('edit-nome').value;

        const inputContato = document.getElementById('edit-contato');
        if(inputContato) agente.telefone = inputContato.value;
        
        const inputEmail = document.getElementById('edit-email');
        if(inputEmail) agente.email = inputEmail.value;
        
        const inputDesc = document.getElementById('edit-descricao');
        if(inputDesc) agente.descricao = inputDesc.value;

        const cargoSelecionado = document.getElementById('edit-cargo').value;
        if(cargoSelecionado === 'coordenador') agente.cargo = "Coordenador";
        if(cargoSelecionado === 'analista') agente.cargo = "Analista";
        if(cargoSelecionado === 'tecnico') agente.cargo = "Técnico";

        if (fileInput && fileInput.files.length > 0) {
            const file = fileInput.files[0];
            try {
                agente.foto = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = error => reject(error);
                });
            } catch (err) { console.error("Erro foto:", err); }
        }

        try {
            await fetch(`/api/usuarios/${idBanco}`, { method: 'DELETE' });
            await fetch('/api/usuarios', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({
                    nome: agente.nome,
                    cor: agente.cor,
                    empresa: agente.empresa,
                    cargo: agente.cargo,
                    turno: agente.turno,
                    foto: agente.foto,
                    telefone: agente.telefone,
                    email: agente.email,
                    descricao: agente.descricao
                }) 
            });
        } catch (err) { console.error("Falha ao salvar", err); }

        modal.style.display = 'none';
        btnSalvar.innerText = "💾 SALVAR";
        btnSalvar.style.pointerEvents = "auto";
        carregarDoBanco(); 
    };

    document.getElementById('btn-remover-agente').onclick = async () => {
        const idBanco = document.getElementById('edit-id').value;
        if (confirm("Deseja excluir esta credencial?")) {
            await fetch(`/api/usuarios/${idBanco}`, { method: 'DELETE' });
            modal.style.display = 'none';
            carregarDoBanco();
        }
    };

    const btnFechar = document.getElementById('btn-fechar-agente');
    if(btnFechar) btnFechar.onclick = () => modal.style.display = 'none';

    carregarDoBanco();

    const blur = document.getElementById('cursor-blur');
    if(blur) {
        let mx = 0, my = 0, cx = 0, cy = 0;
        document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
        function anim() { cx += (mx-cx)*0.1; cy += (my-cy)*0.1; blur.style.left=`${cx}px`; blur.style.top=`${cy}px`; requestAnimationFrame(anim); }
        anim();
    }
});