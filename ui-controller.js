// カスタムエラーメッセージを表示する関数
function showErrorMessage(message) {
    const container = document.getElementById('custom-error-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'error-toast';
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

/**
 * 計算結果を履歴ウィンドウに追加する
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

    const placeholder = resultContent.querySelector('.placeholder');
    if (placeholder) placeholder.remove();

    resultContent.insertBefore(historyItem, resultContent.firstChild);
    updateHistoryCounter();

    while (resultContent.querySelectorAll('.history-item').length > 10) {
        resultContent.lastChild.remove();
        updateHistoryCounter();
    }
}

function updateHistoryCounter() {
    const count = document.querySelectorAll('#result-content .history-item').length;
    const counter = document.getElementById('history-counter');
    if (counter) {
        counter.textContent = `(${count}/10)`;
    }
}

function updateOrderInfoVisibility() {
    const usedEdgesCount = document.querySelectorAll('#used-edges-list .edge-strip').length;
    const infoMsg = document.getElementById('edge-order-info');
    if (infoMsg) {
        infoMsg.style.display = usedEdgesCount > 0 ? 'block' : 'none';
    }
}
