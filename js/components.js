// MARK: - UI Components Factory
// HTML文字列を生成するコンポーネント群。

// MARK: Main List Item
export function createListItemHTML(name, count) {
    return `
        <div class="list-item">
            <span class="list-title">${name}</span>
            <span class="list-sub">${count} のりば</span>
        </div>
    `;
}

// MARK: Detail Header & Tags
export function createDetailHeaderHTML(name, tagsHtml, buttonsHtml) {
    return `
        <div class="detail-title">${name}</div>
        <div class="tag-container">${tagsHtml}</div>
        <div class="filter-carousel" id="platformFilterButtons">${buttonsHtml}</div>
        <div id="platformList"></div>
    `;
}

// MARK: Route Tag Badge
export function createRouteTagHTML(lineName, color, textColor, onClickAction) {
    return `
        <div class="tag-badge" 
             style="background:${color}; color:${textColor}; cursor:pointer;" 
             onclick="${onClickAction}">
             ${lineName}
        </div>
    `;
}

// MARK: Filter Chip Button
export function createFilterButtonHTML(id, label, isActive, onClickAction) {
    const activeClass = isActive ? 'active' : '';
    return `
        <button class="filter-chip ${activeClass}" 
                data-id="${id}" 
                onclick="${onClickAction}">
                ${label}
        </button>
    `;
}

// MARK: Bus Card
// ★修正: onclick属性をHTML文字列から削除（main.jsで設定するため）
export function createBusCardHTML(params) {
    const { 
        lineName, color, textColor, destName, 
        remainMsg, timeStr 
    } = params;

    return `
        <div class="bus-card">
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
        </div>
    `;
}

// MARK: Section Label
export function createSectionLabelHTML(text) {
    return `<div class="section-label">${text}</div>`;
}

// MARK: Route Detail Header
export function createRouteHeaderHTML(lineName, color, textColor, destName) {
    return `
        <div class="route-header">
            <span class="rh-badge" style="background:${color}; color:${textColor};">
                ${lineName}
            </span>
            <div class="rh-title">${destName} 行き</div>
        </div>
    `;
}

// MARK: Timeline Item
export function createTimelineItemHTML(time, stopName, isCurrent, onClickAction) {
    const activeClass = isCurrent ? 'active' : '';
    return `
        <div class="tl-row ${activeClass}" onclick="${onClickAction}">
            <div class="tl-visual">
                <div class="tl-line"></div>
                <div class="tl-dot"></div>
                <div class="tl-line"></div>
            </div>
            <div class="tl-info">
                <span class="tl-time">${time}</span>
                <span class="tl-name">${stopName}</span>
            </div>
        </div>
    `;
}

// MARK: Empty Message
export function createEmptyMsgHTML(text) {
    return `<div class="empty-msg">${text}</div>`;
}
