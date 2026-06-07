let pyodide;
let pyodideReady = false;

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
                visited_nodes.update([u, v])
            else:
                if is_directed:
                    if u not in visited_nodes:
                        return {"error": "指定された辺が連結でない"}
                else:
                    if u not in visited_nodes and v not in visited_nodes:
                        return {"error": "指定された辺が連結でない"}
                
                visited_nodes.update([u, v])
            
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
            
    queue = [(0, start_node, [], [])] # (cost, current_node, path_nodes, path_edges)
    visited = {} # {node: min_cost}
    
    while queue:
        (cost, u, path_nodes, path_edges) = heapq.heappop(queue)
        
        if u in visited and visited[u] <= cost:
            continue
        visited[u] = cost
        
        if u == target_node:
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
        pyodide = await loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.1/full/"
        });
        
        await pyodide.runPythonAsync(pythonCode);
        
        pyodideReady = true;
        calcBtn.disabled = false;
        calcBtn.textContent = "重み合計を計算";
        console.log("Pyodide is ready.");

        const splash = document.querySelector('h1');
        splash.style.opacity = '0';
        splash.style.visibility = 'hidden';
        setTimeout(() => {
            splash.style.display = 'none';
        }, 800);
    } catch (error) {
        console.error("Pyodide initialization failed:", error);
        calcBtn.textContent = "Python起動失敗: " + error.message.substring(0, 10);
        showErrorMessage("Pythonの起動に失敗しました。コンソールを確認してください。\nError: " + error.message);
    }
}
