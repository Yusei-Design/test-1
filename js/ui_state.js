// MARK: - UI State Manager
// 画面遷移やパネルの状態管理（main.jsへの依存を排除）

import { state } from './state.js';
import * as mapManager from './map_manager.js';

// MARK: Update Panel State
export function updateState(newState) {
    const panel = document.getElementById('appPanel');
    panel.classList.remove('state-main', 'state-detail', 'state-route');
    panel.classList.add(`state-${newState}`);
    
    // ルート線消去（メインや詳細に戻った時）
    if (newState === 'main' || newState === 'detail') {
        mapManager.clearRoutePolyline();
    }
    
    // マーカーリセット（メインに戻った時）
    if (newState === 'main') {
        if (state.allMarkersGroup) {
            state.allMarkersGroup.clearLayers();
            state.markers = [];
        }
        mapManager.resetMapView();
    }
    
    // マップサイズ更新（アニメーション後）
    setTimeout(() => {
        mapManager.invalidateMapSize();
    }, 350);
}

// MARK: Scroll Filter Button
// 選択されたフィルタボタンを中央にスクロール
export function scrollFilterButton(id) {
    const container = document.getElementById('platformFilterButtons');
    const buttons = document.querySelectorAll('.filter-chip');
    
    buttons.forEach(btn => {
        btn.classList.remove('active');
        if(btn.dataset.id === id) {
            btn.classList.add('active');
            if (container) {
                const scrollLeft = btn.offsetLeft - (container.clientWidth / 2) + (btn.clientWidth / 2);
                container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
            }
        }
    });
}
