document.addEventListener('DOMContentLoaded', function() {
    
    // 1. MODO DE ACESSO (Bloqueia funções se não houver ?admin=true na URL)
    const params = new URLSearchParams(window.location.search);
    const isAdmin = params.get('admin') === 'true';
    if (!isAdmin) {
        document.body.classList.add('view-mode');
        const badge = document.getElementById('modo-badge');
        badge.innerText = "Modo Visualização";
        badge.className = "badge-view";
    }

    // 2. MODO TEMA (Claro/Escuro)
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

    // 3. EXPORTAR PARA EXCEL (CSV)
    document.getElementById('btn-exportar-excel').onclick = () => {
        let csv = "Nome,Empresa,Cargo,Turno,Data,Status\n";
        const eventos = calendar.getEvents();
        eventos.forEach(ev => {
            const p = ev.extendedProps;
            csv += `${p.usuario},${p.empresa},${p.cargo},${p.turno},${ev.startStr},${p.status}\n`;
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

        // Controle da caixa extra do Coringa/Ambos
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
                    <button class="btn-del" onclick="removerUsuario(${u.id})">X</button>
                </div>
            `).join('');

            document.getElementById('lista-filtros-pessoas').innerHTML = equipe.map(u => `
                <label class="filter-item">
                    <input type="checkbox" class="cb-pessoa" value="${u.nome}" checked> 
                    <span class="dot" style="background:${u.cor}; width:10px; height:10px;"></span>${u.nome}
                </label>
            `).join('');

            document.querySelectorAll('.cb-pessoa').forEach(cb => cb.addEventListener('change', atualizarFiltros));
            atualizarDropdowns();
            if (calendar) calendar.refetchEvents();
        } catch (e) { console.error(e); }
    }

    window.removerUsuario = async (id) => { await fetch(`http://localhost:3000/api/usuarios/${id}`, { method: 'DELETE' }); carregarEquipe(); };

    document.getElementById('btn-add-user').addEventListener('click', async () => {
        const nome = document.getElementById('novo-nome').value.trim();
        const empresa = document.getElementById('nova-empresa').value;
        const cargo = document.getElementById('novo-cargo').value;
        const turno = document.getElementById('novo-turno').value;
        const cor = document.getElementById('nova-cor').value;
        if (!nome) return;
        await fetch('http://localhost:3000/api/usuarios', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome, cor, empresa, cargo, turno }) });
        document.getElementById('novo-nome').value = '';
        carregarEquipe();
    });

    document.getElementById('btn-abrir-equipe').onclick = () => document.getElementById('modal-equipe').style.display = 'block';

    document.getElementById('gerador-regra').onchange = function() {
        document.getElementById('container-dias-avulsos').style.display = (this.value === 'avulso') ? 'block' : 'none';
    };

    // 4. RADAR DE COBERTURA
    function checarCobertura(escalasAtuais) {
        if(escalasAtuais.length === 0) return;
        const alerta = document.getElementById('alerta-cobertura');
        const dtVis = calendar.getDate();
        const ano = dtVis.getFullYear();
        const mes = dtVis.getMonth() + 1; // 1 a 12
        const diasNoMes = new Date(ano, mes, 0).getDate();
        
        let temBuraco = false;
        
        for(let d=1; d <= diasNoMes; d++) {
            const dataStr = `${ano}-${String(mes).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            const plantoesDoDia = escalasAtuais.filter(e => e.data === dataStr && e.status === 'Plantão');
            
            const temDia = plantoesDoDia.some(e => e.turno === 'Diurno');
            const temNoite = plantoesDoDia.some(e => e.turno === 'Noturno');

            if (!temDia || !temNoite) temBuraco = true;
        }
        alerta.style.display = temBuraco ? 'block' : 'none';
    }

    // 5. VALIDADOR DE COLISÃO
    function validarConflito(usuario, data, novoStatus) {
        const conflito = todasEscalas.find(e => e.usuario === usuario && e.data === data);
        if (conflito && novoStatus === 'Plantão' && conflito.status !== 'Plantão') {
            return confirm(`Atenção: ${usuario} já possui "${conflito.status}" no dia ${data}. Deseja sobrescrever para Plantão?`);
        }
        return true;
    }

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'pt-br',
        headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek' },
        buttonText: { today: 'Hoje', month: 'Mês', week: 'Semana' },
        contentHeight: 'auto',
        eventOrder: 'ordemTurno,title',

        events: async function(info, successCallback) {
            try {
                const res = await fetch('http://localhost:3000/api/escalas');
                todasEscalas = await res.json();
                
                checarCobertura(todasEscalas); // Dispara o radar

                const filtros = obterFiltrosAtivos();
                let eventosFiltrados = [];
                let contagem = {};

                todasEscalas.forEach(e => {
                    const membro = equipe.find(u => u.nome === e.usuario);
                    if (!membro) return;

                    if (filtros.empresas.includes(membro.empresa) && 
                        filtros.cargos.includes(membro.cargo) && 
                        filtros.turnos.includes(membro.turno) &&
                        filtros.pessoas.includes(membro.nome)) {
                        
                        let turnoFinal = e.turno || membro.turno; 
                        
                        // 6. CORES PERSONALIZADAS POR STATUS
                        let corFinal = membro.cor;
                        if (e.status === 'Folga') corFinal = '#a6e3a1';         // Verde
                        else if (e.status === 'Atestado') corFinal = '#f38ba8'; // Vermelho
                        else if (e.status === 'Folga Feriado') corFinal = '#89dceb'; // Ciano
                        else if (e.status === 'Ausente') corFinal = '#fab387';   // Laranja

                        let iconeTurno = turnoFinal === 'Noturno' ? '🌙' : '☀️';
                        let titleFinal = e.status === 'Plantão' ? `${iconeTurno} ${e.usuario}` : `${iconeTurno} ${e.usuario} (${e.status})`;

                        eventosFiltrados.push({
                            id: e.id, title: titleFinal, start: e.data, 
                            backgroundColor: corFinal, borderColor: corFinal, textColor: '#11111b',
                            ordemTurno: turnoFinal === 'Noturno' ? 2 : 1, classNames: turnoFinal === 'Noturno' ? ['evento-noturno'] : ['evento-diurno'],
                            extendedProps: { usuario: e.usuario, status: e.status, turno: turnoFinal, empresa: membro.empresa, cargo: membro.cargo }
                        });

                        const [anoE, mesE] = e.data.split('-');
                        const dtVis = calendar.getDate();
                        if (parseInt(anoE) === dtVis.getFullYear() && parseInt(mesE) === dtVis.getMonth() + 1 && e.status === 'Plantão') {
                            contagem[e.usuario] = (contagem[e.usuario] || 0) + 1;
                        }
                    }
                });
                successCallback(eventosFiltrados);

                const resumoSpan = document.getElementById('resumo-plantones');
                const nomesContados = Object.keys(contagem);
                resumoSpan.innerHTML = nomesContados.length > 0 ? nomesContados.map(n => `<b style="color:inherit;">${n}:</b> ${contagem[n]}d`).join(' &nbsp;|&nbsp; ') : "Nenhum plantão nos filtros.";
            } catch (e) { console.error(e); }
        },

        dateClick: function(info) {
            dataSelecionadaTemp = info.dateStr;
            const partesData = info.dateStr.split('-');
            document.getElementById('titulo-resumo-dia').innerText = `📅 Dia ${partesData[2]}/${partesData[1]}/${partesData[0]}`;
            
            const eventosDoDia = calendar.getEvents().filter(e => e.startStr === info.dateStr);
            let grupos = { '☀️ Plantão (Diurno)': [], '🌙 Plantão (Noturno)': [], '🏖️ Folgas': [], '🏥 Atestados': [], '⚠️ Outros': [] };

            eventosDoDia.forEach(e => {
                const s = e.extendedProps.status;
                const t = e.extendedProps.turno;
                const n = `${e.extendedProps.usuario} <small>(${e.extendedProps.empresa})</small>`;
                if (s === 'Plantão') { if (t === 'Diurno') grupos['☀️ Plantão (Diurno)'].push(n); else grupos['🌙 Plantão (Noturno)'].push(n); }
                else if (s === 'Folga') grupos['🏖️ Folgas'].push(n);
                else if (s === 'Atestado') grupos['🏥 Atestados'].push(n);
                else grupos['⚠️ Outros'].push(n);
            });

            let htmlConteudo = '';
            for (let [cat, nomes] of Object.entries(grupos)) {
                if (nomes.length > 0) htmlConteudo += `<div class="categoria-resumo"><strong>${cat}</strong><ul>${nomes.map(n => `<li>${n}</li>`).join('')}</ul></div>`;
            }
            document.getElementById('conteudo-resumo').innerHTML = htmlConteudo || '<p style="text-align: center; color: #7f849c; margin-top: 20px;">Sem programação visível.</p>';
            
            document.getElementById('form-add-dia').style.display = 'none';
            document.getElementById('modal-resumo-dia').style.display = 'block';
            document.getElementById('add-dia-nome').dispatchEvent(new Event('change')); 
        },
        
        eventClick: function(info) {
            if (!isAdmin) return; // Proteção View Mode
            if (confirm(`Deseja apagar "${info.event.title}"?`)) {
                fetch(`http://localhost:3000/api/escalas/${info.event.id}`, { method: 'DELETE' }).then(() => info.event.remove());
            }
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

    carregarEquipe();
    calendar.render();
});