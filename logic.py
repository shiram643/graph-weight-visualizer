# =============================================================================
# [ARCHIVE] グラフ計算ロジック (Python)
# -----------------------------------------------------------------------------
# このファイルは、script.js 内に埋め込まれている Python コードのバックアップです。
# 現在、アプリケーションは script.js 内の文字列から Pyodide を通じて直接実行しており、
# このファイルを直接読み込むことはありません。
# =============================================================================

# '''
# def calculate_sum(edges_list, is_directed, is_discount_mode, gamma):
#     """
#     使用辺のリストを受け取り、連結性をチェックしながら重み合計を計算する。
#     
#     引数:
#     - edges_list (list): JavaScriptから渡される辺データのリスト。各要素は source, target, weight を持つ。
#     - is_directed (bool): 有向グラフとして扱う場合は True、無向グラフは False。
#     - is_discount_mode (bool): 割引率計算モードを適用するかどうか。
#     - gamma (float): 割引率 (0 < γ ≤ 1)。
#     
#     戻り値:
#     - dict: {"formula": "計算式", "total": 合計値} または {"error": "エラーメッセージ"}
#     """
#     if not edges_list:
#         return {"formula": "0", "total": 0}
#
#     visited_nodes = set()
#     total = 0
#     formula_parts = []
#     
#     for i, edge in enumerate(edges_list):
#         try:
#             # データの取得（JSオブジェクトとPython辞書の両方に対応）
#             u = edge.get("source") or getattr(edge, "source", None)
#             v = edge.get("target") or getattr(edge, "target", None)
#             w_val = edge.get("weight") if hasattr(edge, "get") else getattr(edge, "weight", 0)
#             
#             if u is None or v is None: continue
#             
#             # --- 逐次連結性チェック ---
#             if i == 0:
#                 # 最初の辺は無条件で追加し、端点を登録
#                 visited_nodes.update([u, v])
#             else:
#                 # 2本目以降、前の経路と繋がっているか確認
#                 if is_directed:
#                     # 有向: 今回の始点(u)が、これまでのノード集合に含まれている必要がある
#                     if u not in visited_nodes:
#                         return {"error": "指定された辺が連結でない"}
#                 else:
#                     # 無向: 始点(u)か終点(v)のどちらかが、これまでのノード集合に含まれている必要がある
#                     if u not in visited_nodes and v not in visited_nodes:
#                         return {"error": "指定された辺が連結でない"}
#                 
#                 # 到達可能なノード集合を更新
#                 visited_nodes.update([u, v])
#             
#             # --- 重みの計算 ---
#             w = float(w_val) if w_val else 0
#             if is_discount_mode:
#                 # 割引率計算: (γ^i) * weight
#                 multiplier = gamma ** i
#                 val = multiplier * w
#                 total += val
#                 formula_parts.append(f"({gamma}^{i})*{w}")
#             else:
#                 # 通常加算
#                 total += w
#                 formula_parts.append(str(w))
#         except:
#             continue
#             
#     # 結果の整形
#     formula = " + ".join(formula_parts)
#     return {"formula": formula, "total": round(total, 4)}
#
# def find_shortest_path(edges_list, start_node, target_node, is_directed):
#     """
#     ダイクストラ法を用いて、指定された頂点間の最短経路を探索する。
#     
#     引数:
#     - edges_list (list): 全辺データのリスト。
#     - start_node (str): 探索を開始する頂点ID。
#     - target_node (str): 目的地となる頂点ID。
#     - is_directed (bool): 有向グラフとして探索するかどうか。
#     
#     戻り値:
#     - dict: {"edge_ids": [辺IDのリスト]} または {"error": "メッセージ"}
#     """
#     import heapq
#     
#     # グラフの構築 (隣接リスト形式)
#     adj = {}
#     for edge in edges_list:
#         u = edge.get("source") or getattr(edge, "source", None)
#         v = edge.get("target") or getattr(edge, "target", None)
#         w = float(edge.get("weight", 0)) if hasattr(edge, "get") else getattr(edge, "weight", 0)
#         
#         if u not in adj: adj[u] = []
#         adj[u].append((v, w, edge))
#         if not is_directed:
#             if v not in adj: adj[v] = []
#             adj[v].append((u, w, edge))
#             
#     # ダイクストラアルゴリズムの実行
#     queue = [(0, start_node, [], [])] # (現在の合計コスト, 現在の頂点, 通過頂点リスト, 通過辺リスト)
#     visited = {} # 各頂点への最小到達コストを保持
#     
#     while queue:
#         (cost, u, path_nodes, path_edges) = heapq.heappop(queue)
#         
#         if u in visited and visited[u] <= cost:
#             continue
#         visited[u] = cost
#         
#         # 目的地に到達
#         if u == target_node:
#             edge_ids = [e.get("id") or getattr(e, "id", None) for e in path_edges]
#             return {"edge_ids": edge_ids}
#             
#         # 隣接頂点への探索
#         if u in adj:
#             for v, w, edge in adj[u]:
#                 if v not in visited or visited[v] > cost + w:
#                     new_path_edges = path_edges + [edge]
#                     heapq.heappush(queue, (cost + w, v, path_nodes + [u], new_path_edges))
#                     
#     return {"error": f"{start_node}から{target_node}への経路が見つかりません"}
# '''

