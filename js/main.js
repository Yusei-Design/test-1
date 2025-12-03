// MARK: - Main Entry Point
import { state } from './state.js';
import * as utils from './utils.js';
import * as components from './components.js';
import * as mapManager from './map_manager.js';
import * as busLogic from './bus_logic.js';
import * as uiState from './ui_state.js';

// MARK: - Init
window.onload = function() {
    mapManager.initMap();
    setupGlobalEvents();

    if(typeof window.GTFS_DATA !== 'undefined') {
        window.GTFS_DATA.forEach(s => state.stopIdMap[s.id] = s);
        doSearch(''); 
    } else {
        console.error('GTFS Data not loaded. Check index.html bridge script.');
    }
};

// MARK: - Global Events
function setupGlobalEvents() {
    // --- 1. メイン検索 ---
    const searchInput = document.getElementById('searchKeyword');
    const searchClear = document.getElementById('searchClear');

    if (searchInput) {
        searchInput.addEventListener('keyup', (e) => {
            const val = e.target.value;
            if (searchClear) searchClear.style.display = val ? 'block' : 'none';
            doSearch(val.trim());
        });
    }
    if (searchClear) {
        searchClear.addEventListener('click', () => {
            searchInput.value = '';
            searchClear.style.display = 'none';
            doSearch('');
            searchInput.focus();
        });
    }

    // --- 2. Homeボタン ---
    const homeBtn = document.getElementById('btnHome');
    if (homeBtn) {
        homeBtn.addEventListener('click', () => {
            if (searchInput) {
                searchInput.value = '';
                if(searchClear) searchClear.style.display = 'none';
                doSearch('');
            }
            mapManager.resetMapView();
        });
    }

    // --- 3. 詳細検索（ポップアップ機能付き） ---
    const detailInput = document.getElementById('detailSearchInput');
    const detailClear = document.getElementById('detailSearchClear');
    
    const screenOverlay = document.getElementById('screenOverlay');
    const panelOverlay = document.getElementById('panelOverlay');
    const suggestionList = document.getElementById('detailSuggestionList');

    if (detailInput) {
        detailInput.addEventListener('keyup', (e) => {
            const val = e.target.value.trim();
            if (detailClear) detailClear.style.display = val ? 'block' : 'none';
            
            filterByDest(val);
            updateSuggestionList(val);
        });

        detailInput.addEventListener('focus', () => {
            if (screenOverlay) screenOverlay.classList.add('active');
            if (panelOverlay) panelOverlay.classList.add('active');
            if (detailInput.value.trim()) {
                updateSuggestionList(detailInput.value.trim());
            }
        });
    }

    if (detailClear) {
        detailClear.addEventListener('click', () => {
            detailInput.value = '';
            detailClear.style.display = 'none';
            filterByDest('');
            detailInput.focus(); 
        });
    }

    // 暗幕クリックで検索モード終了
    const closeSearchMode = () => {
        if (screenOverlay) screenOverlay.classList.remove('active');
        if (panelOverlay) panelOverlay.classList.remove('active');
        if (suggestionList) suggestionList.classList.remove('active');
        if (detailInput) detailInput.blur();
    };

    if (screenOverlay) screenOverlay.addEventListener('click', closeSearchMode);
    if (panelOverlay) panelOverlay.addEventListener('click', closeSearchMode);

    // --- 4. 共通ボタン ---
    const backBtns = document.querySelectorAll('.nav-circle-btn');
    backBtns.forEach(btn => {
        if(btn.textContent === '＜') {
            btn.addEventListener('click', goBack);
        }
    });

    const favBtn = document.getElementById('btnFav');
    if (favBtn) {
        favBtn.addEventListener('click', toggleFavorite);
    }

    const zoomBtn = document.querySelector('.nav-capsule-btn');
    if(zoomBtn) {
        zoomBtn.addEventListener('click', zoomToBusStop);
    }

    window._closeSearchMode = closeSearchMode;
}

// MARK: - Update Suggestions
function updateSuggestionList(keyword) {
    const list = document.getElementById('detailSuggestionList');
    if (!list) return;
    
    list.innerHTML = ''; 

    if (!keyword) {
        list.classList.remove('active');
        return;
    }

    const result = busLogic.searchStops(keyword);
    
    if (!result || result.results.length === 0) {
        list.classList.remove('active');
        return;
    }

    list.classList.add('active');

    const candidates = result.results.slice(0, 5);
    
    candidates.forEach(item => {
        const el = components.createSuggestionItemElement(item.name, () => {
            const input = document.getElementById('detailSearchInput');
            if (input) {
                input.value = item.name;
                const clearBtn = document.getElementById('detailSearchClear');
                if(clearBtn) clearBtn.style.display = 'block';
                
                filterByDest(item.name);
                
                if (window._closeSearchMode) window._closeSearchMode();
            }
        });
        list.appendChild(el);
    });
}

// MARK: - Navigation Logic
function goBack() {
    const panel = document.getElementById('appPanel');
    
    if (panel.classList.contains('state-route')) {
        uiState.updateState('detail');
        if (state.currentStopDataMap) {
            const stops = Object.values(state.currentStopDataMap).map(item => item.stop);
            if (stops.length > 0) {
                const latLngs = stops.map(s => [s.lat, s.lon]);
                state.map.fitBounds(latLngs, { padding: [80, 80] });
            }
        }
        renderPlatforms();

    } else if (panel.classList.contains('state-detail')) {
        uiState.updateState('main');
        
        const dInput = document.getElementById('detailSearchInput');
        const dClear = document.getElementById('detailSearchClear');
        
        // 入力リセット
        if(dInput) {
            dInput.value = '';
            dInput.blur(); // フォーカス解除
        }
        if(dClear) dClear.style.display = 'none';
        
        // ★修正: 戻る時に暗幕とリストを強制的に閉じる
        const screenOverlay = document.getElementById('screenOverlay');
        const panelOverlay = document.getElementById('panelOverlay');
        const suggestionList = document.getElementById('detailSuggestionList');
        
        if (screenOverlay) screenOverlay.classList.remove('active');
        if (panelOverlay) panelOverlay.classList.remove('active');
        if (suggestionList) suggestionList.classList.remove('active');
        
        const sInput = document.getElementById('searchKeyword');
        if(sInput) doSearch(sInput.value.trim());
    }
}

// MARK: - Search Functions
export function doSearch(keyword) {
    const container = document.getElementById('listMain');
    const emptyMsg = document.getElementById('msgEmpty') || document.querySelector('.empty-msg');
    
    container.innerHTML = '';
    
    const searchResult = busLogic.searchStops(keyword);
    
    if (!searchResult || !searchResult.results) return;
    
    if (searchResult.results.length === 0) {
        if (searchResult.isFavorite && keyword === '') {
            if(emptyMsg) emptyMsg.style.display = 'block';
        } else {
            if(emptyMsg) emptyMsg.style.display = 'none';
        }
        return;
    }

    if(emptyMsg) emptyMsg.style.display = 'none';

    if (searchResult.isFavorite && keyword === '') {
        const label = components.createSectionLabelElement('お気に入りのバス停');
        container.appendChild(label);
    }

    searchResult.results.forEach(item => {
        const itemEl = components.createListItemElement(item.name, item.stops.length, () => {
            selectGroup(item.name, item.stops);
        });
        container.appendChild(itemEl);
    });
}

// MARK: - Detail View Functions
function selectGroup(name, stops) {
    state.currentViewingStopName = name;
    
    mapManager.updateMarkersForDetail(stops, (stopId) => {
        setPlatformFilter(stopId);
    });

    updateFavButtonState();

    if (typeof window.TIMETABLE_DATA === 'undefined') return;

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

    const viewDetail = document.getElementById('viewDetail');
    viewDetail.innerHTML = ''; 

    viewDetail.appendChild(components.createDetailHeaderElement(name));

    viewDetail.appendChild(components.createTagContainer(routesMap, (route) => {
        setRouteFilter(route);
    }));

    const sortedStops = [...stops].sort((a,b) => (a.desc || '').localeCompare(b.desc || ''));
    viewDetail.appendChild(components.createFilterCarousel(sortedStops, (id) => {
        setPlatformFilter(id);
    }));

    const listDiv = document.createElement('div');
    listDiv.id = 'platformList';
    viewDetail.appendChild(listDiv);
    
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
    
    mapManager.resetMarkersStyle();
    
    const now = new Date();
    const currentMin = now.getHours() * 60 + now.getMinutes();
    const dayIndex = now.getDay(); 

    let hasBus = false;

    Object.values(state.currentStopDataMap).forEach(({ stop, times }) => {
        if (filter.platformId !== 'ALL' && stop.id !== filter.platformId) return;
        
        const nextBuses = busLogic.getDisplayBusesForStop(stop, times, currentMin, dayIndex);

        if (nextBuses.length === 0) return;
        hasBus = true;

        mapManager.setMarkerActive(stop.id);

        container.appendChild(components.createSectionLabelElement(`のりば ${stop.desc || '不明'}`));

        nextBuses.forEach(bus => {
            const tripId = window.TRIP_LIST[bus[0]];
            const timeStr = utils.minToTime(bus[1]);
            const destName = window.DEST_LIST[bus[2]];
            const shapeId = window.SHAPE_LIST[bus[4]];
            const routeInfo = window.ROUTE_LIST[bus[5]];
            const lineName = routeInfo.n.replace('市バス', '');
            
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

function setPlatformFilter(id) {
    state.currentFilter.platformId = id;
    uiState.scrollFilterButton(id);
    renderPlatforms();
}

function setRouteFilter(route) {
    if (state.currentFilter.route === route) state.currentFilter.route = 'ALL';
    else state.currentFilter.route = route;
    
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
    
    state.activeRouteStopId = currentStopId;

    mapManager.highlightMarker(currentStopId);
    mapManager.drawRoutePolyline(shapeId);

    const stops = window.TRIP_STOPS_DATA[tripId];
    if (!stops) { alert("詳細データなし"); return; }

    const viewRoute = document.getElementById('viewRoute');
    viewRoute.innerHTML = ''; 

    viewRoute.appendChild(components.createRouteHeaderElement(lineName, lineColor, lineText, destName));

    const tlBox = document.createElement('div');
    tlBox.className = 'timeline-box';
    
    stops.forEach(s => {
        const stopInfo = state.stopIdMap[s.i];
        if(!stopInfo) return;
        const isCurrent = (s.i === currentStopId);
        const time = s.t.substring(0, 5);
        
        const row = components.createTimelineItemElement(time, stopInfo.name, isCurrent, () => {
            mapManager.zoomToStop(stopInfo.id);
        });
        tlBox.appendChild(row);
    });
    viewRoute.appendChild(tlBox);
    
    uiState.updateState('route');
    
    setTimeout(() => {
        const activeEl = viewRoute.querySelector('.active');
        if(activeEl) activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
}

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
