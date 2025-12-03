// MARK: - Business Logic
// バスの運行データに関する計算・フィルタリング処理

import { state } from './state.js';
import { minToTime } from './utils.js';

// MARK: Search Logic
export function searchStops(keyword) {
    // ★修正: データがない場合も、必ず正しい形式のオブジェクトを返すように変更
    // これにより main.js での "Cannot read properties of undefined" エラーを防ぎます
    if (typeof window.GTFS_DATA === 'undefined') {
        console.warn("GTFS Data is missing or not loaded yet.");
        return { isFavorite: false, results: [] };
    }

    let targets = [];

    if (!keyword) {
        // お気に入り検索
        if (state.favoriteNames.length > 0) {
            state.favoriteNames.forEach(name => {
                const stops = window.GTFS_DATA.filter(s => s.name === name);
                if(stops.length > 0) targets.push({ name: name, stops: stops });
            });
        }
        return { isFavorite: true, results: targets };
    } else {
        // 通常検索
        const rawResults = window.GTFS_DATA.filter(s => s.name.includes(keyword));
        if (rawResults.length === 0) return { isFavorite: false, results: [] };

        const groups = {};
        rawResults.forEach(stop => {
            if (!groups[stop.name]) groups[stop.name] = [];
            groups[stop.name].push(stop);
        });
        
        Object.keys(groups).forEach(name => {
            targets.push({ name: name, stops: groups[name] });
        });
        return { isFavorite: false, results: targets };
    }
}

// MARK: Filter Buses Logic
export function getDisplayBusesForStop(stop, times, currentMin, dayIndex) {
    let filtered = times;

    // 1. 曜日フィルタ
    if (typeof window.CALENDAR_DATA !== 'undefined') {
        filtered = filtered.filter(bus => {
            const svcId = window.SERVICE_LIST[bus[3]]; 
            const flags = window.CALENDAR_DATA[svcId];
            return flags && flags[dayIndex] === 1;
        });
    }

    // 2. 系統フィルタ
    if (state.currentFilter.route !== 'ALL') {
        filtered = filtered.filter(bus => {
            const routeInfo = window.ROUTE_LIST[bus[5]];
            const ln = routeInfo.n.replace('市バス', '');
            return ln === state.currentFilter.route;
        });
    }

    // 3. 行き先フィルタ
    if (state.currentFilter.destKeyword && state.currentFilter.targetStopIds) {
        filtered = filtered.filter(bus => {
            const tripId = window.TRIP_LIST[bus[0]];
            if (typeof window.TRIP_STOPS_DATA === 'undefined') return false;
            const stops = window.TRIP_STOPS_DATA[tripId];
            if (!stops) return false;
            
            const busTimeStr = minToTime(bus[1]);
            let currentIndex = -1;
            for(let i=0; i<stops.length; i++) {
                if(stops[i].i === stop.id && stops[i].t.startsWith(busTimeStr)) {
                    currentIndex = i;
                    break;
                }
            }
            if (currentIndex === -1) currentIndex = stops.findIndex(s => s.i === stop.id);
            if (currentIndex === -1) return false;
            
            for(let i = currentIndex + 1; i < stops.length; i++) {
                if (state.currentFilter.targetStopIds.has(stops[i].i)) return true;
            }
            return false;
        });
    }

    // 4. 重複・終点カット
    const seenTrips = new Set();
    const seenSignatures = new Set();

    const nextBuses = filtered.filter(bus => {
        // A. 時間経過
        if (bus[1] <= currentMin) return false;

        const tripId = window.TRIP_LIST[bus[0]];

        // B. ID重複
        if (seenTrips.has(tripId)) return false;

        // C. シグネチャ重複
        const destName = window.DEST_LIST[bus[2]];
        const routeInfo = window.ROUTE_LIST[bus[5]];
        const signature = `${bus[1]}-${routeInfo.n}-${destName}`;
        
        if (seenSignatures.has(signature)) return false;

        // D. 終点
        if (typeof window.TRIP_STOPS_DATA !== 'undefined') {
            const tripStops = window.TRIP_STOPS_DATA[tripId];
            if (tripStops && tripStops.length > 0) {
                const busTimeStr = minToTime(bus[1]);
                const matchIndex = tripStops.findIndex(s => s.i === stop.id && s.t.startsWith(busTimeStr));
                if (matchIndex !== -1 && matchIndex === tripStops.length - 1) {
                    return false; 
                }
            }
        }

        seenTrips.add(tripId);
        seenSignatures.add(signature);
        return true;
    }).slice(0, 5);

    return nextBuses;
}