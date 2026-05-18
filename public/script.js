document.addEventListener('DOMContentLoaded', function() {
    
    const params = new URLSearchParams(window.location.search);
    const isAdmin = params.get('admin') === 'true';
    if (!isAdmin) {
        document.body.classList.add('view-mode');
        const badge = document.getElementById('modo-badge');
        if (badge) { badge.innerText = "Modo Visualização"; badge.className = "badge-view"; }
    }

    // Variáveis globais declaradas apenas UMA vez
    let equipe = [];
    let todasEscalas = [];
    var calendarEl = document.getElementById('calendar');
    var calendar;
    let dataSelecionadaTemp = null;
    let eventoSelecionadoTemp = null; 
    let idColaboradorEditando = null; 

    // Função centralizada para carregar dados do MySQL
    async function carregarDadosDoServidor() {
        try {
            const [resUsuarios, resEscalas] = await Promise.all([
                fetch('/api/usuarios'),
                fetch('/api/escalas')
            ]);
            
            equipe = await resUsuarios.json();
            todasEscalas = await resEscalas.json();
            
            if (calendar) {
                calendar.refetchEvents();
                calendar.render();
            }
        } catch (erro) {
            console.error("Erro na comunicação com o NOC Server:", erro);
        }
    }

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
    document.querySelectorAll('.cb-empresa, .cb-cargo, .cb-turno, .cb-status').forEach(cb => cb.addEventListener('change', atualizarFiltros));

    function obterFiltrosAtivos() {
        return {
            empresas: Array.from(document.querySelectorAll('.cb-empresa:checked')).map(cb => cb.value),
            cargos: Array.from(document.querySelectorAll('.cb-cargo:checked')).map(cb => cb.value),
            turnos: Array.from(document.querySelectorAll('.cb-turno:checked')).map(cb => cb.value),
            pessoas: Array.from(document.querySelectorAll('.cb-pessoa:checked')).map(cb => cb.value),
            status: Array.from(document.querySelectorAll('.cb-status:checked')).map(cb => cb.value)
        };
    }

    const btnExportar = document.getElementById('btn-exportar-excel');
    if(btnExportar) {
        btnExportar.onclick = () => {
            let csv = "Nome,Empresa,Cargo,Turno,Data,Status,Descricao\n";
            const eventos = calendar.getEvents();
            eventos.forEach(ev => {
                const p = ev.extendedProps;
                if(p.usuario) {
                    const desc = p.descricao ? p.descricao.replace(/,/g, ' ') : '';
                    csv += `${p.usuario},${p.empresa},${p.cargo},${p.turno},${ev.startStr},${p.status},${desc}\n`;
                }
            });
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.setAttribute("download", `escala_ti_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`);
            link.click();
        };
    }

    function atualizarDropdowns() {
        if (equipe.length === 0) {
            const opt = `<option value="">Cadastre alguém...</option>`;
            const d1 = document.getElementById('gerador-nome'); if(d1) d1.innerHTML = opt;
            const d2 = document.getElementById('limpeza-nome'); if(d2) d2.innerHTML = opt;
            const d3 = document.getElementById('add-dia-nome'); if(d3) d3.innerHTML = opt;
            const d4 = document.getElementById('folga-nome'); if(d4) d4.innerHTML = opt;
            const d5 = document.getElementById('atestado-nome'); if(d5) d5.innerHTML = opt;
            return;
        }
        const optionsHTML = equipe.sort((a,b) => a.nome.localeCompare(b.nome)).map(u => `<option value="${u.nome}">${u.nome}</option>`).join('');
        
        const genNome = document.getElementById('gerador-nome');
        if(genNome) {
            genNome.innerHTML = optionsHTML;
            genNome.onchange = function() {
                const m = equipe.find(u => u.nome === this.value);
                const cont = document.getElementById('container-gerador-turno');
                if(cont) cont.style.display = (m && m.turno === 'Ambos') ? 'block' : 'none';
            };
            genNome.dispatchEvent(new Event('change'));
        }

        const limpNome = document.getElementById('limpeza-nome'); if(limpNome) limpNome.innerHTML = optionsHTML;
        
        const folgaNome = document.getElementById('folga-nome'); if(folgaNome) folgaNome.innerHTML = optionsHTML;

        const atestadoNome = document.getElementById('atestado-nome'); if(atestadoNome) atestadoNome.innerHTML = optionsHTML;

        const addDiaNome = document.getElementById('add-dia-nome');
        if(addDiaNome) {
            addDiaNome.innerHTML = optionsHTML;
            addDiaNome.onchange = function() {
                const m = equipe.find(u => u.nome === this.value);
                const cont = document.getElementById('container-add-dia-turno');
                if(cont) cont.style.display = (m && m.turno === 'Ambos') ? 'block' : 'none';
            };
        }
    }

    async function carregarEquipe() {
        try {
            const res = await fetch('/api/usuarios');
            equipe = await res.json();
            
            const listaEquipe = document.getElementById('lista-equipe');
            if (listaEquipe) {
                listaEquipe.innerHTML = equipe.map(u => {
                    const imgSrc = u.foto ? u.foto : 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
                    
                    return `
                    <div class="user-item" style="display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 8px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <img src="${imgSrc}" style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover; border: 2px solid ${u.cor};">
                            <span>${u.nome} <small style="color:var(--text-dim);">(${u.turno})</small></span>
                        </div>
                        <div class="acoes-colaborador">
                            <button type="button" class="btn-edit-mini" onclick="prepararEdicaoColaborador(${u.id}, event)" title="Editar">✏️</button>
                            <button type="button" class="btn-del" onclick="removerUsuario(${u.id}, event)" title="Excluir">X</button>
                        </div>
                    </div>
                `}).join('');
            }

            const listaFiltros = document.getElementById('lista-filtros-pessoas');
            if (listaFiltros) {
                listaFiltros.innerHTML = equipe.map(u => `
                    <label class="filter-item">
                        <input type="checkbox" class="cb-pessoa" value="${u.nome}" checked> 
                        <span class="dot" style="background:${u.cor}; width:10px; height:10px;"></span>${u.nome}
                    </label>
                `).join('');
                document.querySelectorAll('.cb-pessoa').forEach(cb => cb.addEventListener('change', atualizarFiltros));
            }

            const coordenadores = equipe.filter(u => u.cargo === 'Coordenador');
            const analistas = equipe.filter(u => u.cargo === 'Analista');
            const tecnicos = equipe.filter(u => u.cargo === 'Técnico');
            const aprendizes = equipe.filter(u => u.cargo === 'Aprendiz');

            let htmlSidebar = '';
            if (coordenadores.length > 0) htmlSidebar += `<div style="margin-bottom: 10px;"><strong style="color: var(--accent-purple);">Coordenadores</strong><br>${coordenadores.map(c => `• ${c.nome}`).join('<br>')}</div>`;
            if (analistas.length > 0) htmlSidebar += `<div style="margin-bottom: 10px;"><strong style="color: var(--accent-blue);">Analistas</strong><br>${analistas.map(c => `• ${c.nome}`).join('<br>')}</div>`;
            if (tecnicos.length > 0) htmlSidebar += `<div style="margin-bottom: 10px;"><strong style="color: var(--accent-green);">Técnicos</strong><br>${tecnicos.map(c => `• ${c.nome}`).join('<br>')}</div>`;
            if (aprendizes.length > 0) htmlSidebar += `<div><strong style="color: #fab387;">Aprendizes</strong><br>${aprendizes.map(c => `• ${c.nome}`).join('<br>')}</div>`;
            
            const listaEquipeSidebar = document.getElementById('lista-equipe-sidebar');
            if(listaEquipeSidebar) listaEquipeSidebar.innerHTML = htmlSidebar || 'Ninguém cadastrado.';

            atualizarDropdowns();
            if (calendar) calendar.refetchEvents();
        } catch (e) { console.error(e); }
    }

    window.prepararEdicaoColaborador = function(id, event) {
        if (event) { event.preventDefault(); event.stopPropagation(); }
        
        const colaborador = equipe.find(c => c.id == id);
        if (!colaborador) return;

        document.getElementById('novo-nome').value = colaborador.nome;
        document.getElementById('nova-empresa').value = colaborador.empresa || 'HMID';
        document.getElementById('novo-cargo').value = colaborador.cargo || 'Técnico';
        document.getElementById('novo-turno').value = colaborador.turno || 'Diurno';
        document.getElementById('nova-cor').value = colaborador.cor || '#89b4fa';

        idColaboradorEditando = id;

        const btnAdicionar = document.getElementById('btn-add-user');
        if(btnAdicionar) {
            btnAdicionar.innerText = '💾 Salvar Alterações';
            btnAdicionar.style.background = 'var(--accent-purple)';
            btnAdicionar.style.color = '#11111b';
        }
    };

    window.removerUsuario = async (id, event) => { 
        if (event) { event.preventDefault(); event.stopPropagation(); }
        if(confirm("Tem certeza que deseja excluir este colaborador?")) {
            await fetch(`/api/usuarios/${id}`, { method: 'DELETE' }); 
            carregarEquipe(); 
        }
    };

    const btnAddUser = document.getElementById('btn-add-user');
    if (btnAddUser) {
        btnAddUser.addEventListener('click', async (event) => {
            event.preventDefault();
            const nome = document.getElementById('novo-nome').value.trim();
            const empresa = document.getElementById('nova-empresa').value;
            const cargo = document.getElementById('novo-cargo').value;
            const turno = document.getElementById('novo-turno').value;
            const cor = document.getElementById('nova-cor').value;
            if (!nome) return alert("O nome não pode ficar vazio.");
            
            const btn = document.getElementById('btn-add-user');
            btn.innerHTML = '⏳...';

            if (idColaboradorEditando) {
                const antigoAgente = equipe.find(c => c.id == idColaboradorEditando);
                await fetch(`/api/usuarios/${idColaboradorEditando}`, { method: 'DELETE' });
                await fetch('/api/usuarios', { 
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify({ 
                        nome, cor, empresa, cargo, turno,
                        foto: antigoAgente.foto || null,
                        telefone: antigoAgente.telefone || null,
                        email: antigoAgente.email || null,
                        descricao: antigoAgente.descricao || null
                    }) 
                });
                
                idColaboradorEditando = null;
                btn.innerText = '+ Adicionar';
                btn.style.background = ''; 
                btn.style.color = '';
            } else {
                await fetch('/api/usuarios', { 
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify({ nome, cor, empresa, cargo, turno }) 
                });
                btn.innerHTML = '+ Adicionar';
            }
            
            document.getElementById('novo-nome').value = '';
            carregarEquipe();
        });
    }

    const btnAbrirEquipe = document.getElementById('btn-abrir-equipe');
    if(btnAbrirEquipe) btnAbrirEquipe.onclick = () => document.getElementById('modal-equipe').style.display = 'block';
    
    const geradorRegra = document.getElementById('gerador-regra');
    if(geradorRegra) {
        geradorRegra.onchange = function() { 
            const cd = document.getElementById('container-dias-avulsos');
            if(cd) cd.style.display = (this.value === 'avulso') ? 'block' : 'none'; 
        };
    }

    function checarCobertura(escalasAtuais) {
        if(escalasAtuais.length === 0) return;
        const alerta = document.getElementById('alerta-cobertura');
        if(!alerta) return;

        const dtVis = calendar.getDate();
        const ano = dtVis.getFullYear();
        const mes = dtVis.getMonth() + 1;
        const diasNoMes = new Date(ano, mes, 0).getDate();
        
        let temBuraco = false;
        
        for(let d=1; d <= diasNoMes; d++) {
            const dataStr = `${ano}-${String(mes).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            const plantoesDoDia = escalasAtuais.filter(e => e.data === dataStr && e.status === 'Plantão');
            
            const temDia = plantoesDoDia.some(e => e.turno === 'Diurno' || e.turno === 'Comercial');
            const temNoite = plantoesDoDia.some(e => e.turno === 'Noturno');

            if (!temDia || !temNoite) temBuraco = true;
        }
        alerta.style.display = temBuraco ? 'block' : 'none';
    }

    function validarConflito(usuario, data, novoStatus) {
        const conflito = todasEscalas.find(e => e.usuario === usuario && e.data === data);
        if (conflito && novoStatus === 'Plantão' && conflito.status !== 'Plantão') {
            return confirm(`Atenção: ${usuario} já possui "${conflito.status}" no dia ${data}. Deseja sobrescrever para Plantão?`);
        }
        return true;
    }

    if(calendarEl) {
        calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            fixedWeekCount: false,
            locale: 'pt-br',
            
            customButtons: {
                btnFoco: {
                    text: '⛶ Foco',
                    click: function() {
                        document.body.classList.toggle('modo-foco');
                        setTimeout(() => calendar.updateSize(), 150); 
                    }
                }
            },
            headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,dayGridWeek btnFoco' },
            buttonText: { today: 'Hoje', month: 'Mês', week: 'Semana' },
            contentHeight: 'auto',
            
            eventDidMount: function(info) {
                let delay = Math.random() * 0.3;
                info.el.style.animationDelay = `${delay}s`;
            },

            events: async function(info, successCallback) {
                try {
                    const res = await fetch('/api/escalas');
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
                            filtros.pessoas.includes(membro.nome) &&
                            filtros.status.includes(e.status)) { 
                            
                            let turnoPlantao = (e.turno && e.turno !== 'Ambos') ? e.turno : membro.turno; 
                            
                            let corFundo = membro.cor; 
                            let corBorda = membro.cor;
                            let corTexto = '#ffffff';
                            let cssExtra = [];

                            if (e.status === 'Plantão') {
                                if (turnoPlantao === 'Comercial') {
                                    corFundo = '#e6e9ef'; 
                                    corBorda = '#cdd6f4';
                                    corTexto = '#11111b'; 
                                } else if (turnoPlantao === 'Diurno') {
                                    corFundo = '#5c5f77'; 
                                    corBorda = '#737994';
                                    corTexto = '#ffffff';
                                } else if (turnoPlantao === 'Noturno') {
                                    corFundo = '#181825'; 
                                    corBorda = '#89b4fa'; 
                                    corTexto = '#89b4fa'; 
                                }
                                
                                if (membro.turno === 'Ambos' || membro.cargo.toLowerCase().includes('folguista') || membro.nome.toLowerCase().includes('folguista')) {
                                    cssExtra.push('evento-folguista');
                                }
                                
                                cssExtra.push(turnoPlantao === 'Noturno' ? 'evento-noturno' : 'evento-diurno');

                            } else {
                                if (e.status === 'Folga') {
                                    corFundo = 'rgba(166, 227, 161, 0.05)'; 
                                    corBorda = 'rgba(166, 227, 161, 0.15)'; 
                                    corTexto = 'rgba(166, 227, 161, 0.6)';  
                                } else if (e.status === 'Folga Feriado') {
                                    corFundo = 'rgba(237, 135, 150, 0.05)'; 
                                    corBorda = 'rgba(237, 135, 150, 0.15)';
                                    corTexto = 'rgba(237, 135, 150, 0.6)';
                                } else if (e.status === 'Atestado') {
                                    corFundo = 'rgba(243, 139, 168, 0.05)';
                                    corBorda = 'rgba(243, 139, 168, 0.2)';
                                    corTexto = 'rgba(243, 139, 168, 0.45)';
                                } else if (e.status === 'Ausente') {
                                    corFundo = 'rgba(250, 179, 135, 0.05)';
                                    corBorda = 'rgba(250, 179, 135, 0.3)';
                                    corTexto = 'rgba(250, 179, 135, 0.8)';
                                } else {
                                    corFundo = 'transparent';
                                    corBorda = 'rgba(255, 255, 255, 0.1)';
                                    corTexto = 'rgba(255, 255, 255, 0.4)';
                                }
                                cssExtra.push('evento-inativo'); 
                            }

                            let iconeFinal = '☀️';
                            if (e.status === 'Plantão') {
                                if (turnoPlantao === 'Noturno') iconeFinal = '🌙';
                                else if (turnoPlantao === 'Comercial') iconeFinal = '💼';
                            } else if (e.status === 'Folga') { iconeFinal = '🏖️';
                            } else if (e.status === 'Folga Feriado') { iconeFinal = '🌴';
                            } else if (e.status === 'Atestado') { iconeFinal = '🏥';
                            } else if (e.status === 'Ausente') { iconeFinal = '⚠️'; }

                            let titleFinal = e.status === 'Plantão' ? `${iconeFinal} ${e.usuario}` : `${iconeFinal} ${e.usuario} (${e.status})`;
                            
                            // Se tiver descrição, adiciona ao título do calendário
                            if (e.descricao) {
                                titleFinal += ` - ${e.descricao}`;
                            }

                            eventosNoCalendario.push({
                                id: e.id, 
                                title: titleFinal, 
                                start: e.data, 
                                allDay: true, 
                                backgroundColor: corFundo, 
                                borderColor: corBorda, 
                                textColor: corTexto,
                                ordemTurno: turnoPlantao === 'Noturno' ? 2 : 1, 
                                classNames: cssExtra, 
                                extendedProps: { usuario: e.usuario, status: e.status, turno: turnoPlantao, empresa: membro.empresa, cargo: membro.cargo, descricao: e.descricao }
                            });

                            const [anoE, mesE] = e.data.split('-');
                            const dtVis = calendar.getDate();
                            if (parseInt(anoE) === dtVis.getFullYear() && parseInt(mesE) === dtVis.getMonth() + 1 && e.status === 'Plantão') {
                                contagem[e.usuario] = (contagem[e.usuario] || 0) + 1;
                            }
                        }
                    });

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
                                    textColor: '#ed8796',
                                    ordemTurno: 0
                                });
                            });
                        }
                    } catch (err) { console.log("Aviso: Feriados não carregados."); }

                    successCallback(eventosNoCalendario);

                    const resumoSpan = document.getElementById('resumo-plantones');
                    if(resumoSpan) {
                        const nomesContados = Object.keys(contagem);
                        resumoSpan.innerHTML = nomesContados.length > 0 ? nomesContados.map(n => `<b style="color:inherit;">${n}:</b> ${contagem[n]}d`).join(' &nbsp;|&nbsp; ') : "Nenhum plantão nos filtros.";
                    }
                } catch (e) { console.error(e); }
            },

            dateClick: function(info) {
                dataSelecionadaTemp = info.dateStr;
                const partesData = info.dateStr.split('-');
                const tit = document.getElementById('titulo-resumo-dia');
                if(tit) tit.innerText = `📅 Dia ${partesData[2]}/${partesData[1]}/${partesData[0]}`;
                
                const eventosDoDia = calendar.getEvents().filter(e => e.startStr === info.dateStr && e.extendedProps.usuario);
                
                let grupos = { '💼 Comercial': [], '☀️ Plantão (Diurno)': [], '🌙 Plantão (Noturno)': [], '🏖️ Folgas': [], '🏥 Atestados': [], '⚠️ Outros': [] };

                eventosDoDia.forEach(e => {
                    const s = e.extendedProps.status;
                    const t = e.extendedProps.turno;
                    
                    // Mostra a descrição no resumo do dia
                    let descAdicional = e.extendedProps.descricao ? ` <em style="color:#f38ba8; font-size: 0.85em;">- ${e.extendedProps.descricao}</em>` : '';
                    const n = `${e.extendedProps.usuario} <small>(${e.extendedProps.empresa})</small>${descAdicional}`;
                    
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
                const contRes = document.getElementById('conteudo-resumo');
                if(contRes) contRes.innerHTML = htmlConteudo || '<p style="text-align: center; color: var(--text-dim); margin-top: 20px;">Sem programação visível.</p>';
                
                const formAdd = document.getElementById('form-add-dia');
                if(formAdd) formAdd.style.display = 'none';
                
                const btnAddRegistro = document.getElementById('btn-toggle-add-dia');
                if (btnAddRegistro) btnAddRegistro.style.display = isAdmin ? 'block' : 'none';

                const modRes = document.getElementById('modal-resumo-dia');
                if(modRes) modRes.style.display = 'block';
                
                const addDiaNome = document.getElementById('add-dia-nome');
                if(addDiaNome) addDiaNome.dispatchEvent(new Event('change')); 
            },
            
           eventClick: function(info) {
                if (!isAdmin) return;
                if (!info.event.extendedProps.usuario) return;
                
                eventoSelecionadoTemp = info.event;
                
                const editNome = document.getElementById('editar-nome-display');
                if(editNome) editNome.innerText = info.event.extendedProps.usuario;
                
                const editStatus = document.getElementById('editar-status');
                if(editStatus) editStatus.value = info.event.extendedProps.status;
                
                // Puxa a descrição atual para dentro da caixinha de edição
                const editDesc = document.getElementById('editar-descricao');
                if(editDesc) editDesc.value = info.event.extendedProps.descricao || '';
                
                const modEditar = document.getElementById('modal-editar');
                if(modEditar) modEditar.style.display = 'block';
            }
        });
    }

    const btnGerador = document.getElementById('btn-abrir-gerador');
    if(btnGerador) btnGerador.onclick = () => document.getElementById('modal-gerador').style.display = 'block';
    
    const btnConfGer = document.getElementById('btn-confirmar-gerador');
    if(btnConfGer) {
        btnConfGer.onclick = async () => {
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
                await fetch('/api/escalas/lote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lote) });
            }
            btn.innerHTML = 'Confirmar Geração';
            btn.style.pointerEvents = 'auto';
            document.getElementById('modal-gerador').style.display = 'none';
            calendar.refetchEvents();
        };
    }

    const btnTogAdd = document.getElementById('btn-toggle-add-dia');
    if(btnTogAdd) btnTogAdd.onclick = () => document.getElementById('form-add-dia').style.display = 'block';
    
    // BOTÃO PARA SALVAR O DIA MANUALMENTE COM DESCRIÇÃO
    const btnSalvarDia = document.getElementById('btn-salvar-dia');
    if(btnSalvarDia) {
        btnSalvarDia.onclick = async () => {
            const nome = document.getElementById('add-dia-nome').value;
            const status = document.getElementById('add-dia-status').value;
            const descricao = document.getElementById('add-dia-descricao') ? document.getElementById('add-dia-descricao').value.trim() : '';
            
            if (!nome) return;

            if(!validarConflito(nome, dataSelecionadaTemp, status)) return;

            const membro = equipe.find(u => u.nome === nome);
            const turnoFinal = (membro && membro.turno === 'Ambos') ? document.getElementById('add-dia-turno-escolhido').value : membro.turno;

            await fetch('/api/escalas', { 
                method: 'POST', headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ 
                    usuario: nome, 
                    status: status, 
                    data: dataSelecionadaTemp, 
                    turno: turnoFinal, 
                    hora_registro: new Date().toLocaleString(),
                    descricao: descricao 
                }) 
            });
            
            if(document.getElementById('add-dia-descricao')) document.getElementById('add-dia-descricao').value = '';
            document.getElementById('modal-resumo-dia').style.display = 'none';
            calendar.refetchEvents();
        };
    }

    const btnLimp = document.getElementById('btn-abrir-limpeza');
    if(btnLimp) btnLimp.onclick = () => document.getElementById('modal-limpeza').style.display = 'block';
    
    const btnConfLimp = document.getElementById('btn-confirmar-limpeza');
    if(btnConfLimp) {
        btnConfLimp.onclick = async () => {
            const n = document.getElementById('limpeza-nome').value;
            const m = document.getElementById('limpeza-mes').value;
            
            if (!m.includes('/')) return alert("Preencha o mês/ano corretamente (Ex: 04/2026)");
            
            const [mes, ano] = m.split('/');
            const mesBanco = `${ano}-${mes.padStart(2, '0')}`;

            const btn = document.getElementById('btn-confirmar-limpeza');
            btn.innerHTML = '⏳ Limpando...';

            await fetch(`/api/escalas/limpar/${encodeURIComponent(n)}/${mesBanco}`, { method: 'DELETE' });
            
            btn.innerHTML = 'Confirmar Limpeza';
            document.getElementById('modal-limpeza').style.display = 'none';
            calendar.refetchEvents(); 
        };
    }

    // BOTÃO PARA SALVAR A EDIÇÃO COM DESCRIÇÃO
    const btnSalvarEdicao = document.getElementById('btn-salvar-edicao');
    if(btnSalvarEdicao) {
        btnSalvarEdicao.onclick = async () => {
            if (!eventoSelecionadoTemp) return;
            
            const novoStatus = document.getElementById('editar-status').value;
            const props = eventoSelecionadoTemp.extendedProps;
            const dataStr = eventoSelecionadoTemp.startStr;
            const novaDesc = document.getElementById('editar-descricao') ? document.getElementById('editar-descricao').value.trim() : '';

            const btn = document.getElementById('btn-salvar-edicao');
            btn.innerHTML = '⏳...';

            await fetch(`/api/escalas/${eventoSelecionadoTemp.id}`, { method: 'DELETE' });

            await fetch('/api/escalas', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ 
                    usuario: props.usuario, 
                    status: novoStatus, 
                    data: dataStr, 
                    turno: props.turno, 
                    hora_registro: new Date().toLocaleString(),
                    descricao: novaDesc 
                }) 
            });

            btn.innerHTML = '💾 Salvar';
            document.getElementById('modal-editar').style.display = 'none';
            calendar.refetchEvents(); 
        };
    }

    const btnApagarEdicao = document.getElementById('btn-apagar-edicao');
    if(btnApagarEdicao) {
        btnApagarEdicao.onclick = async () => {
            if (!eventoSelecionadoTemp) return;
            
            if (confirm(`Tem certeza que deseja remover este registro?`)) {
                await fetch(`/api/escalas/${eventoSelecionadoTemp.id}`, { method: 'DELETE' });
                document.getElementById('modal-editar').style.display = 'none';
                calendar.refetchEvents();
            }
        };
    }
    
    // ==========================================
    // LÓGICA DO GERADOR DE FOLGAS
    // ==========================================
    const btnAbrirFolgas = document.getElementById('btn-abrir-folgas');
    const modalFolgas = document.getElementById('modal-folgas');

    if(btnAbrirFolgas) {
        btnAbrirFolgas.onclick = () => {
            if(modalFolgas) modalFolgas.style.display = 'block';
        };
    }

    const btnConfFolgas = document.getElementById('btn-confirmar-folgas');
    if(btnConfFolgas) {
        btnConfFolgas.onclick = async () => {
            const tecnico = document.getElementById('folga-nome').value;
            const tipo = document.getElementById('folga-tipo').value;
            const mesAno = document.getElementById('folga-mes').value;
            const diasBrutos = document.getElementById('folga-dias').value;

            if (!tecnico || !mesAno.includes('/') || !diasBrutos) {
                return alert("Preencha o Mês/Ano e os Dias corretamente (Ex: 05/2026 e 10, 15, 20).");
            }

            const btn = document.getElementById('btn-confirmar-folgas');
            btn.innerHTML = '⏳ Lançando e Substituindo...'; 
            btn.style.pointerEvents = 'none';

            const [mes, ano] = mesAno.split('/');
            const diasLista = diasBrutos.split(',').map(d => d.trim());
            let lote = [];

            for (let i = 0; i < diasLista.length; i++) {
                const diaNum = parseInt(diasLista[i]);
                if (diaNum > 0 && diaNum <= 31) {
                    const dataFormat = `${ano}-${mes.padStart(2, '0')}-${String(diaNum).padStart(2, '0')}`;
                    
                    const registroExistente = todasEscalas.find(e => e.usuario === tecnico && e.data === dataFormat);
                    
                    if (registroExistente) {
                        await fetch(`/api/escalas/${registroExistente.id}`, { method: 'DELETE' });
                    }

                    lote.push({ 
                        usuario: tecnico, 
                        status: tipo, 
                        data: dataFormat, 
                        turno: 'Diurno', 
                        hora_registro: new Date().toLocaleString() 
                    });
                }
            }

            if (lote.length > 0) {
                await fetch('/api/escalas/lote', { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify(lote) 
                });
            }

            btn.innerHTML = 'Lançar Folgas em Lote';
            btn.style.pointerEvents = 'auto';
            document.getElementById('folga-dias').value = ''; 
            modalFolgas.style.display = 'none';
            
            if (calendar) {
                await carregarDadosDoServidor();
                calendar.refetchEvents();
            }
        };
    }

    // ==========================================
    // LÓGICA DO GERADOR DE ATESTADOS COM DESCRIÇÃO
    // ==========================================
    const btnAbrirAtestados = document.getElementById('btn-abrir-atestados');
    const modalAtestados = document.getElementById('modal-atestados');

    if(btnAbrirAtestados) {
        btnAbrirAtestados.onclick = () => {
            if(modalAtestados) modalAtestados.style.display = 'block';
        };
    }

    const btnConfAtestados = document.getElementById('btn-confirmar-atestados');
    if(btnConfAtestados) {
        btnConfAtestados.onclick = async () => {
            const tecnico = document.getElementById('atestado-nome').value;
            const mesAno = document.getElementById('atestado-mes').value;
            const diasBrutos = document.getElementById('atestado-dias').value;
            const descAtestado = document.getElementById('atestado-descricao').value.trim();

            if (!tecnico || !mesAno.includes('/') || !diasBrutos) {
                return alert("Preencha o Mês/Ano e os Dias corretamente (Ex: 05/2026 e 10, 11).");
            }

            const btn = document.getElementById('btn-confirmar-atestados');
            btn.innerHTML = '⏳ Gravando...'; 
            btn.style.pointerEvents = 'none';

            const [mes, ano] = mesAno.split('/');
            const diasLista = diasBrutos.split(',').map(d => d.trim());
            let lote = [];

            for (let i = 0; i < diasLista.length; i++) {
                const diaNum = parseInt(diasLista[i]);
                if (diaNum > 0 && diaNum <= 31) {
                    const dataFormat = `${ano}-${mes.padStart(2, '0')}-${String(diaNum).padStart(2, '0')}`;
                    
                    const registroExistente = todasEscalas.find(e => e.usuario === tecnico && e.data === dataFormat);
                    
                    if (registroExistente) {
                        await fetch(`/api/escalas/${registroExistente.id}`, { method: 'DELETE' });
                    }

                    lote.push({ 
                        usuario: tecnico, 
                        status: 'Atestado', 
                        data: dataFormat, 
                        turno: 'Diurno', 
                        hora_registro: new Date().toLocaleString(),
                        descricao: descAtestado 
                    });
                }
            }

            if (lote.length > 0) {
                await fetch('/api/escalas/lote', { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify(lote) 
                });
            }

            btn.innerHTML = 'Gravar Atestados';
            btn.style.pointerEvents = 'auto';
            document.getElementById('atestado-dias').value = ''; 
            document.getElementById('atestado-descricao').value = ''; 
            modalAtestados.style.display = 'none';
            
            if (calendar) {
                await carregarDadosDoServidor();
                calendar.refetchEvents();
            }
        };
    }

    carregarEquipe();
    if(calendar) calendar.render();
    carregarDadosDoServidor(); 

    // ==========================================
    // LÓGICA DO CURSOR DINÂMICO
    // ==========================================
    const cursorBlur = document.getElementById('cursor-blur');
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let cursorX = mouseX;
    let cursorY = mouseY;

    function animateCursor() {
        let distX = mouseX - cursorX;
        let distY = mouseY - cursorY;
        
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

    document.addEventListener('mousedown', () => { 
        if(cursorBlur) cursorBlur.style.transform = 'translate(-50%, -50%) scale(0.7)'; 
    });
    document.addEventListener('mouseup', () => { 
        if(cursorBlur) cursorBlur.style.transform = 'translate(-50%, -50%) scale(1)'; 
    });

    animateCursor();
});

document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // CONTROLE DA GAVETA DE FILTROS
    // ==========================================
    const btnFiltros = document.getElementById('btn-toggle-filtros');
    const btnFecharFiltros = document.getElementById('btn-fechar-filtros');
    const sidebar = document.querySelector('.sidebar'); 
    const overlay = document.getElementById('overlay-filtros');

    if (btnFiltros && sidebar && overlay) {
        btnFiltros.addEventListener('click', () => {
            sidebar.classList.toggle('aberta');
            overlay.classList.toggle('ativo');
        });

        if (btnFecharFiltros) {
            btnFecharFiltros.addEventListener('click', () => {
                sidebar.classList.remove('aberta');
                overlay.classList.remove('ativo');
            });
        }
        
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('aberta');
            overlay.classList.remove('ativo');
        });
    }
});