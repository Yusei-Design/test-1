// MARK: - UI Components Factory
// DOM要素を生成して返すコンポーネント群。

// MARK: Main List Item
export function createListItemElement(name, count, onClick) {
    const div = document.createElement('div');
    div.className = 'list-item';
    div.innerHTML = `
        <span class="list-title">${name}</span>
        <span class="list-sub">${count} のりば</span>
    `;
    div.addEventListener('click', onClick);
    return div;
}

// MARK: Detail Header
export function createDetailHeaderElement(name) {
    const div = document.createElement('div');
    div.className = 'detail-title';
    div.textContent = name;
    return div;
}

// MARK: Tag Container
export function createTagContainer(routesMap, onRouteClick) {
    const container = document.createElement('div');
    container.className = 'tag-container';

    // 系統名でソート
    const sortedRoutes = Array.from(routesMap.keys()).sort((a, b) => 
        a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );

    sortedRoutes.forEach(ln => {
        const style = routesMap.get(ln);
        const badge = document.createElement('div');
        badge.className = 'tag-badge';
        badge.style.background = style.c;
        badge.style.color = style.tc;
        badge.style.cursor = 'pointer';
        badge.textContent = ln;
        
        badge.addEventListener('click', () => onRouteClick(ln));
        container.appendChild(badge);
    });

    return container;
}

// MARK: Filter Carousel
export function createFilterCarousel(stops, onFilterClick) {
    const container = document.createElement('div');
    container.className = 'filter-carousel';
    container.id = 'platformFilterButtons'; // ID付与（スクロール制御用）

    // 「すべて」ボタン
    const allBtn = createFilterButtonElement('ALL', 'すべて', true, () => onFilterClick('ALL'));
    container.appendChild(allBtn);

    // 各のりばボタン
    stops.forEach(stop => {
        const label = stop.desc || '不明';
        const btn = createFilterButtonElement(stop.id, label, false, () => onFilterClick(stop.id));
        container.appendChild(btn);
    });

    return container;
}

function createFilterButtonElement(id, label, isActive, onClick) {
    const btn = document.createElement('button');
    btn.className = `filter-chip ${isActive ? 'active' : ''}`;
    btn.dataset.id = id;
    btn.textContent = label;
    btn.addEventListener('click', onClick);
    return btn;
}

// MARK: Bus Card
export function createBusCardElement(params, onClick) {
    const { lineName, color, textColor, destName, remainMsg, timeStr } = params;

    const card = document.createElement('div');
    card.className = 'bus-card';
    card.innerHTML = `
        <div class="bus-left-col">
            <span class="line-badge" style="background:${color}; color:${textColor};">
                ${lineName}
            </span>
            <div class="bus-dest">${destName}</div>
        </div>
        <div class="bus-right-col">
            <span class="bus-remain">${remainMsg}</span>
            <div class="bus-time">${timeStr}</div>
        </div>
    `;
    card.addEventListener('click', onClick);
    return card;
}

// MARK: Section Label
export function createSectionLabelElement(text) {
    const div = document.createElement('div');
    div.className = 'section-label';
    div.textContent = text;
    return div;
}

// MARK: Route Detail Header
export function createRouteHeaderElement(lineName, color, textColor, destName) {
    const div = document.createElement('div');
    div.className = 'route-header';
    div.innerHTML = `
        <span class="rh-badge" style="background:${color}; color:${textColor};">
            ${lineName}
        </span>
        <div class="rh-title">${destName} 行き</div>
    `;
    return div;
}

// MARK: Timeline Item
export function createTimelineItemElement(time, stopName, isCurrent, onClick) {
    const row = document.createElement('div');
    row.className = `tl-row ${isCurrent ? 'active' : ''}`;
    row.innerHTML = `
        <div class="tl-visual">
            <div class="tl-line"></div>
            <div class="tl-dot"></div>
            <div class="tl-line"></div>
        </div>
        <div class="tl-info">
            <span class="tl-time">${time}</span>
            <span class="tl-name">${stopName}</span>
        </div>
    `;
    row.addEventListener('click', onClick);
    return row;
}

// MARK: Suggestion Item (Popup)
export function createSuggestionItemElement(text, onClick) {
    const div = document.createElement('div');
    div.className = 'suggestion-item';
    div.textContent = text;
    div.addEventListener('mousedown', onClick); // blurより先に発火させるためmousedown
    return div;
}

// MARK: Empty Message
export function createEmptyMsgElement(text) {
    const div = document.createElement('div');
    div.className = 'empty-msg';
    div.textContent = text;
    return div;
}
