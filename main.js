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
            cy.style().selector('edge').style({
                'label': ''
            }).update();
        } else {
            mask.classList.remove('active');
            if (statusLabel) statusLabel.textContent = "重みあり";
            if (resultWindow) resultWindow.classList.remove('transparent-mode');
            cy.style().selector('edge').style({
                'label': 'data(weight)'
            }).update();
        }
    });

    document.getElementById('fit-btn').addEventListener('click', () => {
        fitGraph();
    });

    document.getElementById('layout-btn').addEventListener('click', () => {
        const loadingText = document.querySelector('.loading-text');
        if (loadingText) loadingText.textContent = "再配置中";
        cy.layout(layoutConfig).run();
    });

    // ハイライト解除ボタンのイベント
    document.getElementById('clear-highlights-btn').addEventListener('click', () => {
        cy.elements().removeClass('highlighted');
        cy.elements().removeClass('path-purple');
        document.querySelectorAll('.edge-strip').forEach(strip => {
            strip.classList.remove('highlighted');
            strip.classList.remove('calculated');
        });
    });

    // 任意ステータスの設定ボタン
    document.getElementById('add-status-btn').addEventListener('click', addVertexStatus);

    // ズーム操作のロジック
    const zoomInput = document.getElementById('zoom-input');
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
        cy.center();
    });

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
            addHistoryItem({ error: "割引率ありの探索方法は実装されていません" });
            return;
        }

        const startNode = document.getElementById('start-vertex').value.trim();
        const targetNode = document.getElementById('target-vertex').value.trim();

        if (!startNode || !targetNode) {
            showErrorMessage("始点と終点を入力してください。");
            return;
        }

        const allEdges = cy.edges().map(e => e.data());
        
        try {
            const pyEdges = pyodide.toPy(allEdges);
            const resultProxy = pyodide.globals.get('find_shortest_path')(pyEdges, startNode, targetNode, isDirected);
            const result = resultProxy.toJs({dict_converter: Object.fromEntries});
            
            if (result.error) {
                addHistoryItem({ error: result.error });
                return;
            }

            const usedList = document.getElementById('used-edges-list');
            const unusedList = document.getElementById('unused-edges-list');
            
            const currentUsed = usedList.querySelectorAll('.edge-strip');
            currentUsed.forEach(s => unusedList.appendChild(s));

            result.edge_ids.forEach(id => {
                const strip = document.querySelector(`.edge-strip[data-edge-id="${id}"]`);
                if (strip) {
                    usedList.appendChild(strip);
                }
            });

            updateOrderInfoVisibility();
            
            window._isShortestPathResult = true;
            document.getElementById('calc-sum-btn').click();
            window._isShortestPathResult = false;

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
    let startY, startHeight;

    resizer.addEventListener('mousedown', (e) => {
        isDragging = true;
        startY = e.clientY;
        startHeight = panelTop.offsetHeight;
        resizer.classList.add('dragging');
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';
        document.getElementById('cy').style.pointerEvents = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const containerRect = container.getBoundingClientRect();
        const resizerHeight = 16; 
        
        // 最小サイズをコンテナの縦幅の16%に設定
        const minPanelHeight = containerRect.height * 0.16; 
        
        // マウスの移動量から新しい高さを計算
        const deltaY = e.clientY - startY;
        let newHeight = startHeight + deltaY;
        
        // 下部パネルも16%を確保できるように制限
        const maxTopHeight = containerRect.height - minPanelHeight - resizerHeight;
        
        newHeight = Math.max(minPanelHeight, Math.min(newHeight, maxTopHeight));
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
                updateOrderInfoVisibility();
            }
        });
    });

    // 「重み合計」計算機能
    const calcBtn = document.getElementById('calc-sum-btn');
    calcBtn.addEventListener('click', async () => {
        if (!pyodideReady) {
            showErrorMessage("Pythonの準備中です。少々お待ちください。");
            return;
        }

        const usedEdges = document.querySelectorAll('#used-edges-list .edge-strip');
        
        if (usedEdges.length === 0) {
            addHistoryItem({ error: "使用辺がありません" });
            return;
        }

        document.querySelectorAll('.edge-strip.calculated').forEach(s => s.classList.remove('calculated'));
        // 既存の紫ハイライト（エッジ・ノード両方）を一括解除
        cy.elements('.path-purple').removeClass('path-purple');

        const edgesData = Array.from(usedEdges).map(strip => {
            const edgeId = strip.dataset.edgeId;
            const edge = cy.getElementById(edgeId);
            strip.classList.add('calculated');
            
            // エッジと、それに接続する全ノードを紫ハイライト
            edge.addClass('path-purple');
            edge.connectedNodes().addClass('path-purple');
            
            return edge.data();
        });

        const isDiscountMode = document.getElementById('mode-toggle').checked;
        const gamma = parseFloat(document.getElementById('gamma-input').value) || 1.0;

        try {
            const pyEdges = pyodide.toPy(edgesData);
            const resultProxy = pyodide.globals.get('calculate_sum')(pyEdges, isDirected, isDiscountMode, gamma);
            const result = resultProxy.toJs({dict_converter: Object.fromEntries});
            
            addHistoryItem(result, window._isShortestPathResult);
            updateOrderInfoVisibility();

            pyEdges.destroy();
            resultProxy.destroy();
            
        } catch (error) {
            console.error(error);
            addHistoryItem({ error: `計算エラー: ${error.message}` });
        }
    });

    // 履歴アイテムの削除イベント
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
        resultWindow.style.transition = 'none';
    });

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
        resultWindow.style.bottom = 'auto';
        resultWindow.style.right = 'auto';
    });

    document.addEventListener('mouseup', () => {
        isWindowDragging = false;
    });
});
