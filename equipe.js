document.addEventListener('DOMContentLoaded', () => {
    // BANCO COMPLETO RESTAURADO (12 MEMBROS + SKILLS)
    const defaultTeam = [
        { nome: "Jeferson Oliveira de Santana", cargoFiltro: "coordenador", cargoExibicao: "COORDENADOR", avatar: "⚙️", email: "jeferson@empresa.com", contato: "(11) 90000-0000", descricao: "Coordenação da operação técnica e validação de relatórios.", skills: ["Gestão de T.I.", "Validação", "Processos"] },
        { nome: "Marcello Evangelista Bonadias", cargoFiltro: "analista", cargoExibicao: "ANALISTA DE SISTEMAS", avatar: "👨‍💻", email: "marcello.bonadias@empresa.com", contato: "(13) 98144-2591", descricao: "Especialista em infraestrutura e administração de servidores.", skills: ["Zabbix", "Docker", "Grafana"] },
        { nome: "Renato Leoni de Souza", cargoFiltro: "tecnico", cargoExibicao: "TÉCNICO DE CAMPO", avatar: "🔧", email: "renato@empresa.com", contato: "(11) 98888-8888", descricao: "Atua na linha de frente do suporte aos usuários e manutenção.", skills: ["Suporte N1/N2", "Hardware", "Field"] },
        { nome: "Allan Almeida", cargoFiltro: "tecnico", cargoExibicao: "TÉCNICO DE CAMPO", avatar: "🔧", email: "allan@empresa.com", contato: "Não Informado", descricao: "Atua na linha de frente do suporte aos usuários e resolução de chamados.", skills: ["Suporte", "Field Service"] },
        { nome: "Andre Ataide de Oliveira", cargoFiltro: "tecnico", cargoExibicao: "TÉCNICO DE SUPORTE", avatar: "🔧", email: "andre.ataide@empresa.com", contato: "Não Informado", descricao: "Responsável pelo atendimento ágil de incidentes e suporte rotineiro aos colaboradores.", skills: ["Atendimento", "Windows"] },
        { nome: "André Luis Messias Ferreira", cargoFiltro: "tecnico", cargoExibicao: "TÉCNICO DE SUPORTE", avatar: "🔧", email: "andre.luis@empresa.com", contato: "Não Informado", descricao: "Focado na resolução rápida de chamados via helpdesk e manutenção de periféricos.", skills: ["Helpdesk", "Manutenção"] },
        { nome: "Felipe de Souza Nunes", cargoFiltro: "tecnico", cargoExibicao: "TÉCNICO DE CAMPO", avatar: "🔧", email: "felipe.nunes@empresa.com", contato: "Não Informado", descricao: "Especializado em cabeamento estruturado e montagem de estações de trabalho.", skills: ["Infraestrutura", "Cabeamento"] },
        { nome: "Matheus Alves Oliveira", cargoFiltro: "tecnico", cargoExibicao: "TÉCNICO DE SUPORTE", avatar: "🔧", email: "matheus@empresa.com", contato: "Não Informado", descricao: "Realiza a triagem de chamados, suporte remoto e configurações de software.", skills: ["Suporte Remoto", "Software"] },
        { nome: "Paulo Roberto Araujo Lima", cargoFiltro: "tecnico", cargoExibicao: "TÉCNICO DE CAMPO", avatar: "🔧", email: "paulo.roberto@empresa.com", contato: "Não Informado", descricao: "Deslocamento tático para resolução de problemas físicos de infraestrutura.", skills: ["Conectividade", "Roteadores"] },
        { nome: "Sabrina Pereira Santos", cargoFiltro: "tecnico", cargoExibicao: "TÉCNICA DE SUPORTE", avatar: "🔧", email: "sabrina@empresa.com", contato: "Não Informado", descricao: "Focada no atendimento ao usuário final, gestão de acessos e liberação de permissões.", skills: ["Gestão de Acessos", "Sistemas"] },
        { nome: "Thiago Dantas Ribeiro", cargoFiltro: "tecnico", cargoExibicao: "TÉCNICO DE SUPORTE", avatar: "🔧", email: "thiago.dantas@empresa.com", contato: "Não Informado", descricao: "Atendimento de chamados críticos, configuração de impressoras de rede.", skills: ["Impressoras", "Sistemas"] },
        { nome: "William Almeida de Moura", cargoFiltro: "tecnico", cargoExibicao: "TÉCNICO DE CAMPO", avatar: "🔧", email: "william@empresa.com", contato: "Não Informado", descricao: "Garante a estabilidade física das estações de trabalho e diagnósticos.", skills: ["Diagnóstico", "Hardware"] }
    ];

    let bancoDeEquipe = JSON.parse(localStorage.getItem('grimorio_equipe_v4')) || defaultTeam;
    const rosterGrid = document.getElementById('roster-grid');
    const inputBusca = document.getElementById('input-busca');
    const modal = document.getElementById('modal-editar-agente');

    function renderizar(filtro = 'all', busca = '') {
        rosterGrid.innerHTML = '';
        const termo = busca.toLowerCase();

        bancoDeEquipe.forEach((agente, index) => {
            const matchesFiltro = filtro === 'all' || agente.cargoFiltro === filtro;
            const matchesBusca = agente.nome.toLowerCase().includes(termo);

            if (matchesFiltro && matchesBusca) {
               // Verifica se tem http, ou ponto (ex: .jpg), ou barra (ex: pasta/foto)
const isImg = agente.avatar.includes('http') || agente.avatar.includes('.') || agente.avatar.includes('/');

// Tenta renderizar. Se a imagem não for encontrada, mostra um aviso ⚠️ no lugar
const avatarContent = isImg 
    ? `<img src="${agente.avatar}" onerror="this.outerHTML='<span style=\\'font-size: 2rem;\\'>⚠️</span>'" style="width:100%; height:100%; object-fit:cover;">` 
    : agente.avatar;
                const badgeClass = agente.cargoFiltro === 'coordenador' ? 'badge-coord' : agente.cargoFiltro === 'analista' ? 'badge-analista' : 'badge-tecnico';
                
                // Recria as skills
                const skillsHTML = agente.skills ? agente.skills.map(s => `<span>${s}</span>`).join('') : '';

                rosterGrid.innerHTML += `
                    <div class="agent-card">
                        <button class="btn-editar-card" onclick="abrirEditor(${index})">✏️</button>
                        <div class="agent-avatar avatar-${agente.cargoFiltro}">${avatarContent}</div>
                        <h2 class="agent-name">${agente.nome}</h2>
                        <div><span class="badge ${badgeClass}">${agente.cargoExibicao}</span></div>
                        <p style="font-size:0.85rem; color:var(--text-dim); margin-top:15px; margin-bottom:15px; flex-grow:1; line-height: 1.5;">${agente.descricao}</p>
                        
                        <div class="agent-contacts">
                            <span>📞 ${agente.contato}</span>
                            <span>✉️ ${agente.email}</span>
                        </div>
                        
                        <div class="agent-skills">${skillsHTML}</div>
                    </div>
                `;
            }
        });
    }

    // BUSCA EM TEMPO REAL
    inputBusca.addEventListener('input', (e) => {
        const filtroAtivo = document.querySelector('.filter-btn.active').dataset.filter;
        renderizar(filtroAtivo, e.target.value);
    });

    // FILTROS
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderizar(btn.dataset.filter, inputBusca.value);
        });
    });

    // MODAL: NOVO AGENTE
    document.getElementById('btn-novo-agente').onclick = () => {
        document.getElementById('modal-titulo').innerText = "➕ NOVO OPERACIONAL";
        document.getElementById('edit-id').value = "novo";
        document.getElementById('edit-nome').value = "";
        document.getElementById('edit-avatar').value = "🔧";
        document.getElementById('edit-email').value = "";
        document.getElementById('edit-contato').value = "";
        document.getElementById('edit-descricao').value = "";
        document.getElementById('btn-remover-agente').style.display = 'none';
        modal.style.display = 'flex';
    };

    // MODAL: EDITAR
    window.abrirEditor = (index) => {
        const a = bancoDeEquipe[index];
        document.getElementById('modal-titulo').innerText = "✏️ EDITAR CREDENCIAL";
        document.getElementById('edit-id').value = index;
        document.getElementById('edit-nome').value = a.nome;
        document.getElementById('edit-avatar').value = a.avatar;
        document.getElementById('edit-cargo').value = a.cargoFiltro;
        document.getElementById('edit-email').value = a.email;
        document.getElementById('edit-contato').value = a.contato;
        document.getElementById('edit-descricao').value = a.descricao;
        document.getElementById('btn-remover-agente').style.display = 'block';
        modal.style.display = 'flex';
    };

    // SALVAR
    document.getElementById('btn-salvar-agente').onclick = () => {
        const id = document.getElementById('edit-id').value;
        const cargo = document.getElementById('edit-cargo').value;
        let cargoExib = "TÉCNICO DE SUPORTE";
        if(cargo === 'coordenador') cargoExib = "COORDENADOR";
        if(cargo === 'analista') cargoExib = "ANALISTA DE SISTEMAS";

        const novoAgente = {
            nome: document.getElementById('edit-nome').value,
            avatar: document.getElementById('edit-avatar').value,
            cargoFiltro: cargo,
            cargoExibicao: cargoExib,
            email: document.getElementById('edit-email').value,
            contato: document.getElementById('edit-contato').value,
            descricao: document.getElementById('edit-descricao').value,
            skills: id === "novo" ? ["Novo Operacional"] : bancoDeEquipe[id].skills // Mantém as skills antigas ou cria uma padrão
        };

        if (id === "novo") {
            bancoDeEquipe.push(novoAgente);
        } else {
            bancoDeEquipe[id] = novoAgente;
        }

        localStorage.setItem('grimorio_equipe_v4', JSON.stringify(bancoDeEquipe));
        modal.style.display = 'none';
        
        const filtroAtivo = document.querySelector('.filter-btn.active').dataset.filter;
        renderizar(filtroAtivo, inputBusca.value);
    };

    // REMOVER
    document.getElementById('btn-remover-agente').onclick = () => {
        const id = document.getElementById('edit-id').value;
        if (confirm("Deseja realmente excluir esta credencial do sistema?")) {
            bancoDeEquipe.splice(id, 1);
            localStorage.setItem('grimorio_equipe_v4', JSON.stringify(bancoDeEquipe));
            modal.style.display = 'none';
            const filtroAtivo = document.querySelector('.filter-btn.active').dataset.filter;
            renderizar(filtroAtivo, inputBusca.value);
        }
    };

    document.getElementById('btn-fechar-agente').onclick = () => modal.style.display = 'none';

    renderizar();

    // CURSOR
    const blur = document.getElementById('cursor-blur');
    let mx = 0, my = 0, cx = 0, cy = 0;
    document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
    function anim() { cx += (mx-cx)*0.1; cy += (my-cy)*0.1; blur.style.left=`${cx}px`; blur.style.top=`${cy}px`; requestAnimationFrame(anim); }
    anim();
});