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

    // データ展開確認
    if(typeof window.GTFS_DATA !== 'undefined') {
        window.GTFS_DATA.forEach(s => state.stopIdMap[s.id] = s);
        doSearch(''); 
    } else {
        console.error('GTFS Data not loaded. Check index.html bridge script.');
    }
};

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
        container.innerHTML += components.createSectionLabelHTML('お気に入りのバス停');
    }

    searchResult.results.forEach(item => {
        const div = document.createElement('div');
        div.innerHTML = components.createListItemHTML(item.name, item.stops.length);
        const child = div.firstElementChild;
        child.onclick = () => selectGroup(item.name, item.stops);
        container.appendChild(child);
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

    const sortedRoutes = Array.from(routesMap.keys()).sort((a, b) => 
        a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );
    const tagsHtml = sortedRoutes.map(ln => {
        const style = routesMap.get(ln);
        return components.createRouteTagHTML(ln, style.c, style.tc, `setRouteFilter('${ln}')`);
    }).join('');

    const sortedStops = [...stops].sort((a,b) => (a.desc || '').localeCompare(b.desc || ''));
    let buttonsHtml = components.createFilterButtonHTML('ALL', 'すべて', true, "setPlatformFilter('ALL')");
    sortedStops.forEach(stop => {
        const label = stop.desc || '不明';
        buttonsHtml += components.createFilterButtonHTML(stop.id, label, false, `setPlatformFilter('${stop.id}')`);
    });

    const viewDetail = document.getElementById('viewDetail');
    viewDetail.innerHTML = components.createDetailHeaderHTML(name, tagsHtml, buttonsHtml);
    
    state.currentStopDataMap = stopDataMap;
    state.currentFilter = { platformId: 'ALL', destKeyword: '', targetStopIds: null, route: 'ALL' };
    
    uiState.updateState('detail');
    renderPlatforms();
}

// MARK: - Filter & Render Platforms
export function renderPlatforms() {
    const filter = state.currentFilter;
    const container = document.getElementById('platformList');
    container.innerHTML = '';
    
    // 一旦すべて白丸にリセット
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

        // ★修正: 排他制御(highlight)ではなく、追加制御(setActive)を使用
        // これにより、ループで複数ののりばが連続して黒丸になります
        mapManager.setMarkerActive(stop.id);

        container.innerHTML += components.createSectionLabelHTML(`のりば ${stop.desc || '不明'}`);

        nextBuses.forEach(bus => {
            const tripId = window.TRIP_LIST[bus[0]];
            const timeStr = utils.minToTime(bus[1]);
            const destName = window.DEST_LIST[bus[2]];
            const shapeId = window.SHAPE_LIST[bus[4]];
            const routeInfo = window.ROUTE_LIST[bus[5]];
            const lineName = routeInfo.n.replace('市バス', '');
            
            const diff = bus[1] - currentMin;
            const remainMsg = diff <= 0 ? "まもなく" : `${diff}分後`;

            const div = document.createElement('div');
            // ★修正: createBusCardHTML に余計な引数を渡さない
            div.innerHTML = components.createBusCardHTML({
                lineName, 
                color: routeInfo.c, 
                textColor: routeInfo.t, 
                destName, 
                remainMsg, 
                timeStr
            });
            const card = div.firstElementChild;
            
            // JSで直接イベントを設定 (これでHTML属性の影響を受けない)
            card.onclick = () => showTripDetail(tripId, stop.id, shapeId, lineName, routeInfo.c, routeInfo.t, destName);
            
            container.appendChild(card);
        });
    });

    if (!hasBus) {
        container.innerHTML = components.createEmptyMsgHTML('該当するバスはありません');
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
        if(state.currentFilter.route === 'ALL' || t.innerText.includes(route)) t.style.opacity = '1';
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

    // ★修正: ルート詳細では「出発地」だけを黒くしたいので highlightMarker (排他) でOK
    mapManager.highlightMarker(currentStopId);
    
    mapManager.drawRoutePolyline(shapeId);

    const stops = window.TRIP_STOPS_DATA[tripId];
    if (!stops) { alert("詳細データなし"); return; }

    const viewRoute = document.getElementById('viewRoute');
    viewRoute.innerHTML = ''; 

    viewRoute.innerHTML += components.createRouteHeaderHTML(lineName, lineColor, lineText, destName);

    const tlBox = document.createElement('div');
    tlBox.className = 'timeline-box';
    
    stops.forEach(s => {
        const stopInfo = state.stopIdMap[s.i];
        if(!stopInfo) return;
        const isCurrent = (s.i === currentStopId);
        const time = s.t.substring(0, 5);
        
        const div = document.createElement('div');
        div.innerHTML = components.createTimelineItemHTML(time, stopInfo.name, isCurrent, "");
        const row = div.firstElementChild;
        
        row.onclick = () => mapManager.zoomToStop(stopInfo.id);
        
        tlBox.appendChild(row);
    });
    viewRoute.appendChild(tlBox);
    
    uiState.updateState('route');
    
    setTimeout(() => {
        const activeEl = viewRoute.querySelector('.active');
        if(activeEl) activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
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

// MARK: - Expose to Window
window.handleSearch = (e) => doSearch(e.target.value.trim());
window.filterByDest = (e) => filterByDest(e.target.value.trim());
window.setPlatformFilter = setPlatformFilter;
window.setRouteFilter = setRouteFilter;
window.goBack = uiState.goBack;
window.toggleFavorite = toggleFavorite;
window.zoomToBusStop = () => mapManager.zoomToStop(state.activeRouteStopId);
