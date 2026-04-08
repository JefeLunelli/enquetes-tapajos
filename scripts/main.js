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
});

// --- Lógica dos Botões Iniciais ---
document.getElementById('customFileInput').addEventListener('click', function () {
    document.getElementById('fileInput').click();
});

document.getElementById('uploadButton').style.display = 'none';

// --- Processamento do Arquivo CSV ---
document.getElementById('fileInput').addEventListener('change', function () {
    if (this.files.length > 0) {
        var file = this.files[0];
        var reader = new FileReader();
        reader.onload = function (e) {
            var csvContent = e.target.result;
            var lines = csvContent.split(/\r?\n/);
            var participantes = [];

            // Procura o início dos dados ignorando o cabeçalho do Zoom
            var startIndex = lines.findIndex(line => 
                line.includes('Nome de usuário') && 
                (line.includes('Quantas pessoas') || line.includes('Quantidade de participantes'))
            );

            if (startIndex !== -1) {
                startIndex += 1; 
                for (var i = startIndex; i < lines.length; i++) {
                    var line = lines[i].trim();
                    if (line === '' || line.startsWith('#')) continue; 
                    
                    // Lógica para nomes com vírgula (ex: "André, Gabriela")
                    var row = line.split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/);
                    row = row.map(value => value.replace(/^"|"$/g, '').trim());
                    
                    if (row.length >= 5) {
                        participantes.push(row);
                    }
                }
            }
            exibirParticipantes(participantes);
        };
        reader.readAsText(file);
    }
});

// --- Renderização da Tabela com Filtros ---
function exibirParticipantes(participantes) {
    document.body.classList.add('tabela-exibida');
    document.querySelectorAll('.botao-inicial, #customFileInput, .imagens-container').forEach(el => el.style.display = 'none');
    
    var pdfBtn = document.getElementById('pdfButton');
    pdfBtn.style.display = 'inline-block';

    // Cria botão Início se não existir
    if (!document.getElementById('backToStartButton')) {
        var backBtn = document.createElement('button');
        backBtn.id = 'backToStartButton';
        backBtn.textContent = 'Início';
        backBtn.classList.add('button');
        backBtn.addEventListener('click', () => location.reload());
        pdfBtn.parentNode.appendChild(backBtn);
    }

    // Cria botão Reverter se não existir
    if (!document.getElementById('RevertButton')) {
        var revBtn = document.createElement('button');
        revBtn.id = 'RevertButton';
        revBtn.textContent = 'Reverter';
        revBtn.classList.add('button');
        revBtn.addEventListener('click', () => exibirParticipantes(participantesOriginal));
        pdfBtn.insertAdjacentElement("afterend", revBtn);
    }

    var tabela = document.getElementById('tabela-participantes');
    tabela.innerHTML = '<tr><th>Selecionar</th><th>Nomes pelo Zoom</th><th class="assistencia-col">Assistência</th></tr>';

    participantesOriginal = participantes.map(p => [...p]);
    var nomesAdicionados = {};

    participantes.forEach(function (p) {
        var nome = p[1];
        var assistencia = p[4];

        if (nome && assistencia && nome !== 'Nome de usuário' && !assistencia.includes('Quantidade') && !nome.toLowerCase().includes('tribuna') && nome !== 'Mesa de som') {
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

            if (!isNaN(parseInt(assistencia)) && assistencia.length < 3) {
                 assistencia = parseInt(assistencia) + ' pessoa' + (parseInt(assistencia) > 1 ? 's' : '');
            }

            var assistTd = createCell('td', assistencia, true);
            assistTd.addEventListener('click', function() { criarCampoDeEntrada(this); });
            linha.appendChild(assistTd);

            // Clique no nome alterna o checkbox
            nomeTd.addEventListener('click', function() {
                var cb = linha.querySelector('.participante-checkbox');
                cb.checked = !cb.checked;
                linha.classList.toggle('unchecked', !cb.checked);
                atualizarNumeroTotalPessoas();
            });

            tabela.appendChild(linha);
        }
    });

    // Linha do Total
    var linhaTotal = document.createElement('tr');
    linhaTotal.innerHTML = '<td></td><td>Assistência total</td><td id="numero-total-pessoas">0</td>';
    tabela.appendChild(linhaTotal);

    tabela.querySelectorAll('.participante-checkbox').forEach(cb => {
        cb.addEventListener('change', atualizarNumeroTotalPessoas);
    });

    atualizarNumeroTotalPessoas();
}

function createCell(tag, text, escape) {
    var cell = document.createElement(tag);
    escape ? cell.textContent = text : cell.innerHTML = text;
    return cell;
}

// --- Edição Manual da Assistência ---
function criarCampoDeEntrada(cell) {
    var valAnterior = parseInt(cell.textContent) || 0;
    var input = document.createElement('input');
    input.type = 'number';
    input.classList.add('assistencia-cell-input');
    input.onblur = function() {
        var n = this.value || valAnterior;
        cell.textContent = n + ' pessoa' + (n > 1 ? 's' : '');
        atualizarNumeroTotalPessoas();
    };
    cell.textContent = '';
    cell.appendChild(input);
    input.focus();
}

function atualizarNumeroTotalPessoas() {
    var total = 0;
    document.querySelectorAll('.participante-checkbox:checked').forEach(cb => {
        total += parseInt(cb.parentNode.parentNode.cells[2].textContent) || 0;
    });
    document.getElementById('numero-total-pessoas').textContent = total;
}

// --- Geração do PDF com Cálculos de Layout Original ---
document.getElementById('pdfButton').addEventListener('click', function () {
    var selecionados = [];
    document.querySelectorAll('.participante-checkbox:checked').forEach(cb => {
        var row = cb.parentNode.parentNode;
        selecionados.push({ nome: row.cells[1].textContent, assistencia: row.cells[2].textContent });
    });

    if (selecionados.length === 0) return;

    // CÁLCULOS ORIGINAIS DE ESPAÇAMENTO
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

    pdfMake.createPdf(docDefinition).download('enquete.pdf');
});
