// MARK: - Global State Management
// アプリ全体で共有する状態変数

export const state = {
    // Leaflet Map Objects
    map: null,
    allMarkersGroup: null, // マーカーをまとめるレイヤー
    currentPolyline: null, // 現在表示中のルート線
    markers: [],           // 管理中のマーカー配列

    // Data Maps
    stopIdMap: {},         // IDからバス停情報を引く辞書

    // User Settings
    favoriteNames: JSON.parse(localStorage.getItem('kyoto_bus_fav_names')) || [],

    // Current View State
    currentViewingStopName: null, // 詳細表示中のバス停名
    activeRouteStopId: null,      // ルート詳細での出発バス停ID

    // Detail View Data & Filter
    currentStopDataMap: {},       // 詳細画面で表示中のバスデータ
    currentFilter: { 
        platformId: 'ALL', 
        destKeyword: '', 
        targetStopIds: null, 
        route: 'ALL' 
    }
};