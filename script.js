document.addEventListener('DOMContentLoaded', function() {
    
    const params = new URLSearchParams(window.location.search);
    const isAdmin = params.get('admin') === 'true';
    if (!isAdmin) {
        document.body.classList.add('view-mode');
        const badge = document.getElementById('modo-badge');
        if (badge) { badge.innerText = "Modo Visualização"; badge.className = "badge-view"; }
    }

    const btnTheme = document.getElementById('btn-theme');
    if (localStorage.getItem('theme') === 'light') { document.body.classList.add('light-mode'); btnTheme.innerHTML = '🌙 Tema'; }
    btnTheme.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        localStorage.setItem('theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
        btnTheme.innerHTML = document.body.classList.contains('light-mode') ? '🌙 Tema' : '☀️ Tema';
    });

    let equipe = [];
    let todasEscalas = [];
    var calendarEl = document.getElementById('calendar');
    var calendar;
    let dataSelecionadaTemp = null;

    // Função de Inteligência de Cores
    function calcularCorDoTexto(corFundo) {
        if (!corFundo) return '#11111b';
        let hex = corFundo.replace('#', '');
        if (hex.length === 3) hex = hex.split('').map(c => c + c).join(''); 
        
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        
        const brilho = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (brilho >= 128) ? '#11111b' : '#ffffff';
    }

    function atualizarFiltros() { if(calendar) calendar.refetchEvents(); }
    document.querySelectorAll('.cb-empresa, .cb-cargo, .cb-turno').forEach(cb => cb.addEventListener('change', atualizarFiltros));

    function obterFiltrosAtivos() {
        return {
            empresas: Array.from(document.querySelectorAll('.cb-empresa:checked')).map(cb => cb.value),
            cargos: Array.from(document.querySelectorAll('.cb-cargo:checked')).map(cb => cb.value),
            turnos: Array.from(document.querySelectorAll('.cb-turno:checked')).map(cb => cb.value),
            pessoas: Array.from(document.querySelectorAll('.cb-pessoa:checked')).map(cb => cb.value)
        };
    }

    document.getElementById('btn-exportar-excel').onclick = () => {
        let csv = "Nome,Empresa,Cargo,Turno,Data,Status\n";
        const eventos = calendar.getEvents();
        eventos.forEach(ev => {
            const p = ev.extendedProps;
            if(p.usuario) csv += `${p.usuario},${p.empresa},${p.cargo},${p.turno},${ev.startStr},${p.status}\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", `escala_ti_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`);
        link.click();
    };

    function atualizarDropdowns() {
        if (equipe.length === 0) {
            const opt = `<option value="">Cadastre alguém...</option>`;
            document.getElementById('gerador-nome').innerHTML = opt;
            document.getElementById('limpeza-nome').innerHTML = opt;
            document.getElementById('add-dia-nome').innerHTML = opt;
            return;
        }
        const optionsHTML = equipe.sort((a,b) => a.nome.localeCompare(b.nome)).map(u => `<option value="${u.nome}">${u.nome}</option>`).join('');
        document.getElementById('gerador-nome').innerHTML = optionsHTML;
        document.getElementById('limpeza-nome').innerHTML = optionsHTML;
        document.getElementById('add-dia-nome').innerHTML = optionsHTML;

        document.getElementById('gerador-nome').onchange = function() {
            const m = equipe.find(u => u.nome === this.value);
            document.getElementById('container-gerador-turno').style.display = (m && m.turno === 'Ambos') ? 'block' : 'none';
        };
        document.getElementById('gerador-nome').dispatchEvent(new Event('change'));

        document.getElementById('add-dia-nome').onchange = function() {
            const m = equipe.find(u => u.nome === this.value);
            document.getElementById('container-add-dia-turno').style.display = (m && m.turno === 'Ambos') ? 'block' : 'none';
        };
    }

    async function carregarEquipe() {
        try {
            const res = await fetch('http://localhost:3000/api/usuarios');
            equipe = await res.json();
            
            document.getElementById('lista-equipe').innerHTML = equipe.map(u => `
                <div class="user-item">
                    <span><span class="dot" style="background:${u.cor}"></span>${u.nome} <small>(${u.turno})</small></span>
                    <button type="button" class="btn-del" onclick="removerUsuario(${u.id}, event)">X</button>
                </div>
            `).join('');

            document.getElementById('lista-filtros-pessoas').innerHTML = equipe.map(u => `
                <label class="filter-item">
                    <input type="checkbox" class="cb-pessoa" value="${u.nome}" checked> 
                    <span class="dot" style="background:${u.cor}; width:10px; height:10px;"></span>${u.nome}
                </label>
            `).join('');
            document.querySelectorAll('.cb-pessoa').forEach(cb => cb.addEventListener('change', atualizarFiltros));

            const coordenadores = equipe.filter(u => u.cargo === 'Coordenador');
            const analistas = equipe.filter(u => u.cargo === 'Analista');
            const tecnicos = equipe.filter(u => u.cargo === 'Técnico');

            let htmlSidebar = '';
            if (coordenadores.length > 0) htmlSidebar += `<div style="margin-bottom: 10px;"><strong style="color: var(--accent-purple);">Coordenadores</strong><br>${coordenadores.map(c => `• ${c.nome}`).join('<br>')}</div>`;
            if (analistas.length > 0) htmlSidebar += `<div style="margin-bottom: 10px;"><strong style="color: var(--accent-blue);">Analistas</strong><br>${analistas.map(c => `• ${c.nome}`).join('<br>')}</div>`;
            if (tecnicos.length > 0) htmlSidebar += `<div><strong style="color: var(--accent-green);">Técnicos</strong><br>${tecnicos.map(c => `• ${c.nome}`).join('<br>')}</div>`;
            
            const listaEquipeSidebar = document.getElementById('lista-equipe-sidebar');
            if(listaEquipeSidebar) listaEquipeSidebar.innerHTML = htmlSidebar || 'Ninguém cadastrado.';

            atualizarDropdowns();
            if (calendar) calendar.refetchEvents();
        } catch (e) { console.error(e); }
    }

    window.removerUsuario = async (id, event) => { 
        if (event) { event.preventDefault(); event.stopPropagation(); }
        await fetch(`http://localhost:3000/api/usuarios/${id}`, { method: 'DELETE' }); 
        carregarEquipe(); 
    };

    document.getElementById('btn-add-user').addEventListener('click', async (event) => {
        event.preventDefault();
        const nome = document.getElementById('novo-nome').value.trim();
        const empresa = document.getElementById('nova-empresa').value;
        const cargo = document.getElementById('novo-cargo').value;
        const turno = document.getElementById('novo-turno').value;
        const cor = document.getElementById('nova-cor').value;
        if (!nome) return;
        
        await fetch('http://localhost:3000/api/usuarios', { 
            method: 'POST', headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ nome, cor, empresa, cargo, turno }) 
        });
        
        document.getElementById('novo-nome').value = '';
        carregarEquipe();
    });

    document.getElementById('btn-abrir-equipe').onclick = () => document.getElementById('modal-equipe').style.display = 'block';
    document.getElementById('gerador-regra').onchange = function() { document.getElementById('container-dias-avulsos').style.display = (this.value === 'avulso') ? 'block' : 'none'; };

    function checarCobertura(escalasAtuais) {
        if(escalasAtuais.length === 0) return;
        const alerta = document.getElementById('alerta-cobertura');
        const dtVis = calendar.getDate();
        const ano = dtVis.getFullYear();
        const mes = dtVis.getMonth() + 1;
        const diasNoMes = new Date(ano, mes, 0).getDate();
        
        let temBuraco = false;
        
        for(let d=1; d <= diasNoMes; d++) {
            const dataStr = `${ano}-${String(mes).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            const plantoesDoDia = escalasAtuais.filter(e => e.data === dataStr && e.status === 'Plantão');
            
            const temDia = plantoesDoDia.some(e => e.turno === 'Diurno');
            const temNoite = plantoesDoDia.some(e => e.turno === 'Noturno');

            if (!temDia || !temNoite) temBuraco = true;
        }
        if(alerta) alerta.style.display = temBuraco ? 'block' : 'none';
    }

    function validarConflito(usuario, data, novoStatus) {
        const conflito = todasEscalas.find(e => e.usuario === usuario && e.data === data);
        if (conflito && novoStatus === 'Plantão' && conflito.status !== 'Plantão') {
            return confirm(`Atenção: ${usuario} já possui "${conflito.status}" no dia ${data}. Deseja sobrescrever para Plantão?`);
        }
        return true;
    }

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        fixedWeekCount: false, // Faz o mês ter o tamanho real dele (5 ou 6 semanas) sem distorcer
        locale: 'pt-br',
        headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek' },
        buttonText: { today: 'Hoje', month: 'Mês', week: 'Semana' },
        contentHeight: 'auto',
        eventOrder: 'ordemTurno,title',
        
        eventDidMount: function(info) {
            // Cria um pequeno atraso aleatório para cada bloquinho (entre 0 e 0.3 segundos)
            // Isso faz eles aparecerem em cascata em vez de todos de uma vez
            let delay = Math.random() * 0.3;
            info.el.style.animationDelay = `${delay}s`;
        },
        
        // ====================================


        events: async function(info, successCallback) {
            try {
                const res = await fetch('http://localhost:3000/api/escalas');
                todasEscalas = await res.json();
                checarCobertura(todasEscalas);

                const filtros = obterFiltrosAtivos();
                let eventosNoCalendario = [];
                let contagem = {};

                todasEscalas.forEach(e => {
                    const membro = equipe.find(u => u.nome === e.usuario);
                    if (!membro) return;

                    if (filtros.empresas.includes(membro.empresa) && 
                        filtros.cargos.includes(membro.cargo) && 
                        filtros.turnos.includes(membro.turno) &&
                        filtros.pessoas.includes(membro.nome)) {
                        
                        let turnoPlantao = (e.turno && e.turno !== 'Ambos') ? e.turno : membro.turno; 
                        
                        // Cores exatas aplicadas direto no JS (Sem vars CSS)
                        let corFinal = membro.cor;
                        if (e.status === 'Folga') corFinal = '#a6e3a1';         // Verde claro
                        else if (e.status === 'Atestado') corFinal = '#f38ba8'; // Rosa/Vermelho
                        else if (e.status === 'Folga Feriado') corFinal = '#ed8796'; // Vermelho vivo (como pedido)
                        else if (e.status === 'Ausente') corFinal = '#fab387';   // Laranja

                        // Calcula o texto baseado na nova cor
                        let corDoTextoFinal = calcularCorDoTexto(corFinal);

                        // Ícones
                        let iconeFinal = '☀️';
                        if (e.status === 'Plantão') {
                            if (turnoPlantao === 'Noturno') iconeFinal = '🌙';
                            else if (turnoPlantao === 'Comercial') iconeFinal = '💼';
                        } else if (e.status === 'Folga') {
                            iconeFinal = '🏖️';
                        } else if (e.status === 'Folga Feriado') {
                            iconeFinal = '🌴';
                        } else if (e.status === 'Atestado') {
                            iconeFinal = '🏥';
                        } else if (e.status === 'Ausente') {
                            iconeFinal = '⚠️';
                        }

                        let titleFinal = e.status === 'Plantão' ? `${iconeFinal} ${e.usuario}` : `${iconeFinal} ${e.usuario} (${e.status})`;

                        eventosNoCalendario.push({
                            id: e.id, 
                            title: titleFinal, 
                            start: e.data, 
                            allDay: true, // A MÁGICA ACONTECE AQUI! Transforma em um bloco sólido.
                            backgroundColor: corFinal, 
                            borderColor: corFinal, 
                            textColor: corDoTextoFinal,
                            ordemTurno: turnoPlantao === 'Noturno' ? 2 : 1, 
                            classNames: turnoPlantao === 'Noturno' ? ['evento-noturno'] : ['evento-diurno'],
                            extendedProps: { usuario: e.usuario, status: e.status, turno: turnoPlantao, empresa: membro.empresa, cargo: membro.cargo }
                        });

                        const [anoE, mesE] = e.data.split('-');
                        const dtVis = calendar.getDate();
                        if (parseInt(anoE) === dtVis.getFullYear() && parseInt(mesE) === dtVis.getMonth() + 1 && e.status === 'Plantão') {
                            contagem[e.usuario] = (contagem[e.usuario] || 0) + 1;
                        }
                    }
                });

                // Feriados da API
                try {
                    const anoAtual = calendar.getDate().getFullYear();
                    const resFeriados = await fetch(`https://brasilapi.com.br/api/feriados/v1/${anoAtual}`);
                    if (resFeriados.ok) {
                        const feriados = await resFeriados.json();
                        feriados.forEach(f => {
                            eventosNoCalendario.push({
                                title: `🇧🇷 ${f.name}`,
                                start: f.date, 
                                allDay: true,
                                backgroundColor: 'transparent', 
                                borderColor: 'transparent', 
                                textColor: '#ed8796', // Cor vermelha do feriado nacional
                                ordemTurno: 0
                            });
                        });
                    }
                } catch (err) { console.log("Aviso: Feriados não carregados."); }

                successCallback(eventosNoCalendario);

                const resumoSpan = document.getElementById('resumo-plantones');
                const nomesContados = Object.keys(contagem);
                resumoSpan.innerHTML = nomesContados.length > 0 ? nomesContados.map(n => `<b style="color:inherit;">${n}:</b> ${contagem[n]}d`).join(' &nbsp;|&nbsp; ') : "Nenhum plantão nos filtros.";
            } catch (e) { console.error(e); }
        },

        dateClick: function(info) {
            if(!isAdmin) return;
            dataSelecionadaTemp = info.dateStr;
            const partesData = info.dateStr.split('-');
            document.getElementById('titulo-resumo-dia').innerText = `📅 Dia ${partesData[2]}/${partesData[1]}/${partesData[0]}`;
            
            const eventosDoDia = calendar.getEvents().filter(e => e.startStr === info.dateStr && e.extendedProps.usuario);
            
            let grupos = { '💼 Comercial': [], '☀️ Plantão (Diurno)': [], '🌙 Plantão (Noturno)': [], '🏖️ Folgas': [], '🏥 Atestados': [], '⚠️ Outros': [] };

            eventosDoDia.forEach(e => {
                const s = e.extendedProps.status;
                const t = e.extendedProps.turno;
                const n = `${e.extendedProps.usuario} <small>(${e.extendedProps.empresa})</small>`;
                
                if (s === 'Plantão') { 
                    if (t === 'Comercial') grupos['💼 Comercial'].push(n);
                    else if (t === 'Diurno') grupos['☀️ Plantão (Diurno)'].push(n); 
                    else if (t === 'Noturno') grupos['🌙 Plantão (Noturno)'].push(n); 
                }
                else if (s === 'Folga' || s === 'Folga Feriado') grupos['🏖️ Folgas'].push(n);
                else if (s === 'Atestado') grupos['🏥 Atestados'].push(n);
                else grupos['⚠️ Outros'].push(n);
            });

            let htmlConteudo = '';
            for (let [cat, nomes] of Object.entries(grupos)) {
                if (nomes.length > 0) htmlConteudo += `<div class="categoria-resumo"><strong>${cat}</strong><ul>${nomes.map(n => `<li>${n}</li>`).join('')}</ul></div>`;
            }
            document.getElementById('conteudo-resumo').innerHTML = htmlConteudo || '<p style="text-align: center; color: var(--text-dim); margin-top: 20px;">Sem programação visível.</p>';
            
            document.getElementById('form-add-dia').style.display = 'none';
            document.getElementById('modal-resumo-dia').style.display = 'block';
            document.getElementById('add-dia-nome').dispatchEvent(new Event('change')); 
        },
        
       eventClick: function(info) {
            if (!isAdmin) return;
            if (!info.event.extendedProps.usuario) return;
            
            // Salva o evento clicado na memória para usarmos nos botões
            eventoSelecionadoTemp = info.event;
            
            // Preenche o modal com os dados atuais da pessoa
            document.getElementById('editar-nome-display').innerText = info.event.extendedProps.usuario;
            document.getElementById('editar-status').value = info.event.extendedProps.status;
            
            // Abre o modal
            document.getElementById('modal-editar').style.display = 'block';
        }
    });

    document.getElementById('btn-abrir-gerador').onclick = () => document.getElementById('modal-gerador').style.display = 'block';
    
    document.getElementById('btn-confirmar-gerador').onclick = async () => {
        const tecnico = document.getElementById('gerador-nome').value;
        const regra = document.getElementById('gerador-regra').value;
        const mesAno = document.getElementById('gerador-mes').value;
        if (!mesAno.includes('/')) return alert("Preencha mês/ano corretamente");

        const membro = equipe.find(u => u.nome === tecnico);
        if (!membro) return;

        const turnoFinal = (membro.turno === 'Ambos') ? document.getElementById('gerador-turno-escolhido').value : membro.turno;

        const btn = document.getElementById('btn-confirmar-gerador');
        btn.innerHTML = '⏳ Gerando...';
        btn.style.pointerEvents = 'none';

        const [mes, ano] = mesAno.split('/');
        const diasNoMes = new Date(ano, mes, 0).getDate();
        let lote = [];
        
        if (regra === 'avulso') {
            const diasLista = document.getElementById('gerador-dias-manuais').value.split(',').map(d => d.trim());
            diasLista.forEach(d => {
                const diaNum = parseInt(d);
                if (diaNum > 0 && diaNum <= diasNoMes) {
                    const dataFormat = `${ano}-${mes.padStart(2, '0')}-${String(diaNum).padStart(2, '0')}`;
                    if(validarConflito(tecnico, dataFormat, 'Plantão')){
                        lote.push({ usuario: tecnico, status: 'Plantão', data: dataFormat, turno: turnoFinal, hora_registro: new Date().toLocaleString() });
                    }
                }
            });
        } else {
            for (let d = 1; d <= diasNoMes; d++) {
                let adicionar = false;
                if (regra === '12x36-impar' && (d % 2 !== 0)) adicionar = true;
                if (regra === '12x36-par' && (d % 2 === 0)) adicionar = true;
                if (regra === 'seg-sex') {
                    const diaSemana = new Date(ano, mes - 1, d).getDay();
                    if (diaSemana !== 0 && diaSemana !== 6) adicionar = true;
                }

                if (adicionar) {
                    const dataFormat = `${ano}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    if(validarConflito(tecnico, dataFormat, 'Plantão')){
                        lote.push({ usuario: tecnico, status: 'Plantão', data: dataFormat, turno: turnoFinal, hora_registro: new Date().toLocaleString() });
                    }
                }
            }
        }

        if (lote.length > 0) {
            await fetch('http://localhost:3000/api/escalas/lote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lote) });
        }
        btn.innerHTML = 'Confirmar Geração';
        btn.style.pointerEvents = 'auto';
        document.getElementById('modal-gerador').style.display = 'none';
        calendar.refetchEvents();
    };

    document.getElementById('btn-toggle-add-dia').onclick = () => document.getElementById('form-add-dia').style.display = 'block';
    
    document.getElementById('btn-salvar-dia').onclick = async () => {
        const nome = document.getElementById('add-dia-nome').value;
        const status = document.getElementById('add-dia-status').value;
        if (!nome) return;

        if(!validarConflito(nome, dataSelecionadaTemp, status)) return;

        const membro = equipe.find(u => u.nome === nome);
        const turnoFinal = (membro && membro.turno === 'Ambos') ? document.getElementById('add-dia-turno-escolhido').value : membro.turno;

        await fetch('http://localhost:3000/api/escalas', { 
            method: 'POST', headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ usuario: nome, status: status, data: dataSelecionadaTemp, turno: turnoFinal, hora_registro: new Date().toLocaleString() }) 
        });
        document.getElementById('modal-resumo-dia').style.display = 'none';
        calendar.refetchEvents();
    };

    document.getElementById('btn-abrir-limpeza').onclick = () => document.getElementById('modal-limpeza').style.display = 'block';
    
    document.getElementById('btn-confirmar-limpeza').onclick = async () => {
        const n = document.getElementById('limpeza-nome').value;
        const m = document.getElementById('limpeza-mes').value;
        if (!m.includes('/')) return;
        await fetch(`http://localhost:3000/api/escalas/limpar/${encodeURIComponent(n)}/${m.replace('/', '-')}`, { method: 'DELETE' });
        document.getElementById('modal-limpeza').style.display = 'none';
        calendar.refetchEvents();
    };
let eventoSelecionadoTemp = null; // Variável para lembrar qual bloco foi clicado

    // BOTÃO SALVAR DO MODAL DE EDIÇÃO
    document.getElementById('btn-salvar-edicao').onclick = async () => {
        if (!eventoSelecionadoTemp) return;
        
        const novoStatus = document.getElementById('editar-status').value;
        const props = eventoSelecionadoTemp.extendedProps;
        const dataStr = eventoSelecionadoTemp.startStr;

        // Se não mudou nada, só fecha o modal
        if (novoStatus === props.status) {
            document.getElementById('modal-editar').style.display = 'none';
            return;
        }

        const btn = document.getElementById('btn-salvar-edicao');
        btn.innerHTML = '⏳...';

        // 1. Apaga o registro antigo do banco
        await fetch(`http://localhost:3000/api/escalas/${eventoSelecionadoTemp.id}`, { method: 'DELETE' });

        // 2. Cria o novo registro com o status atualizado na mesma data e mesmo turno
        await fetch('http://localhost:3000/api/escalas', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ 
                usuario: props.usuario, 
                status: novoStatus, 
                data: dataStr, 
                turno: props.turno, 
                hora_registro: new Date().toLocaleString() 
            }) 
        });

        btn.innerHTML = '💾 Salvar';
        document.getElementById('modal-editar').style.display = 'none';
        calendar.refetchEvents(); // Atualiza a tela para mostrar a cor/ícone novos
    };

    // BOTÃO APAGAR DO MODAL DE EDIÇÃO
    document.getElementById('btn-apagar-edicao').onclick = async () => {
        if (!eventoSelecionadoTemp) return;
        
        if (confirm(`Tem certeza que deseja remover este registro?`)) {
            await fetch(`http://localhost:3000/api/escalas/${eventoSelecionadoTemp.id}`, { method: 'DELETE' });
            document.getElementById('modal-editar').style.display = 'none';
            calendar.refetchEvents();
        }
    };
    carregarEquipe();
    calendar.render();
    // ==========================================
    // LÓGICA DO CURSOR DINÂMICO
    // ==========================================
    const cursorBlur = document.getElementById('cursor-blur');
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let cursorX = mouseX;
    let cursorY = mouseY;

    // Suavização do movimento (Efeito "Trailing")
    function animateCursor() {
        let distX = mouseX - cursorX;
        let distY = mouseY - cursorY;
        
        // O 0.15 é a velocidade do atraso. Quanto menor, mais ele "escorrega"
        cursorX += distX * 0.15; 
        cursorY += distY * 0.15;
        
        if(cursorBlur && !document.body.classList.contains('view-mode')) {
            cursorBlur.style.left = cursorX + 'px';
            cursorBlur.style.top = cursorY + 'px';
        }
        requestAnimationFrame(animateCursor);
    }
    
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    // Reação ao clique (contrai a aura quando você clica em algo)
    document.addEventListener('mousedown', () => { 
        if(cursorBlur) cursorBlur.style.transform = 'translate(-50%, -50%) scale(0.7)'; 
    });
    document.addEventListener('mouseup', () => { 
        if(cursorBlur) cursorBlur.style.transform = 'translate(-50%, -50%) scale(1)'; 
    });

    // Inicia o motor da animação
    animateCursor();
});