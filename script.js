let cy;
let isDirected = false;

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
    // パディングを80pxに抑えて表示サイズを拡大し、全体を30px上にずらす
    // 下部パネル（約70px）を避けつつ、画面を有効活用する
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
                    'background-color': '#28a745', // 緑色 (Start)
                    'color': '#ffffff',
                    'text-outline-color': '#28a745'
                }
            },
            {
                selector: 'node[id = "G"]',
                style: {
                    'background-color': '#dc3545', // 赤色 (Goal)
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
                    'line-cap': 'butt',              /* 端を丸めず切り落とす */
                    'target-arrow-color': '#9c27b0',
                    'arrow-scale': 1,               /* 黄色ハイライト(1.0)とサイズを統一 */
                    'target-distance-from-node': '-8px', /* ノードに食い込ませてハミ出しを隠す */
                    'width': 16,                      /* 常に16pxに固定 */
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

    // クリック（タップ）でハイライトを切り替える設定
    cy.on('tap', 'node, edge', function(evt){
        const target = evt.target;
        target.toggleClass('highlighted');

        // 辺の場合、対応する右パネルの帯の状態も同期させる
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

    // レイアウト実行時のオーバーレイ制御
    cy.on('layoutstart', () => {
        document.getElementById('layout-loading').classList.add('active');
    });

    cy.on('layoutstop', () => {
        document.getElementById('layout-loading').classList.remove('active');
        fitGraph(); // レイアウト完了時に独自のフィットを実行
        updateVertexStatusPositions(); // レイアウト終了時にも位置を更新
    });

    // グラフの移動・ズームに合わせて位置を更新
    cy.on('pan zoom position', () => {
        updateVertexStatusPositions();
    });
}

// 頂点に追尾するステータスウィンドウを更新・再配置する関数
function updateVertexStatusPositions() {
    const container = document.getElementById('vertex-status-container');
    if (!container) return;

    cy.nodes().forEach(node => {
        const statusWin = document.querySelector(`.vertex-status-win[data-node-id="${node.id()}"]`);
        if (statusWin) {
            const pos = node.renderedPosition();
            // 頂点の水平中心に揃える（実際の配置はCSSのtranslateX(-50%)で調整）
            statusWin.style.left = `${pos.x}px`;
            statusWin.style.top = `${pos.y - 100}px`;
        }
    });
}

// 任意ステータスの設定処理
function setupVertexStatuses(inputType) {
    const statusName = document.getElementById('custom-label-input').value.trim();
    if (!statusName) {
        showErrorMessage("ステータス名を入力してください。");
        return;
    }

    const container = document.getElementById('vertex-status-container');
    // 既存のウィンドウをクリア（新しいステータスを設定する場合）
    container.innerHTML = '';

    cy.nodes().forEach(node => {
        const statusWin = document.createElement('div');
        statusWin.className = 'vertex-status-win';
        statusWin.dataset.nodeId = node.id();
        statusWin.style.pointerEvents = 'auto'; // 入力可能にする

        const label = document.createElement('div');
        label.className = 'status-label';
        label.textContent = `${statusName}:`;

        const input = document.createElement('input');
        input.type = inputType; // 'number' か 'text'
        input.className = 'status-input';
        input.placeholder = inputType === 'number' ? '0' : '入力する';

        statusWin.appendChild(label);
        statusWin.appendChild(input);
        container.appendChild(statusWin);
    });

    updateVertexStatusPositions();
}

function updateGraph() {
    // 任意ステータスの設定をリセット
    const statusContainer = document.getElementById('vertex-status-container');
    if (statusContainer) statusContainer.innerHTML = '';
    const statusInput = document.getElementById('custom-label-input');
    if (statusInput) statusInput.value = '';

    // ステータス表示を「グラフ生成中」に変更
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
            // 数値でない場合は0として扱う
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
                    weight: 0 // 未入力時は0
                }
            });
        }
    });

    cy.elements().remove();
    cy.add(elements);
    applyStyles(); // 方向の設定を適用
    cy.layout(layoutConfig).run();
    updateEdgeLists(); // 右パネルの辺リストを更新
}

function updateEdgeLists() {
    const unusedList = document.getElementById('unused-edges-list');
    const usedList = document.getElementById('used-edges-list');
    const infoMsg = document.getElementById('edge-order-info');
    
    // リストをクリア
    unusedList.innerHTML = '';
    usedList.innerHTML = '';
    if (infoMsg) infoMsg.style.display = 'none'; // メッセージを隠す

    // Cytoscapeから辺のデータを取得して「未使用辺」に追加
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

    // グラフ上の状態と初期同期
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

    // クリックでハイライトをトグル（グラフと同期）
    strip.addEventListener('click', () => {
        const edge = cy.getElementById(data.id);
        edge.toggleClass('highlighted');
        strip.classList.toggle('highlighted');
    });

    // ドラッグ開始
    strip.addEventListener('dragstart', (e) => {
        strip.classList.add('dragging');
        e.dataTransfer.setData('text/plain', data.id);
        e.dataTransfer.effectAllowed = 'move';
    });

    // ドラッグ終了
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

    // 右パネルの帯の矢印/線を更新
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

window.addEventListener('DOMContentLoaded', () => {
    initCytoscape();
    updateGraph();
    initPyodide(); // Pyodideの初期化を開始

    document.getElementById('update-btn').addEventListener('click', updateGraph);
    
    document.getElementById('direction-toggle').addEventListener('change', (e) => {
        isDirected = e.target.checked;
        applyStyles();
    });

    // 重みなし切り替え
    document.getElementById('no-weight-toggle').addEventListener('change', (e) => {
        const isNoWeight = e.target.checked;
        const mask = document.getElementById('no-weight-mask');
        const statusLabel = document.getElementById('weight-status-label');
        const resultWindow = document.getElementById('result-window');
        
        if (isNoWeight) {
            mask.classList.add('active');
            if (statusLabel) statusLabel.textContent = "重みなし";
            if (resultWindow) resultWindow.classList.add('transparent-mode');
            // グラフの重みラベルを非表示にする
            cy.style().selector('edge').style({
                'label': ''
            }).update();
        } else {
            mask.classList.remove('active');
            if (statusLabel) statusLabel.textContent = "重みあり";
            if (resultWindow) resultWindow.classList.remove('transparent-mode');
            // グラフの重みラベルを再表示する
            cy.style().selector('edge').style({
                'label': 'data(weight)'
            }).update();
        }
    });

    document.getElementById('fit-btn').addEventListener('click', () => {
        fitGraph();
    });

    document.getElementById('layout-btn').addEventListener('click', () => {
        // ステータス表示を「再配置中」に変更
        const loadingText = document.querySelector('.loading-text');
        if (loadingText) loadingText.textContent = "再配置中";
        cy.layout(layoutConfig).run();
    });

    // ハイライト解除ボタンのイベント
    document.getElementById('clear-highlights-btn').addEventListener('click', () => {
        // グラフ上のハイライトを解除
        cy.elements().removeClass('highlighted');
        cy.elements().removeClass('path-purple');
        
        // サイドパネル（帯）のハイライトを解除
        document.querySelectorAll('.edge-strip').forEach(strip => {
            strip.classList.remove('highlighted');
            strip.classList.remove('calculated');
        });
    });

    // 任意ステータスの設定ボタン
    document.getElementById('set-numeric-btn').addEventListener('click', () => setupVertexStatuses('number'));
    document.getElementById('set-string-btn').addEventListener('click', () => setupVertexStatuses('text'));

    // ズーム操作のロジック
    const zoomInput = document.getElementById('zoom-input');
    
    // ズーム率を更新する補助関数
    const updateZoomDisplay = () => {
        const zoomLevel = cy.zoom();
        zoomInput.value = Math.round(zoomLevel * 100);
    };

    document.getElementById('zoom-out-btn').addEventListener('click', () => {
        cy.zoom(cy.zoom() * 0.8);
        updateZoomDisplay();
    });

    document.getElementById('zoom-in-btn').addEventListener('click', () => {
        cy.zoom(cy.zoom() * 1.2);
        updateZoomDisplay();
    });

    zoomInput.addEventListener('change', () => {
        let val = parseFloat(zoomInput.value);
        if (isNaN(val) || val < 1) val = 1;
        if (val > 1000) val = 1000;
        cy.zoom(val / 100);
        cy.center(); // 入力時は中央に寄せる
    });

    // マウスホイール等の操作時にも数値を同期
    cy.on('zoom', () => {
        updateZoomDisplay();
    });

    // 最短路探索ボタンのイベント
    const shortestPathBtn = document.getElementById('shortest-path-btn');
    shortestPathBtn.addEventListener('click', async () => {
        if (!pyodideReady) {
            showErrorMessage("Pythonの準備中です。少々お待ちください。");
            return;
        }

        const isDiscountMode = document.getElementById('mode-toggle').checked;
        if (isDiscountMode) {
            // 割引率モード時のエラー表示
            addHistoryItem({ error: "割引率ありの探索方法は実装されていません" });
            return;
        }

        const startNode = document.getElementById('start-vertex').value.trim();
        const targetNode = document.getElementById('target-vertex').value.trim();

        if (!startNode || !targetNode) {
            showErrorMessage("始点と終点を入力してください。");
            return;
        }

        // 全辺のデータをPythonに渡す
        const allEdges = cy.edges().map(e => e.data());
        
        try {
            const pyEdges = pyodide.toPy(allEdges);
            const resultProxy = pyodide.globals.get('find_shortest_path')(pyEdges, startNode, targetNode, isDirected);
            const result = resultProxy.toJs({dict_converter: Object.fromEntries});
            
            // 既存のノードハイライトを一旦クリア
            cy.nodes('.path-purple').removeClass('path-purple');

            if (result.error) {
                // エラー表示（履歴にも追加）
                addHistoryItem({ error: result.error });
                return;
            }

            // 成功時: 始点と終点を紫色にハイライト
            const startElem = cy.getElementById(startNode);
            const targetElem = cy.getElementById(targetNode);
            if (startElem.length > 0) startElem.addClass('path-purple');
            if (targetElem.length > 0) targetElem.addClass('path-purple');

            // 該当する辺を「使用辺」リストに移動
            const usedList = document.getElementById('used-edges-list');
            const unusedList = document.getElementById('unused-edges-list');
            
            // 一旦、現在の使用辺をすべて未使用に戻す（リセットして最短路のみにする）
            const currentUsed = usedList.querySelectorAll('.edge-strip');
            currentUsed.forEach(s => unusedList.appendChild(s));

            // 最短路の辺を順番に「使用辺」に移動
            result.edge_ids.forEach(id => {
                const strip = document.querySelector(`.edge-strip[data-edge-id="${id}"]`);
                if (strip) {
                    usedList.appendChild(strip);
                }
            });

            updateOrderInfoVisibility();
            
            // 重みの合計計算を自動実行（フラグを立てて黄色にする）
            window._isShortestPathResult = true;
            document.getElementById('calc-sum-btn').click();
            window._isShortestPathResult = false;

            // メモリ解放
            pyEdges.destroy();
            resultProxy.destroy();

        } catch (error) {
            console.error(error);
            addHistoryItem({ error: `探索エラー: ${error.message}` });
        }
    });

    // 左サイドパネルの開閉
    const sidebarLeft = document.getElementById('sidebar-left');
    const toggleLeft = document.getElementById('toggle-left');
    toggleLeft.addEventListener('click', () => {
        sidebarLeft.classList.toggle('closed');
        toggleLeft.textContent = sidebarLeft.classList.contains('closed') ? '▶' : '◀';
    });

    // 右サイドパネルの開閉
    const sidebarRight = document.getElementById('sidebar-right');
    const toggleRight = document.getElementById('toggle-right');
    toggleRight.addEventListener('click', () => {
        sidebarRight.classList.toggle('closed');
        toggleRight.textContent = sidebarRight.classList.contains('closed') ? '◀' : '▶';
    });

    // 右パネルのリサイズ機能
    const resizer = document.getElementById('resizer-h');
    const panelTop = document.getElementById('panel-top');
    const container = resizer.parentElement;
    let isDragging = false;

    resizer.addEventListener('mousedown', (e) => {
        isDragging = true;
        resizer.classList.add('dragging');
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';
        document.getElementById('cy').style.pointerEvents = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const containerRect = container.getBoundingClientRect();
        const relativeY = e.clientY - containerRect.top;
        const newHeight = Math.max(50, Math.min(relativeY, containerRect.height - 50));
        panelTop.style.flex = 'none';
        panelTop.style.height = `${newHeight}px`;
    });

    document.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;
        resizer.classList.remove('dragging');
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
        document.getElementById('cy').style.pointerEvents = 'auto';
    });

    // ドラッグ＆ドロップのドロップ先設定
    const edgeLists = document.querySelectorAll('.edge-list-container');
    edgeLists.forEach(list => {
        list.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            list.classList.add('drag-over');
        });

        list.addEventListener('dragleave', () => {
            list.classList.remove('drag-over');
        });

        list.addEventListener('drop', (e) => {
            e.preventDefault();
            list.classList.remove('drag-over');
            const edgeId = e.dataTransfer.getData('text/plain');
            const draggingElement = document.querySelector(`.edge-strip[data-edge-id="${edgeId}"]`);
            if (draggingElement) {
                list.appendChild(draggingElement);
                updateOrderInfoVisibility(); // メッセージ更新
            }
        });
    });

    // 「使用辺」エリアのメッセージ表示制御
    function updateOrderInfoVisibility() {
        const usedEdgesCount = document.querySelectorAll('#used-edges-list .edge-strip').length;
        const infoMsg = document.getElementById('edge-order-info');
        if (infoMsg) {
            infoMsg.style.display = usedEdgesCount > 0 ? 'block' : 'none';
        }
    }

    // 「重み合計」計算機能 (Pythonを使用)
    const calcBtn = document.getElementById('calc-sum-btn');
    calcBtn.addEventListener('click', async () => {
        if (!pyodideReady) {
            showErrorMessage("Pythonの準備中です。少々お待ちください。");
            return;
        }

        const usedEdges = document.querySelectorAll('#used-edges-list .edge-strip');
        
        if (usedEdges.length === 0) {
            // 履歴がリセットされないよう、単一の項目として追加
            addHistoryItem({ error: "使用辺がありません" });
            return;
        }

        // 既存の計算用ハイライト（紫色）をクリア
        document.querySelectorAll('.edge-strip.calculated').forEach(s => s.classList.remove('calculated'));
        cy.edges('.path-purple').removeClass('path-purple');
        
        // 最短路探索の結果表示でない場合のみ、ノードのハイライトもクリアする
        if (!window._isShortestPathResult) {
            cy.nodes('.path-purple').removeClass('path-purple');
        }

        // Pythonに渡すためのデータを準備
        const edgesData = Array.from(usedEdges).map(strip => {
            const edgeId = strip.dataset.edgeId;
            const edge = cy.getElementById(edgeId);
            
            // 紫色のアウトラインを追加（黄色ハイライトは維持）
            strip.classList.add('calculated');
            edge.addClass('path-purple');

            return edge.data();
        });

        const isDiscountMode = document.getElementById('mode-toggle').checked;
        const gamma = parseFloat(document.getElementById('gamma-input').value) || 1.0;

        try {
            // JSオブジェクトをPythonオブジェクトに明示的に変換
            const pyEdges = pyodide.toPy(edgesData);
            
            // Python関数の呼び出し (isDirected, mode, gammaも渡す)
            const resultProxy = pyodide.globals.get('calculate_sum')(pyEdges, isDirected, isDiscountMode, gamma);
            const result = resultProxy.toJs({dict_converter: Object.fromEntries});
            
            // 履歴に追加
            addHistoryItem(result, window._isShortestPathResult);

            updateOrderInfoVisibility();

            // メモリ解放
            pyEdges.destroy();
            resultProxy.destroy();
            
        } catch (error) {
            console.error(error);
            addHistoryItem({ error: `計算エラー: ${error.message}` });
        }
    });

    /**
     * 計算結果を履歴ウィンドウに追加する
     * @param {Object} result - Pythonからの戻り値 {formula, total, error}
     * @param {boolean} isShortestPath - 最短路自動探索の結果かどうか
     */
    function addHistoryItem(result, isShortestPath = false) {
        const resultContent = document.getElementById('result-content');
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        
        if (result.error) {
            historyItem.innerHTML = `
                <button class="delete-btn" title="削除">×</button>
                <p style="color: #5c1a1a; font-weight: bold; text-align: center; margin: 0;">${result.error}</p>
            `;
        } else {
            const tagHtml = isShortestPath ? '<div class="history-tag">最短路自動探索</div>' : '<div></div>';
            historyItem.innerHTML = `
                <button class="delete-btn" title="削除">×</button>
                <div class="formula-text">${result.formula}</div>
                <div class="result-row">
                    ${tagHtml}
                    <div class="result-text">= ${result.total}</div>
                </div>
            `;
        }

        // プレースホルダーを削除
        const placeholder = resultContent.querySelector('.placeholder');
        if (placeholder) placeholder.remove();

        // 先頭に追加
        resultContent.insertBefore(historyItem, resultContent.firstChild);
        updateHistoryCounter();

        // 最大10個までに制限
        while (resultContent.querySelectorAll('.history-item').length > 10) {
            resultContent.lastChild.remove();
            updateHistoryCounter();
        }
    }

    // 履歴カウンタの更新
    function updateHistoryCounter() {
        const count = document.querySelectorAll('#result-content .history-item').length;
        const counter = document.getElementById('history-counter');
        if (counter) {
            counter.textContent = `(${count}/10)`;
        }
    }

    // 削除ボタンの共通処理（既存の削除イベントを修正してカウンタを呼ぶ）
    // ※ script.js内で動的に生成されるアイテムに対しても対応
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const historyItem = e.target.closest('.history-item');
            if (historyItem) {
                const resultContent = document.getElementById('result-content');
                historyItem.remove();
                if (resultContent.children.length === 0) {
                    resultContent.innerHTML = '<p class="placeholder">計算結果がここに表示されます</p>';
                }
                updateHistoryCounter();
            }
        }
    });

    // フローティングウィンドウのドラッグ機能
    const resultWindow = document.getElementById('result-window');
    const windowHeader = document.getElementById('result-window-header');
    let isWindowDragging = false;
    let offset = { x: 0, y: 0 };

    windowHeader.addEventListener('mousedown', (e) => {
        isWindowDragging = true;
        offset.x = e.clientX - resultWindow.offsetLeft;
        offset.y = e.clientY - resultWindow.offsetTop;
        resultWindow.style.transition = 'none'; // ドラッグ中はアニメーション無効
    });

    // γ入力のバリデーション
    const gammaInput = document.getElementById('gamma-input');
    const gammaWarning = document.getElementById('gamma-warning');

    gammaInput.addEventListener('input', () => {
        const val = parseFloat(gammaInput.value);
        if (isNaN(val) || val <= 0 || val > 1) {
            gammaWarning.style.display = 'block';
            gammaInput.style.borderColor = '#dc3545';
        } else {
            gammaWarning.style.display = 'none';
            gammaInput.style.borderColor = '#ced4da';
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (!isWindowDragging) return;
        
        const newX = e.clientX - offset.x;
        const newY = e.clientY - offset.y;
        
        resultWindow.style.left = `${newX}px`;
        resultWindow.style.top = `${newY}px`;
        resultWindow.style.bottom = 'auto'; // bottom指定を解除
        resultWindow.style.right = 'auto';  // right指定を解除
    });

    document.addEventListener('mouseup', () => {
        isWindowDragging = false;
    });
});

let pyodide;
let pyodideReady = false;

// カスタムエラーメッセージを表示する関数
function showErrorMessage(message) {
    const container = document.getElementById('custom-error-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'error-toast';
    toast.textContent = message;

    container.appendChild(toast);

    // アニメーション終了後に削除（3.0s = slideDown 0.3s + fadeOut 0.3s + delay 2.4s）
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Pythonコードを直接埋め込み（file:// プロトコル対策）
const pythonCode = `
def calculate_sum(edges_list, is_directed, is_discount_mode, gamma):
    if not edges_list:
        return {"formula": "0", "total": 0}

    visited_nodes = set()
    total = 0
    formula_parts = []
    
    for i, edge in enumerate(edges_list):
        try:
            # データの取得
            u = edge.get("source") or getattr(edge, "source", None)
            v = edge.get("target") or getattr(edge, "target", None)
            w_val = edge.get("weight") if hasattr(edge, "get") else getattr(edge, "weight", 0)
            
            if u is None or v is None: continue
            
            # 逐次連結性チェック
            if i == 0:
                # 1本目は無条件でOK。ノードを登録
                visited_nodes.update([u, v])
            else:
                # 2本目以降のチェック
                if is_directed:
                    # 有向: 今回の始点(u)が、これまでの辺のいずれかのノード(visited_nodes)に含まれている必要がある
                    if u not in visited_nodes:
                        return {"error": "指定された辺が連結でない"}
                else:
                    # 無向: 始点(u)か終点(v)のどちらかが、これまでのノードに含まれている必要がある
                    if u not in visited_nodes and v not in visited_nodes:
                        return {"error": "指定された辺が連結でない"}
                
                # 到達可能なノードを更新
                visited_nodes.update([u, v])
            
            # 重みの計算
            try:
                import math
                w = float(w_val) if w_val is not None and w_val != "" else 0
                if math.isnan(w): w = 0
            except:
                w = 0
            
            if is_discount_mode:
                multiplier = gamma ** i
                val = multiplier * w
                total += val
                formula_parts.append(f"({gamma}^{i})*{w}")
            else:
                total += w
                formula_parts.append(str(w))
        except:
            continue
            
    formula = " + ".join(formula_parts)
    return {"formula": formula, "total": round(total, 4)}

def find_shortest_path(edges_list, start_node, target_node, is_directed):
    import heapq
    
    # グラフの構築
    adj = {}
    for edge in edges_list:
        u = edge.get("source") or getattr(edge, "source", None)
        v = edge.get("target") or getattr(edge, "target", None)
        w_val = edge.get("weight") if hasattr(edge, "get") else getattr(edge, "weight", 0)
        w = float(w_val) if w_val else 0
        
        if u not in adj: adj[u] = []
        adj[u].append((v, w, edge))
        if not is_directed:
            if v not in adj: adj[v] = []
            adj[v].append((u, w, edge))
            
    # ダイクストラ法
    queue = [(0, start_node, [], [])] # (cost, current_node, path_nodes, path_edges)
    visited = {} # {node: min_cost}
    
    while queue:
        (cost, u, path_nodes, path_edges) = heapq.heappop(queue)
        
        if u in visited and visited[u] <= cost:
            continue
        visited[u] = cost
        
        if u == target_node:
            # 辺のIDのリストを返す
            edge_ids = [e.get("id") or getattr(e, "id", None) for e in path_edges]
            return {"edge_ids": edge_ids}
            
        if u in adj:
            for v, w, edge in adj[u]:
                if v not in visited or visited[v] > cost + w:
                    new_path_edges = path_edges + [edge]
                    heapq.heappush(queue, (cost + w, v, path_nodes + [u], new_path_edges))
                    
    return {"error": f"{start_node}から{target_node}への経路が見つかりません"}
`;

async function initPyodide() {
    const calcBtn = document.getElementById('calc-sum-btn');
    calcBtn.disabled = true;
    calcBtn.textContent = "Python起動中...";

    try {
        // Pyodideのロード（indexURLを指定して安定させる）
        pyodide = await loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.1/full/"
        });
        
        // 埋め込んだコードを実行
        await pyodide.runPythonAsync(pythonCode);
        
        pyodideReady = true;
        calcBtn.disabled = false;
        calcBtn.textContent = "重み合計を計算";
        console.log("Pyodide is ready.");

        // 見出し（スプラッシュ画面）を非表示にする
        const splash = document.querySelector('h1');
        splash.style.opacity = '0';
        splash.style.visibility = 'hidden';
        // transition完了後に完全に操作不可にする
        setTimeout(() => {
            splash.style.display = 'none';
        }, 800);
    } catch (error) {
        console.error("Pyodide initialization failed:", error);
        calcBtn.textContent = "Python起動失敗: " + error.message.substring(0, 10);
        // 詳細なエラーをアラートで表示（デバッグ用）
        showErrorMessage("Pythonの起動に失敗しました。コンソールを確認してください。\nError: " + error.message);
    }
}
