// MARK: - Main Entry Point
// アプリケーションの司令塔。各モジュールを統合し、イベントを処理する。

import { state } from './state.js';
import * as utils from './utils.js';
import * as components from './components.js';
import * as mapManager from './map_manager.js';
import * as busLogic from './bus_logic.js';
import * as uiState from './ui_state.js';

// MARK: - Init
window.onload = function() {
    // 地図の初期化
    mapManager.initMap();

    // イベントリスナーの一括登録
    setupGlobalEvents();

    // データ展開確認 (index.htmlでの読み込みチェック)
    if(typeof window.GTFS_DATA !== 'undefined') {
        window.GTFS_DATA.forEach(s => state.stopIdMap[s.id] = s);
        doSearch(''); // 初期表示（お気に入りリスト等）
    } else {
        console.error('GTFS Data not loaded. Check index.html bridge script.');
    }
};

// MARK: - Global Events Setup
// HTML側に onclick="" を書かず、ここで一括してイベントを設定する
function setupGlobalEvents() {
    // 検索入力 (メイン)
    const searchInput = document.getElementById('searchKeyword');
    if (searchInput) {
        searchInput.addEventListener('keyup', (e) => {
            doSearch(e.target.value.trim());
        });
    }

    // 詳細検索入力 (絞り込み)
    const detailInput = document.getElementById('detailSearchInput');
    if (detailInput) {
        detailInput.addEventListener('keyup', (e) => {
            filterByDest(e.target.value.trim());
        });
    }

    // 戻るボタン (Main/Detail/Route共通)
    const backBtns = document.querySelectorAll('.nav-circle-btn');
    backBtns.forEach(btn => {
        // テキストで判定して戻るボタンのみに付与
        if(btn.textContent === '＜') {
            btn.addEventListener('click', goBack);
        }
    });

    // お気に入りボタン
    const favBtn = document.getElementById('btnFav');
    if (favBtn) {
        favBtn.addEventListener('click', toggleFavorite);
    }

    // のりばクローズアップボタン (動的に生成される場合もあるが、nav内なら固定で存在想定)
    const zoomBtn = document.querySelector('.nav-capsule-btn');
    if(zoomBtn) {
        zoomBtn.addEventListener('click', zoomToBusStop);
    }
}

// MARK: - Navigation Logic
function goBack() {
    const panel = document.getElementById('appPanel');
    
    // ルート詳細 -> 停留所詳細
    if (panel.classList.contains('state-route')) {
        uiState.updateState('detail');
        
        // 停留所位置へマップを再ズーム
        if (state.currentStopDataMap) {
            const stops = Object.values(state.currentStopDataMap).map(item => item.stop);
            if (stops.length > 0) {
                const latLngs = stops.map(s => [s.lat, s.lon]);
                state.map.fitBounds(latLngs, { padding: [80, 80] });
            }
        }
        
        // リストとマーカーの状態を再描画して復元
        renderPlatforms();

    // 停留所詳細 -> メイン（検索）
    } else if (panel.classList.contains('state-detail')) {
        uiState.updateState('main');
        
        // 入力欄リセット
        const dInput = document.getElementById('detailSearchInput');
        if(dInput) dInput.value = '';
        const sInput = document.getElementById('searchKeyword');
        if(sInput) doSearch(sInput.value.trim());
    }
}

// MARK: - Search Functions
export function doSearch(keyword) {
    const container = document.getElementById('listMain');
    const emptyMsg = document.getElementById('msgEmpty') || document.querySelector('.empty-msg');
    
    container.innerHTML = '';
    
    // ロジック呼び出し
    const searchResult = busLogic.searchStops(keyword);
    
    // エラーガード
    if (!searchResult || !searchResult.results) return;
    
    // 結果なし / お気に入りなしの場合
    if (searchResult.results.length === 0) {
        if (searchResult.isFavorite && keyword === '') {
            if(emptyMsg) emptyMsg.style.display = 'block';
        } else {
            if(emptyMsg) emptyMsg.style.display = 'none';
        }
        return;
    }

    if(emptyMsg) emptyMsg.style.display = 'none';

    // お気に入りラベルの表示
    if (searchResult.isFavorite && keyword === '') {
        const labelDiv = document.createElement('div');
        labelDiv.innerHTML = components.createSectionLabelHTML('お気に入りのバス停');
        if (labelDiv.firstElementChild) {
            container.appendChild(labelDiv.firstElementChild);
        }
    }

    // リスト生成
    searchResult.results.forEach(item => {
        const el = components.createListItemElement(item.name, item.stops.length, () => {
            selectGroup(item.name, item.stops);
        });
        container.appendChild(el);
    });
}

// MARK: - Detail View Functions
function selectGroup(name, stops) {
    state.currentViewingStopName = name;
    
    // 地図更新 & クリック時の絞り込み連携
    mapManager.updateMarkersForDetail(stops, (stopId) => {
        setPlatformFilter(stopId);
    });

    updateFavButtonState();

    if (typeof window.TIMETABLE_DATA === 'undefined') return;

    // データ構造化
    const stopDataMap = {}; 
    const routesMap = new Map();

    stops.forEach(stop => {
        const times = window.TIMETABLE_DATA[stop.id] || [];
        stopDataMap[stop.id] = { stop, times };
        
        times.forEach(data => {
            const routeInfo = window.ROUTE_LIST[data[5]];
            const ln = routeInfo.n.replace('市バス', '');
            if(!routesMap.has(ln)) {
                routesMap.set(ln, { c: routeInfo.c, tc: routeInfo.t });
            }
        });
    });

    // --- DOM構築 ---
    const viewDetail = document.getElementById('viewDetail');
    viewDetail.innerHTML = ''; 

    // 1. タイトル
    viewDetail.appendChild(components.createDetailHeaderElement(name));

    // 2. 系統タグ
    viewDetail.appendChild(components.createTagContainer(routesMap, (route) => {
        setRouteFilter(route);
    }));

    // 3. フィルタボタン（のりば選択）
    const sortedStops = [...stops].sort((a,b) => (a.desc || '').localeCompare(b.desc || ''));
    viewDetail.appendChild(components.createFilterCarousel(sortedStops, (id) => {
        setPlatformFilter(id);
    }));

    // 4. リストコンテナ
    const listDiv = document.createElement('div');
    listDiv.id = 'platformList';
    viewDetail.appendChild(listDiv);
    
    // 状態セット
    state.currentStopDataMap = stopDataMap;
    state.currentFilter = { platformId: 'ALL', destKeyword: '', targetStopIds: null, route: 'ALL' };
    
    uiState.updateState('detail');
    renderPlatforms();
}

// MARK: - Filter & Render Platforms
export function renderPlatforms() {
    const filter = state.currentFilter;
    const container = document.getElementById('platformList');
    if (!container) return;
    
    container.innerHTML = '';
    
    // 一旦マーカーをリセット
    mapManager.resetMarkersStyle();
    
    const now = new Date();
    const currentMin = now.getHours() * 60 + now.getMinutes();
    const dayIndex = now.getDay(); 

    let hasBus = false;

    Object.values(state.currentStopDataMap).forEach(({ stop, times }) => {
        // のりばフィルタ
        if (filter.platformId !== 'ALL' && stop.id !== filter.platformId) return;
        
        // ロジックにて表示対象のバスを取得
        const nextBuses = busLogic.getDisplayBusesForStop(stop, times, currentMin, dayIndex);

        if (nextBuses.length === 0) return;
        hasBus = true;

        // 対象のりばのマーカーを黒くする（追加）
        mapManager.setMarkerActive(stop.id);

        // のりば見出し
        const labelDiv = document.createElement('div');
        labelDiv.innerHTML = components.createSectionLabelHTML(`のりば ${stop.desc || '不明'}`);
        if (labelDiv.firstElementChild) {
            container.appendChild(labelDiv.firstElementChild);
        }

        // バスカード生成
        nextBuses.forEach(bus => {
            const tripId = window.TRIP_LIST[bus[0]];
            const timeStr = utils.minToTime(bus[1]);
            const destName = window.DEST_LIST[bus[2]];
            const shapeId = window.SHAPE_LIST[bus[4]];
            const routeInfo = window.ROUTE_LIST[bus[5]];
            const lineName = routeInfo.n.replace('市バス', '');
            
            // 残り時間メッセージの生成
            const diff = bus[1] - currentMin;
            let remainMsg = "";
            if (diff > 0) {
                remainMsg = `${diff}分後`;
            } else if (diff === 0) {
                remainMsg = "現在時刻";
            } else {
                remainMsg = "出発済み";
            }

            const card = components.createBusCardElement({
                lineName, 
                color: routeInfo.c, 
                textColor: routeInfo.t, 
                destName, 
                remainMsg, 
                timeStr
            }, () => {
                showTripDetail(tripId, stop.id, shapeId, lineName, routeInfo.c, routeInfo.t, destName);
            });
            
            container.appendChild(card);
        });
    });

    if (!hasBus) {
        container.appendChild(components.createEmptyMsgElement('該当するバスはありません'));
    }
}

// MARK: - Filter Actions
function setPlatformFilter(id) {
    state.currentFilter.platformId = id;
    uiState.scrollFilterButton(id);
    renderPlatforms();
}

function setRouteFilter(route) {
    if (state.currentFilter.route === route) state.currentFilter.route = 'ALL';
    else state.currentFilter.route = route;
    
    // タグの不透明度制御
    const tags = document.querySelectorAll('.tag-badge');
    tags.forEach(t => {
        if(state.currentFilter.route === 'ALL' || t.textContent === route) t.style.opacity = '1';
        else t.style.opacity = '0.3';
    });
    renderPlatforms();
}

function filterByDest(val) {
    state.currentFilter.destKeyword = val;
    
    if (val && typeof window.GTFS_DATA !== 'undefined') {
        state.currentFilter.targetStopIds = new Set();
        window.GTFS_DATA.forEach(s => {
            if (s.name.includes(val)) state.currentFilter.targetStopIds.add(s.id);
        });
    } else {
        state.currentFilter.targetStopIds = null;
    }
    renderPlatforms();
}

// MARK: - Route Detail Functions
function showTripDetail(tripId, currentStopId, shapeId, lineName, lineColor, lineText, destName) {
    if (typeof window.TRIP_STOPS_DATA === 'undefined') { alert("経由データがありません"); return; }
    
    // 状態保存
    state.activeRouteStopId = currentStopId;

    // マーカーハイライト（出発地のみ黒く）
    mapManager.highlightMarker(currentStopId);
    
    // ルート線描画
    mapManager.drawRoutePolyline(shapeId);

    const stops = window.TRIP_STOPS_DATA[tripId];
    if (!stops) { alert("詳細データなし"); return; }

    const viewRoute = document.getElementById('viewRoute');
    viewRoute.innerHTML = ''; 

    // ヘッダー
    viewRoute.appendChild(components.createRouteHeaderElement(lineName, lineColor, lineText, destName));

    // タイムライン
    const tlBox = document.createElement('div');
    tlBox.className = 'timeline-box';
    
    stops.forEach(s => {
        const stopInfo = state.stopIdMap[s.i];
        if(!stopInfo) return;
        const isCurrent = (s.i === currentStopId);
        const time = s.t.substring(0, 5);
        
        // タイムライン行生成
        const row = components.createTimelineItemElement(time, stopInfo.name, isCurrent, () => {
            mapManager.zoomToStop(stopInfo.id);
        });
        tlBox.appendChild(row);
    });
    viewRoute.appendChild(tlBox);
    
    // 画面遷移
    uiState.updateState('route');
    
    // 現在地にスクロール
    setTimeout(() => {
        const activeEl = viewRoute.querySelector('.active');
        if(activeEl) activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
}

// MARK: - Map Zoom Action
function zoomToBusStop() {
    mapManager.zoomToStop(state.activeRouteStopId);
}

// MARK: - Favorite Functions
function updateFavButtonState() {
    const btn = document.getElementById('btnFav');
    if (!btn || !state.currentViewingStopName) return;
    btn.style.color = state.favoriteNames.includes(state.currentViewingStopName) ? '#FFD700' : ''; 
}

function toggleFavorite() {
    if (!state.currentViewingStopName) return;
    const idx = state.favoriteNames.indexOf(state.currentViewingStopName);
    if (idx >= 0) state.favoriteNames.splice(idx, 1);
    else state.favoriteNames.push(state.currentViewingStopName);
    
    localStorage.setItem('kyoto_bus_fav_names', JSON.stringify(state.favoriteNames));
    updateFavButtonState();
}
