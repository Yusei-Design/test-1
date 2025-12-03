// MARK: - UI State Manager
// 画面遷移やパネルの状態管理

import { state } from './state.js';
import * as mapManager from './map_manager.js';
import { doSearch, renderPlatforms } from './main.js'; // 循環参照回避のためmainからインポート

// MARK: Update Panel State
export function updateState(newState) {
    const panel = document.getElementById('appPanel');
    panel.classList.remove('state-main', 'state-detail', 'state-route');
    panel.classList.add(`state-${newState}`);
    
    // ルート線消去
    if (newState === 'main' || newState === 'detail') {
        mapManager.clearRoutePolyline();
    }
    
    // メインに戻った時のリセット処理
    if (newState === 'main') {
        const dInput = document.getElementById('detailSearchInput');
        if(dInput) dInput.value = '';
        const sInput = document.getElementById('searchKeyword');
        if(sInput) doSearch(sInput.value.trim());
        
        // マーカーリセット
        if (state.allMarkersGroup) {
            state.allMarkersGroup.clearLayers();
            state.markers = [];
        }
    }
    
    // マップサイズ更新（アニメーション後）
    setTimeout(() => {
        mapManager.invalidateMapSize();
    }, 350);
}

// MARK: Go Back Logic
export function goBack() {
    const panel = document.getElementById('appPanel');
    
    // ルート詳細 -> 停留所詳細
    if (panel.classList.contains('state-route')) {
        updateState('detail');
        
        // マップを停留所へズーム
        if (state.currentStopDataMap) {
            const stops = Object.values(state.currentStopDataMap).map(item => item.stop);
            if (stops.length > 0) {
                const latLngs = stops.map(s => [s.lat, s.lon]);
                state.map.fitBounds(latLngs, { padding: [80, 80] });
            }
        }
        
        // リストとマーカーの状態を再描画して復元
        renderPlatforms();

    // 停留所詳細 -> メイン
    } else if (panel.classList.contains('state-detail')) {
        updateState('main');
        mapManager.resetMapView();
    }
}

// MARK: Scroll Filter Button
export function scrollFilterButton(id) {
    const container = document.getElementById('platformFilterButtons');
    const buttons = document.querySelectorAll('.filter-chip');
    
    buttons.forEach(btn => {
        btn.classList.remove('active');
        if(btn.getAttribute('data-id') === id) {
            btn.classList.add('active');
            if (container) {
                const scrollLeft = btn.offsetLeft - (container.clientWidth / 2) + (btn.clientWidth / 2);
                container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
            }
        }
    });
}