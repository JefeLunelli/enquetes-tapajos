// --- Variáveis Globais e Configurações Iniciais ---
var alturaPagina = mmToPt(297);
var participantesOriginal = [];
var revertAllButton = null;

function mmToPt(mm) {
    return mm * 2.835;
}

// Executar ao carregar a página
window.addEventListener('load', function() {
    var dateContainer = document.getElementById('dateContainer');
    if (dateContainer) {
        dateContainer.textContent = new Date().toLocaleDateString('pt-BR');
    }

    window.scrollTo(0, 0);
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }

    if (typeof applyStylesBasedOnDevice === "function") applyStylesBasedOnDevice();
});

// --- Lógica dos Botões Iniciais ---
var buttonIniciais = document.querySelectorAll('.botao-inicial');
buttonIniciais.forEach(btn => {
    btn.addEventListener('click', function () {
        this.style.backgroundColor = '#ccc';
        setTimeout(() => { this.style.backgroundColor = ''; }, 1000);
    });
});

// Camuflagem: Clicar no botão visível aciona o input escondido
document.getElementById('customFileInput').addEventListener('click', function () {
    document.getElementById('fileInput').click();
});

document.getElementById('uploadButton').style.display = 'none';

// --- Processamento do Arquivo ---
document.getElementById('fileInput').addEventListener('change', function () {
    if (this.files.length > 0) {
        var file = this.files[0];
        var reader = new FileReader();
        reader.onload = function (e) {
            var csvContent = e.target.result;
            var lines = csvContent.split(/\r?\n/);
            var participantes = [];

            var startIndex = lines.findIndex(line => 
                line.includes('Nome de usuário') && 
                (line.includes('Quantas pessoas') || line.includes('Quantidade de participantes'))
            );

            if (startIndex !== -1) {
                startIndex += 1; 
                for (var i = startIndex; i < lines.length; i++) {
                    var line = lines[i].trim();
                    if (line === '' || line.startsWith('#')) continue; 
                    
                    var row = line.split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/);
                    row = row.map(value => value.replace(/^"|"$/g, '').trim());
                    
                    if (row.length >= 5) {
                        participantes.push(row);
                    }
                }
            } else {
                alert("Não foi possível encontrar os dados da enquete no arquivo.");
            }
            exibirParticipantes(participantes);
        };
        reader.readAsText(file);
    }
});

// --- Renderização da Tabela ---
function exibirParticipantes(participantes) {
    document.body.classList.add('tabela-exibida');
    
    // Esconde os elementos iniciais (Camuflagem total)
    document.getElementById('fileInput').style.display = 'none';
    document.getElementById('uploadButton').style.display = 'none';
    document.querySelector('button[onclick^="window.open"]').style.display = 'none';
    document.getElementById('customFileInput').style.display = 'none';
    document.querySelector('.imagens-container').style.display = 'none';
    
    var pdfBtn = document.getElementById('pdfButton');
    pdfBtn.style.display = 'inline-block';
    pdfBtn.classList.add('button');

    if (!document.getElementById('backToStartButton')) {
        var backToStartButton = document.createElement('button');
        backToStartButton.id = 'backToStartButton';
        backToStartButton.textContent = 'Início';
        backToStartButton.classList.add('button');
        backToStartButton.addEventListener('click', () => location.reload());
        pdfBtn.parentNode.appendChild(backToStartButton);
    }

    if (!document.getElementById('RevertButton')) {
        var revBtn = document.createElement('button');
        revBtn.id = 'RevertButton';
        revBtn.textContent = 'Reverter';
        revBtn.classList.add('button');
        revBtn.addEventListener('click', () => exibirParticipantes(participantesOriginal));
        pdfBtn.insertAdjacentElement("afterend", revBtn);
    }

    var tabela = document.getElementById('tabela-participantes');
    tabela.innerHTML = '';

    var cabecalho = document.createElement('tr');
    cabecalho.appendChild(createCell('th', 'Selecionar', false));
    cabecalho.appendChild(createCell('th', 'Nomes pelo Zoom', false));
    var assistenciaCell = createCell('th', 'Assistência', false);
    assistenciaCell.classList.add('assistencia-col');
    cabecalho.appendChild(assistenciaCell);
    tabela.appendChild(cabecalho);

    participantesOriginal = participantes.map(p => [...p]);
    var nomesAdicionados = {};

    participantes.forEach(function (p) {
        var nome = p[1];
        var assistencia = p[4];

        if (nome && assistencia && nome !== 'User Name' && nome !== 'Nome de usuário' && !assistencia.includes('Quantidade') && !nome.toLowerCase().includes('tribuna') && nome !== 'Mesa de som') {
            var linha = document.createElement('tr');
            var jaAdicionado = nomesAdicionados[nome];
            var temNumero = /\d/.test(assistencia);

            if (!temNumero || jaAdicionado) {
                linha.appendChild(createCell('td', '<input type="checkbox" class="participante-checkbox">', false));
                linha.classList.add('unchecked');
                assistencia = 'Já informou';
            } else {
                linha.appendChild(createCell('td', '<input type="checkbox" class="participante-checkbox" checked>', false));
                nomesAdicionados[nome] = true;
            }

            var nomeTd = createCell('td', nome, true);
            nomeTd.classList.add('nome-participante');
            linha.appendChild(nomeTd);

            if (assistencia.startsWith('Já informei a assistência')) assistencia = 'Já Informou';
            
            if (!isNaN(parseInt(assistencia)) && assistencia.length < 3) {
                 assistencia = parseInt(assistencia) + ' pessoa' + (parseInt(assistencia) > 1 ? 's' : '');
            }

            var assistTd = createCell('td', assistencia, true);
            assistTd.addEventListener('click', function() { criarCampoDeEntrada(this); });
            linha.appendChild(assistTd);

            nomeTd.addEventListener('click', function() {
                var cb = linha.querySelector('.participante-checkbox');
                cb.checked = !cb.checked;
                linha.classList.toggle('unchecked', !cb.checked);
                atualizarNumeroTotalPessoas();
            });

            tabela.appendChild(linha);
        }
    });

    var linhaTotal = document.createElement('tr');
    linhaTotal.appendChild(createCell('td', '', false));
    var labelTotal = createCell('td', 'Assistência total', true);
    labelTotal.id = 'total-pessoas-label';
    linhaTotal.appendChild(labelTotal);
    var valorTotal = createCell('td', '0', true);
    valorTotal.id = 'numero-total-pessoas';
    linhaTotal.appendChild(valorTotal);
    tabela.appendChild(linhaTotal);

    tabela.querySelectorAll('.participante-checkbox').forEach(cb => {
        cb.addEventListener('change', function() {
            this.parentNode.parentNode.classList.toggle('unchecked', !this.checked);
            atualizarNumeroTotalPessoas();
        });
    });

    atualizarNumeroTotalPessoas();
}

function createCell(tag, text, escape) {
    var cell = document.createElement(tag);
    escape ? cell.textContent = text : cell.innerHTML = text;
    return cell;
}

function criarCampoDeEntrada(cell) {
    var assistenciaValue = parseInt(cell.textContent) || 0;
    var input = document.createElement('input');
    input.type = 'number';
    input.placeholder = assistenciaValue.toString();
    input.classList.add('assistencia-cell-input');
    
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); });
    input.addEventListener('blur', function() {
        setTimeout(() => {
            var novo = this.value.trim() === '' ? this.placeholder : this.value;
            if (novo === '0') {
                cell.textContent = 'Já Informou';
                cell.parentNode.querySelector('.participante-checkbox').checked = false;
                cell.parentNode.classList.add('unchecked');
            } else {
                cell.textContent = novo + ' pessoa' + (novo === '1' ? '' : 's');
                cell.parentNode.querySelector('.participante-checkbox').checked = true;
                cell.parentNode.classList.remove('unchecked');
            }
            atualizarNumeroTotalPessoas();
        }, 100);
    });
    cell.textContent = '';
    cell.appendChild(input);
    input.focus();
}

function atualizarNumeroTotalPessoas() {
    var total = 0;
    document.querySelectorAll('.participante-checkbox:checked').forEach(cb => {
        total += parseInt(cb.parentNode.parentNode.cells[2].textContent) || 0;
    });
    var el = document.getElementById('numero-total-pessoas');
    if (el) el.textContent = total;
}

// --- Enviar PDF (Navigator.Share) ---
document.getElementById('pdfButton').addEventListener('click', function () {
    var selecionados = [];
    document.querySelectorAll('.participante-checkbox:checked').forEach(cb => {
        var row = cb.parentNode.parentNode;
        selecionados.push({ nome: row.cells[1].textContent, assistencia: row.cells[2].textContent });
    });

    if (selecionados.length === 0) return;

    const alturaUtil = alturaPagina - 60;
    const hLinha = Math.min(50, (alturaUtil / (selecionados.length + 2)));
    const fSize = Math.max(12, hLinha * 0.45);

    var docDefinition = {
        pageSize: 'A4',
        pageMargins: [30, 20, 30, 20],
        content: [{
            table: {
                headerRows: 1,
                widths: ['70%', '30%'],
                body: [
                    [{ text: 'Nomes pelo Zoom', style: 'tableHeader' }, { text: 'Assistência', style: 'tableHeader' }],
                    ...selecionados.map(p => [{ text: p.nome, style: 'tableCell' }, { text: p.assistencia, style: 'tableCell' }]),
                    [{ text: 'Assistência Total', style: 'tableHeader' }, { text: document.getElementById('numero-total-pessoas').textContent, style: 'tableHeader' }]
                ]
            },
            layout: {
                fillColor: (i, node) => {
                    if (i === 0 || i === node.table.body.length - 1) return '#A9A9A9';
                    return (i % 2 !== 0) ? '#C9C9C9' : '#E9E9E9';
                },
                paddingTop: () => (hLinha * 0.22),
                paddingBottom: () => (hLinha * 0.22),
            }
        }],
        styles: {
            tableHeader: { fontSize: fSize + 2, bold: true, alignment: 'center' },
            tableCell: { fontSize: fSize, alignment: 'center' }
        }
    };

    var dataFormatada = new Date().toLocaleDateString('pt-BR').replace(/\//g, '_');

    pdfMake.createPdf(docDefinition).getBuffer(function (buffer) {
        var file = new File([buffer], 'enquete_' + dataFormatada + '.pdf', { type: 'application/pdf' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            navigator.share({ files: [file], title: 'Enquete' });
        } else {
            pdfMake.createPdf(docDefinition).download('enquete_' + dataFormatada + '.pdf');
        }
    });
});
