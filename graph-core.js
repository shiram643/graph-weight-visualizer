let cy;
let isDirected = false;
let activeStatuses = []; // { name: string, type: 'number' | 'text' }

// レイアウトの共通設定
const layoutConfig = {
    name: 'cose',
    animate: true,
    nodeRepulsion: 1000000,
    idealEdgeLength: 200,
    edgeElasticity: 100,
    nodeOverlap: 50,
    refresh: 20,
    fit: false,                   // 独自関数で制御するためfalseにする
    padding: 100,
    randomize: false,
    componentSpacing: 200,
    nodeDimensionsIncludeLabels: true
};

// グラフを適切な余白を持って画面内に収める関数
function fitGraph() {
    cy.fit(undefined, 80);
    cy.panBy({ x: 0, y: -30 });
}

function initCytoscape() {
    cy = cytoscape({
        container: document.getElementById('cy'),
        style: [
            {
                selector: 'core',
                style: {
                    'active-bg-size': 0,
                    'active-bg-opacity': 0,
                    'selection-box-opacity': 0
                }
            },
            {
                selector: 'node',
                style: {
                    'background-color': '#007bff',
                    'label': 'data(id)',
                    'color': '#ffffff',
                    'text-valign': 'center',
                    'text-halign': 'center',
                    'width': '100px',
                    'height': '100px',
                    'font-family': '"Cambria Math", serif',
                    'font-size': '48px',
                    'font-weight': 'bold',
                    'active-bg-opacity': 0,
                    'overlay-opacity': 0
                }
            },
            {
                selector: 'node[id = "S"]',
                style: {
                    'background-color': '#28a745',
                    'color': '#ffffff',
                    'text-outline-color': '#28a745'
                }
            },
            {
                selector: 'node[id = "G"]',
                style: {
                    'background-color': '#dc3545',
                    'color': '#ffffff',
                    'text-outline-color': '#dc3545'
                }
            },
            {
                selector: 'edge',
                style: {
                    'width': 12,
                    'line-color': '#adb5bd',
                    'target-arrow-color': '#adb5bd',
                    'target-arrow-shape': isDirected ? 'triangle' : 'none',
                    'curve-style': 'bezier',
                    'label': 'data(weight)',
                    'font-family': '"Cambria Math", serif',
                    'font-size': '40px',
                    'color': '#000',
                    'text-background-opacity': 1,
                    'text-background-color': '#ffffff',
                    'text-background-padding': '8px',
                    'text-background-shape': 'roundrectangle',
                    'edge-text-rotation': 'none',
                    'active-bg-opacity': 0,
                    'overlay-opacity': 0
                }
            },
            {
                selector: 'node.highlighted',
                style: {
                    'background-color': '#ffc107',
                    'color': '#000000'
                }
            },
            {
                selector: 'edge.highlighted',
                style: {
                    'line-color': '#ffc107',
                    'width': 16,
                    'text-background-color': '#ffc107',
                    'text-background-opacity': 1,
                    'target-arrow-color': '#ffc107'
                }
            },
            {
                selector: 'edge.path-purple',
                style: {
                    'underlay-color': '#9c27b0',
                    'underlay-padding': '12px',
                    'underlay-opacity': 1,
                    'underlay-shape': 'buffer',
                    'line-cap': 'butt',
                    'target-arrow-color': '#9c27b0',
                    'arrow-scale': 1,
                    'target-distance-from-node': '-8px',
                    'width': 16,
                    'z-index': 9999
                }
            },
            {
                selector: 'node.path-purple',
                style: {
                    'border-width': 12,
                    'border-color': '#9c27b0',
                    'border-opacity': 1,
                    'z-index': 9999
                }
            }
        ],
        layout: {
            name: 'cose',
            animate: true
        }
    });

    cy.on('tap', 'node, edge', function(evt){
        const target = evt.target;
        target.toggleClass('highlighted');

        if (target.isEdge()) {
            const edgeId = target.id();
            const strip = document.querySelector(`.edge-strip[data-edge-id="${edgeId}"]`);
            if (strip) {
                if (target.hasClass('highlighted')) {
                    strip.classList.add('highlighted');
                } else {
                    strip.classList.remove('highlighted');
                }
            }
        }
    });

    cy.on('layoutstart', () => {
        document.getElementById('layout-loading').classList.add('active');
    });

    cy.on('layoutstop', () => {
        document.getElementById('layout-loading').classList.remove('active');
        fitGraph();
        updateVertexStatusPositions();
    });

    cy.on('pan zoom position', () => {
        updateVertexStatusPositions();
    });
}

function updateVertexStatusPositions() {
    const container = document.getElementById('vertex-status-container');
    if (!container) return;

    cy.nodes().forEach(node => {
        const statusWin = document.querySelector(`.vertex-status-win[data-node-id="${node.id()}"]`);
        if (statusWin) {
            const pos = node.renderedPosition();
            statusWin.style.left = `${pos.x}px`;
            // ステータス数に応じて上方向のオフセットを調整
            const offset = 100 + (activeStatuses.length - 1) * 45;
            statusWin.style.top = `${pos.y - offset}px`;
        }
    });
}

// ステータスの追加処理（最大5つまで）
function addVertexStatus() {
    if (activeStatuses.length >= 5) {
        showErrorMessage("ステータスは最大5つまで設定可能です。");
        return;
    }

    const newStatus = {
        name: `ステータス${activeStatuses.length + 1}`,
        type: 'number'
    };

    activeStatuses.push(newStatus);
    renderStatusSettings();
    refreshVertexStatusWindows();
}

// ステータスの削除処理
function removeVertexStatus(index) {
    const removedStatus = activeStatuses[index];
    activeStatuses.splice(index, 1);
    
    // 削除されたステータスのデータを頂点からクリア
    cy.nodes().forEach(node => {
        const values = node.data('customStatusValues') || {};
        delete values[removedStatus.name];
        node.data('customStatusValues', values);
    });
    
    renderStatusSettings();
    refreshVertexStatusWindows();
}

// ステータス名の更新処理
function updateStatusName(index, newName) {
    const oldName = activeStatuses[index].name;
    activeStatuses[index].name = newName;
    
    // 頂点のデータキーも更新
    cy.nodes().forEach(node => {
        const values = node.data('customStatusValues') || {};
        if (values[oldName] !== undefined) {
            values[newName] = values[oldName];
            delete values[oldName];
        }
        node.data('customStatusValues', values);
    });
    refreshVertexStatusWindows();
}

// ステータス型の更新処理
function updateStatusType(index, newType) {
    activeStatuses[index].type = newType;
    refreshVertexStatusWindows();
}

// 左パネルのステータス設定リストをレンダリング（帯スタイル）
function renderStatusSettings() {
    const listContainer = document.getElementById('status-settings-list');
    listContainer.innerHTML = '';

    activeStatuses.forEach((status, index) => {
        const strip = document.createElement('div');
        strip.className = 'status-setting-strip';
        
        // 名前入力欄
        const nameInput = document.createElement('input');
        nameInput.className = 'status-name-input';
        nameInput.value = status.name;
        nameInput.placeholder = "名前";
        nameInput.addEventListener('change', (e) => updateStatusName(index, e.target.value));

        const controls = document.createElement('div');
        controls.className = 'status-setting-controls';

        // 型選択
        const select = document.createElement('select');
        select.className = 'status-type-select-mini';
        const optNum = document.createElement('option');
        optNum.value = 'number';
        optNum.textContent = '数値';
        const optText = document.createElement('option');
        optText.value = 'text';
        optText.textContent = '文字';
        select.appendChild(optNum);
        select.appendChild(optText);
        select.value = status.type;
        select.addEventListener('change', (e) => updateStatusType(index, e.target.value));

        // 削除ボタン
        const delBtn = document.createElement('button');
        delBtn.className = 'status-del-btn';
        delBtn.textContent = '×';
        delBtn.addEventListener('click', () => removeVertexStatus(index));

        controls.appendChild(select);
        controls.appendChild(delBtn);
        strip.appendChild(nameInput);
        strip.appendChild(controls);
        listContainer.appendChild(strip);
    });

    // 最大数に達したら追加ボタンを無効化（任意）
    const addBtn = document.getElementById('add-status-btn');
    if (addBtn) {
        addBtn.disabled = activeStatuses.length >= 5;
        addBtn.style.opacity = activeStatuses.length >= 5 ? '0.5' : '1';
    }
}

// 入力内容に応じて入力欄の幅を調整する関数
function adjustInputWidth(input) {
    const tempSpan = document.createElement('span');
    tempSpan.style.visibility = 'hidden';
    tempSpan.style.position = 'absolute';
    tempSpan.style.whiteSpace = 'pre';
    // inputのフォント設定を正確に反映させる
    const style = window.getComputedStyle(input);
    tempSpan.style.font = style.font;
    tempSpan.style.fontSize = style.fontSize;
    tempSpan.style.fontWeight = style.fontWeight;
    tempSpan.style.fontFamily = style.fontFamily;
    
    tempSpan.textContent = input.value || input.placeholder || " ";
    document.body.appendChild(tempSpan);
    const textWidth = tempSpan.offsetWidth;
    document.body.removeChild(tempSpan);
    
    // パディング分を考慮し、100px〜250pxの範囲に収める（初期幅を拡大）
    input.style.width = `${Math.min(Math.max(textWidth + 30, 100), 250)}px`;
}

// 全頂点のステータスウィンドウを再構築
function refreshVertexStatusWindows() {
    const container = document.getElementById('vertex-status-container');
    container.innerHTML = '';

    if (activeStatuses.length === 0) return;

    cy.nodes().forEach(node => {
        const statusWin = document.createElement('div');
        statusWin.className = 'vertex-status-win';
        statusWin.dataset.nodeId = node.id();
        statusWin.style.pointerEvents = 'auto';

        activeStatuses.forEach(status => {
            const row = document.createElement('div');
            row.className = 'status-row';

            const label = document.createElement('div');
            label.className = 'status-label';
            label.textContent = `${status.name}`;

            const input = document.createElement('input');
            input.type = status.type === 'number' ? 'number' : 'text';
            input.className = 'status-input';
            input.placeholder = status.type === 'number' ? '0' : '入力';
            
            const savedValues = node.data('customStatusValues') || {};
            if (savedValues[status.name] !== undefined) {
                input.value = savedValues[status.name];
            }

            // 入力時に値を保存し、幅を調整
            input.addEventListener('input', (e) => {
                const values = node.data('customStatusValues') || {};
                values[status.name] = e.target.value;
                node.data('customStatusValues', values);
                adjustInputWidth(e.target);
            });

            row.appendChild(label);
            row.appendChild(input);
            statusWin.appendChild(row);
            
            // 初期表示時の幅調整
            setTimeout(() => adjustInputWidth(input), 0);
        });

        container.appendChild(statusWin);
    });

    updateVertexStatusPositions();
}

function updateGraph() {
    // 任意ステータスの設定をリセット
    const statusContainer = document.getElementById('vertex-status-container');
    if (statusContainer) statusContainer.innerHTML = '';
    activeStatuses = [];
    renderStatusSettings();

    const loadingText = document.querySelector('.loading-text');
    if (loadingText) loadingText.textContent = "グラフ生成中";

    const text = document.getElementById('input-data').value;
    const lines = text.trim().split('\n');
    
    const elements = [];
    const nodeSet = new Set();

    lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        if (parts.length === 0 || parts[0] === '') return;

        if (parts.length >= 3) {
            const source = parts[0];
            const target = parts[1];
            const weight = parseFloat(parts[2]) || 0;

            if (!nodeSet.has(source)) {
                elements.push({ data: { id: source } });
                nodeSet.add(source);
            }
            if (!nodeSet.has(target)) {
                elements.push({ data: { id: target } });
                nodeSet.add(target);
            }
            elements.push({
                data: {
                    id: source + '-' + target + '-' + Math.random(),
                    source: source,
                    target: target,
                    weight: weight
                }
            });
        } else if (parts.length === 1) {
            const id = parts[0];
            if (!nodeSet.has(id)) {
                elements.push({ data: { id: id } });
                nodeSet.add(id);
            }
        } else if (parts.length === 2) {
            const source = parts[0];
            const target = parts[1];
            if (!nodeSet.has(source)) {
                elements.push({ data: { id: source } });
                nodeSet.add(source);
            }
            if (!nodeSet.has(target)) {
                elements.push({ data: { id: target } });
                nodeSet.add(target);
            }
            elements.push({
                data: {
                    id: source + '-' + target + '-' + Math.random(),
                    source: source,
                    target: target,
                    weight: 0
                }
            });
        }
    });

    cy.elements().remove();
    cy.add(elements);
    applyStyles();
    cy.layout(layoutConfig).run();
    updateEdgeLists();
}

function updateEdgeLists() {
    const unusedList = document.getElementById('unused-edges-list');
    const usedList = document.getElementById('used-edges-list');
    const infoMsg = document.getElementById('edge-order-info');
    
    unusedList.innerHTML = '';
    usedList.innerHTML = '';
    if (infoMsg) infoMsg.style.display = 'none';

    cy.edges().forEach(edge => {
        const data = edge.data();
        const strip = createEdgeStrip(data);
        unusedList.appendChild(strip);
    });
}

function createEdgeStrip(data) {
    const strip = document.createElement('div');
    strip.className = 'edge-strip';
    strip.draggable = true;
    strip.dataset.edgeId = data.id;

    const edge = cy.getElementById(data.id);
    if (edge.hasClass('highlighted')) {
        strip.classList.add('highlighted');
    }

    const info = document.createElement('span');
    info.className = 'edge-info';
    const separator = isDirected ? '→' : '-';
    info.textContent = `${data.source} ${separator} ${data.target}`;

    const weight = document.createElement('span');
    weight.className = 'edge-weight';
    weight.textContent = data.weight;

    strip.appendChild(info);
    strip.appendChild(weight);

    strip.addEventListener('click', () => {
        const edge = cy.getElementById(data.id);
        edge.toggleClass('highlighted');
        strip.classList.toggle('highlighted');
    });

    strip.addEventListener('dragstart', (e) => {
        strip.classList.add('dragging');
        e.dataTransfer.setData('text/plain', data.id);
        e.dataTransfer.effectAllowed = 'move';
    });

    strip.addEventListener('dragend', () => {
        strip.classList.remove('dragging');
    });

    return strip;
}

function applyStyles() {
    cy.style()
        .selector('edge')
        .style({
            'target-arrow-shape': isDirected ? 'triangle' : 'none'
        })
        .update();

    const separator = isDirected ? '→' : '-';
    document.querySelectorAll('.edge-strip').forEach(strip => {
        const info = strip.querySelector('.edge-info');
        const edge = cy.getElementById(strip.dataset.edgeId);
        if (edge.length > 0) {
            const data = edge.data();
            info.textContent = `${data.source} ${separator} ${data.target}`;
        }
    });
}
