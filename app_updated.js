<<<<<<< HEAD
// ========================================
// Family Calendar - Client Script (API版)
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    let currentDate = new Date();
    let selectedDate = null;
    let events = [];
    let currentFilter = 'all';
    let gasApiUrl = localStorage.getItem('familyCalendar_gas_url') || '';

    // --- DOM Elements ---
    const calendarDays = document.getElementById('calendarDays');
    const currentRequestMonthLabel = document.getElementById('currentRequestMonth');
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    const todayBtn = document.getElementById('todayBtn');

    // Sidebar
    const sideCurrentDay = document.getElementById('currentDay');
    const sideCurrentFullDate = document.getElementById('currentFullDate');
    const upcomingEventsList = document.getElementById('upcomingEventsList');
    const categoryItems = document.querySelectorAll('.category-item');
    const addEventSideBtn = document.getElementById('addEventBtn');

    // Modal
    const modal = document.getElementById('eventModal');
    const closeModalBtn = document.getElementById('closeModal');
    const eventForm = document.getElementById('eventForm');
    const eventDateInput = document.getElementById('eventDate');
    const eventTitleInput = document.getElementById('eventTitle');
    const eventCategoryInputs = document.querySelectorAll('input[name="category"]');
    const eventTimeInput = document.getElementById('eventTime');
    const eventDescInput = document.getElementById('eventDesc');
    const eventIdInput = document.getElementById('eventId');
    const modalTitle = document.getElementById('modalTitle');
    const deleteEventBtn = document.getElementById('deleteEventBtn');
    const isMultiDayCheckbox = document.getElementById('isMultiDay');
    const endDateGroup = document.getElementById('endDateGroup');
    const eventEndDateInput = document.getElementById('eventEndDate');

    // Settings
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsBtn = document.getElementById('closeSettings');
    const gasUrlInput = document.getElementById('gasUrl');
    const saveSettingsBtn = document.getElementById('saveSettings');

    const loadingDiv = document.getElementById('loading');
    const statusMessage = document.getElementById('statusMessage');

    // --- Initialization ---
    try {
        init();
    } catch (e) {
        console.error('Initialization error:', e);
        hideLoading();
    }

    function init() {
        console.log('Initializing calendar...');

        // 設定の読み込み
        if (gasApiUrl) {
            gasUrlInput.value = gasApiUrl;
        }

        updateSidebarDate();
        renderCalendar();
        setupEventListeners();

        // GAS URLが設定されていれば自動的にイベントを読み込む
        if (gasApiUrl) {
            loadEvents();
        } else {
            hideLoading();
            showMessage('設定からGASアプリのURLを設定してください', 'error');
        }
    }

    // --- API通信関数 ---

    async function callGasApi(action, data = {}) {
        if (!gasApiUrl) {
            throw new Error('GASアプリのURLが設定されていません');
        }

        const requestData = {
            action: action,
            ...data
        };

        try {
            const response = await fetch(gasApiUrl, {
                method: 'POST',
                redirect: 'follow',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8'
                },
                body: JSON.stringify(requestData)
            });

            const result = await response.json();

            if (result.result === 'error') {
                throw new Error(result.message || 'サーバーエラー');
            }

            return result;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    async function loadEvents() {
        showLoading();
        try {
            const result = await callGasApi('getAllEvents');
            events = result.data || [];
            hideLoading();
            renderCalendar();
            renderUpcomingEvents();
        } catch (error) {
            hideLoading();
            showMessage('データの読み込みに失敗しました: ' + error.message, 'error');
        }
    }

    function showLoading() {
        if (loadingDiv) loadingDiv.style.display = 'flex';
    }

    function hideLoading() {
        if (loadingDiv) loadingDiv.style.display = 'none';
    }

    function showMessage(msg, type) {
        if (statusMessage) {
            statusMessage.textContent = msg;
            statusMessage.className = `status-message ${type}`;
            statusMessage.style.display = 'block';
            setTimeout(() => {
                statusMessage.style.display = 'none';
            }, 5000);
        }
    }

    // --- Event Listeners ---

    function setupEventListeners() {
        // Navigation
        prevMonthBtn.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            renderCalendar();
        });

        nextMonthBtn.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            renderCalendar();
        });

        todayBtn.addEventListener('click', () => {
            currentDate = new Date();
            renderCalendar();
        });

        // Categories
        categoryItems.forEach(item => {
            item.addEventListener('click', () => {
                categoryItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                currentFilter = item.dataset.category;
                renderCalendar();
                renderUpcomingEvents();
            });
        });

        // Modal
        addEventSideBtn.addEventListener('click', () => {
            openModal(new Date());
        });

        closeModalBtn.addEventListener('click', closeModal);
        window.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
            if (e.target === settingsModal) closeSettingsModal();
        });

        eventForm.addEventListener('submit', handleEventSubmit);
        deleteEventBtn.addEventListener('click', deleteEvent);

        // Multi-day checkbox
        isMultiDayCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                endDateGroup.style.display = 'block';
                eventEndDateInput.required = true;
            } else {
                endDateGroup.style.display = 'none';
                eventEndDateInput.required = false;
                eventEndDateInput.value = '';
            }
        });

        // Settings
        settingsBtn.addEventListener('click', openSettingsModal);
        closeSettingsBtn.addEventListener('click', closeSettingsModal);
        saveSettingsBtn.addEventListener('click', saveSettings);
    }

    // --- Settings Modal ---

    function openSettingsModal() {
        settingsModal.classList.add('open');
    }

    function closeSettingsModal() {
        settingsModal.classList.remove('open');
    }

    function saveSettings() {
        const url = gasUrlInput.value.trim();
        if (url) {
            localStorage.setItem('familyCalendar_gas_url', url);
            gasApiUrl = url;
            showMessage('設定を保存しました', 'success');
            closeSettingsModal();

            // 設定保存後、自動的にイベントを読み込む
            loadEvents();
        } else {
            showMessage('URLを入力してください', 'error');
        }
    }

    // --- Calendar Rendering ---

    function renderCalendar() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        currentRequestMonthLabel.textContent = `${year}年 ${month + 1}月`;
        calendarDays.innerHTML = '';

        let firstDayIndex = new Date(year, month, 1).getDay();
        firstDayIndex = (firstDayIndex === 0) ? 6 : firstDayIndex - 1;

        const lastDay = new Date(year, month + 1, 0).getDate();
        const prevLastDay = new Date(year, month, 0).getDate();

        let lastDayIndex = new Date(year, month + 1, 0).getDay();
        lastDayIndex = (lastDayIndex === 0) ? 6 : lastDayIndex - 1;

        const nextDays = 7 - lastDayIndex - 1;

        // Previous month filler
        for (let x = firstDayIndex; x > 0; x--) {
            const dayDiv = document.createElement('div');
            dayDiv.classList.add('day', 'prev-date');
            dayDiv.innerHTML = `<div class="day-header">${prevLastDay - x + 1}</div>`;
            calendarDays.appendChild(dayDiv);
        }

        // Current month days
        for (let i = 1; i <= lastDay; i++) {
            const dayDiv = document.createElement('div');
            dayDiv.classList.add('day');

            if (i === new Date().getDate() &&
                year === new Date().getFullYear() &&
                month === new Date().getMonth()) {
                dayDiv.classList.add('today');
            }

            const headerDiv = document.createElement('div');
            headerDiv.classList.add('day-header');
            headerDiv.textContent = i;
            dayDiv.appendChild(headerDiv);

            const eventsDiv = document.createElement('div');
            eventsDiv.classList.add('day-events');

            const dateString = formatDateString(year, month, i);
            const dayEvents = getEventsForDate(dateString);

            dayEvents.forEach(evt => {
                if (currentFilter !== 'all' && evt.category !== currentFilter) return;

                const pill = document.createElement('div');
                pill.classList.add('event-pill', evt.category);
                pill.textContent = evt.title;
                pill.title = evt.title + (evt.time ? ` (${evt.time})` : '');

                pill.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openModal(null, evt);
                });

                eventsDiv.appendChild(pill);
            });

            dayDiv.appendChild(eventsDiv);

            dayDiv.addEventListener('click', () => {
                const clickedDate = new Date(year, month, i);
                openModal(clickedDate);
            });

            calendarDays.appendChild(dayDiv);
        }

        // Next month filler
        for (let j = 1; j <= nextDays; j++) {
            const dayDiv = document.createElement('div');
            dayDiv.classList.add('day', 'next-date');
            dayDiv.innerHTML = `<div class="day-header">${j}</div>`;
            calendarDays.appendChild(dayDiv);
        }
    }

    function updateSidebarDate() {
        const now = new Date();
        sideCurrentDay.textContent = now.getDate();

        const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
        sideCurrentFullDate.textContent = new Intl.DateTimeFormat('ja-JP', options).format(now);
    }

    function renderUpcomingEvents() {
        upcomingEventsList.innerHTML = '';

        const nowStr = new Date().toISOString().split('T')[0];

        const futureEvents = events.filter(evt => {
            if (currentFilter !== 'all' && evt.category !== currentFilter) return false;
            return evt.date >= nowStr;
        }).sort((a, b) => {
            if (a.date === b.date) {
                return (a.time || '00:00').localeCompare(b.time || '00:00');
            }
            return a.date.localeCompare(b.date);
        });

        if (futureEvents.length === 0) {
            upcomingEventsList.innerHTML = '<div class="empty-state">予定はありません</div>';
            return;
        }

        futureEvents.slice(0, 5).forEach(evt => {
            const el = document.createElement('div');
            el.classList.add('event-card-mini');
            el.style.borderLeftColor = `var(--accent-${evt.category})`;

            const dateObj = new Date(evt.date);
            const dateStr = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;

            el.innerHTML = `
                <div style="font-size: 0.8rem; opacity: 0.8; display:flex; justify-content:space-between;">
                    <span>${dateStr}</span>
                    <span>${evt.time || ''}</span>
                </div>
                <div style="font-weight: 600; margin-top: 2px;">${evt.title}</div>
            `;

            el.addEventListener('click', () => {
                openModal(null, evt);
            });

            upcomingEventsList.appendChild(el);
        });
    }

    // --- Data Helpers ---

    function getEventsForDate(dateStr) {
        return events.filter(e => e.date === dateStr);
    }

    function formatDateString(year, month, day) {
        const m = String(month + 1).padStart(2, '0');
        const d = String(day).padStart(2, '0');
        return `${year}-${m}-${d}`;
    }

    // --- Modal Logic ---

    function openModal(dateObj = null, eventObj = null) {
        modal.classList.add('open');

        if (eventObj) {
            modalTitle.textContent = '予定を編集';
            eventIdInput.value = eventObj.id;
            eventTitleInput.value = eventObj.title;
            eventDateInput.value = eventObj.date;
            eventTimeInput.value = eventObj.time || '';
            eventDescInput.value = eventObj.description || '';

            eventCategoryInputs.forEach(input => {
                if (input.value === eventObj.category) input.checked = true;
            });

            deleteEventBtn.classList.remove('hidden');
        } else {
            modalTitle.textContent = '予定を追加';
            eventIdInput.value = '';
            eventForm.reset();
            deleteEventBtn.classList.add('hidden');

            document.getElementById('cat-family').checked = true;

            if (dateObj) {
                const year = dateObj.getFullYear();
                const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                const day = String(dateObj.getDate()).padStart(2, '0');
                eventDateInput.value = `${year}-${month}-${day}`;
            } else {
                eventDateInput.valueAsDate = new Date();
            }
        }
    }

    function closeModal() {
        modal.classList.remove('open');

        // スマホで入力後に画面サイズを元に戻す
        // フォーカスを外してキーボードを閉じる
        if (document.activeElement) {
            document.activeElement.blur();
        }

        // ビューポートを元のサイズにリセット
        window.scrollTo(0, 0);

        // 連続予定のチェックボックスをリセット
        isMultiDayCheckbox.checked = false;
        endDateGroup.style.display = 'none';
        eventEndDateInput.required = false;
    }

    async function handleEventSubmit(e) {
        e.preventDefault();

        const id = eventIdInput.value;
        const title = eventTitleInput.value;
        const startDate = eventDateInput.value;
        const endDate = eventEndDateInput.value;
        const isMultiDay = isMultiDayCheckbox.checked;
        const time = eventTimeInput.value;
        const description = eventDescInput.value;
        const category = document.querySelector('input[name="category"]:checked').value;

        if (!title || !startDate) return;

        // 連続する予定の場合、終了日のバリデーション
        if (isMultiDay && (!endDate || endDate < startDate)) {
            showMessage('終了日は開始日以降を指定してください', 'error');
            return;
        }

        showLoading();

        try {
            if (id) {
                // Update (既存の予定の更新)
                const eventData = {
                    id: id,
                    title: title,
                    date: startDate,
                    time: time,
                    description: description,
                    category: category
                };
                await callGasApi('updateEvent', eventData);
                showMessage('予定を更新しました！', 'success');
            } else {
                // Create (新規予定の追加)
                if (isMultiDay) {
                    // 連続する予定の場合、各日付に個別に追加
                    const start = new Date(startDate);
                    const end = new Date(endDate);
                    const dayCount = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

                    for (let i = 0; i < dayCount; i++) {
                        const currentDate = new Date(start);
                        currentDate.setDate(start.getDate() + i);

                        const dateStr = currentDate.toISOString().split('T')[0];

                        const eventData = {
                            title: title,
                            date: dateStr,
                            time: time,
                            description: description,
                            category: category
                        };

                        await callGasApi('addEvent', eventData);
                    }

                    showMessage(`${dayCount}日分の予定を追加しました！`, 'success');
                } else {
                    // 単日の予定
                    const eventData = {
                        title: title,
                        date: startDate,
                        time: time,
                        description: description,
                        category: category
                    };
                    await callGasApi('addEvent', eventData);
                    showMessage('予定を追加しました！', 'success');
                }
            }

            closeModal();
            await loadEvents();
        } catch (error) {
            hideLoading();
            showMessage('保存に失敗しました: ' + error.message, 'error');
        }
    }

    async function deleteEvent() {
        const id = eventIdInput.value;
        if (!id) return;

        if (confirm('本当にこの予定を削除しますか？')) {
            showLoading();
            try {
                await callGasApi('deleteEvent', { eventId: id });
                showMessage('予定を削除しました', 'success');
                closeModal();
                await loadEvents();
            } catch (error) {
                hideLoading();
                showMessage('削除に失敗しました: ' + error.message, 'error');
            }
        }
    }
});
=======
// ========================================
// Family Calendar - Client Script (API版)
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    let currentDate = new Date();
    let selectedDate = null;
    let events = [];
    let currentFilter = 'all';
    let gasApiUrl = localStorage.getItem('familyCalendar_gas_url') || '';

    // --- DOM Elements ---
    const calendarDays = document.getElementById('calendarDays');
    const currentRequestMonthLabel = document.getElementById('currentRequestMonth');
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    const todayBtn = document.getElementById('todayBtn');

    // Sidebar
    const sideCurrentDay = document.getElementById('currentDay');
    const sideCurrentFullDate = document.getElementById('currentFullDate');
    const upcomingEventsList = document.getElementById('upcomingEventsList');
    const categoryItems = document.querySelectorAll('.category-item');
    const addEventSideBtn = document.getElementById('addEventBtn');

    // Modal
    const modal = document.getElementById('eventModal');
    const closeModalBtn = document.getElementById('closeModal');
    const eventForm = document.getElementById('eventForm');
    const eventDateInput = document.getElementById('eventDate');
    const eventTitleInput = document.getElementById('eventTitle');
    const eventCategoryInputs = document.querySelectorAll('input[name="category"]');
    const eventTimeInput = document.getElementById('eventTime');
    const eventDescInput = document.getElementById('eventDesc');
    const eventIdInput = document.getElementById('eventId');
    const modalTitle = document.getElementById('modalTitle');
    const deleteEventBtn = document.getElementById('deleteEventBtn');
    const isMultiDayCheckbox = document.getElementById('isMultiDay');
    const endDateGroup = document.getElementById('endDateGroup');
    const eventEndDateInput = document.getElementById('eventEndDate');

    // Settings
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsBtn = document.getElementById('closeSettings');
    const gasUrlInput = document.getElementById('gasUrl');
    const saveSettingsBtn = document.getElementById('saveSettings');

    const loadingDiv = document.getElementById('loading');
    const statusMessage = document.getElementById('statusMessage');

    // --- Initialization ---
    try {
        init();
    } catch (e) {
        console.error('Initialization error:', e);
        hideLoading();
    }

    function init() {
        console.log('Initializing calendar...');

        // 設定の読み込み
        if (gasApiUrl) {
            gasUrlInput.value = gasApiUrl;
        }

        updateSidebarDate();
        renderCalendar();
        setupEventListeners();

        // GAS URLが設定されていれば自動的にイベントを読み込む
        if (gasApiUrl) {
            loadEvents();
        } else {
            hideLoading();
            showMessage('設定からGASアプリのURLを設定してください', 'error');
        }
    }

    // --- API通信関数 ---

    async function callGasApi(action, data = {}) {
        if (!gasApiUrl) {
            throw new Error('GASアプリのURLが設定されていません');
        }

        const requestData = {
            action: action,
            ...data
        };

        try {
            const response = await fetch(gasApiUrl, {
                method: 'POST',
                redirect: 'follow',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8'
                },
                body: JSON.stringify(requestData)
            });

            const result = await response.json();

            if (result.result === 'error') {
                throw new Error(result.message || 'サーバーエラー');
            }

            return result;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    async function loadEvents() {
        showLoading();
        try {
            const result = await callGasApi('getAllEvents');
            events = result.data || [];
            hideLoading();
            renderCalendar();
            renderUpcomingEvents();
        } catch (error) {
            hideLoading();
            showMessage('データの読み込みに失敗しました: ' + error.message, 'error');
        }
    }

    function showLoading() {
        if (loadingDiv) loadingDiv.style.display = 'flex';
    }

    function hideLoading() {
        if (loadingDiv) loadingDiv.style.display = 'none';
    }

    function showMessage(msg, type) {
        if (statusMessage) {
            statusMessage.textContent = msg;
            statusMessage.className = `status-message ${type}`;
            statusMessage.style.display = 'block';
            setTimeout(() => {
                statusMessage.style.display = 'none';
            }, 5000);
        }
    }

    // --- Event Listeners ---

    function setupEventListeners() {
        // Navigation
        prevMonthBtn.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            renderCalendar();
        });

        nextMonthBtn.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            renderCalendar();
        });

        todayBtn.addEventListener('click', () => {
            currentDate = new Date();
            renderCalendar();
        });

        // Categories
        categoryItems.forEach(item => {
            item.addEventListener('click', () => {
                categoryItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                currentFilter = item.dataset.category;
                renderCalendar();
                renderUpcomingEvents();
            });
        });

        // Modal
        addEventSideBtn.addEventListener('click', () => {
            openModal(new Date());
        });

        closeModalBtn.addEventListener('click', closeModal);
        window.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
            if (e.target === settingsModal) closeSettingsModal();
        });

        eventForm.addEventListener('submit', handleEventSubmit);
        deleteEventBtn.addEventListener('click', deleteEvent);

        // Multi-day checkbox
        isMultiDayCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                endDateGroup.style.display = 'block';
                eventEndDateInput.required = true;
            } else {
                endDateGroup.style.display = 'none';
                eventEndDateInput.required = false;
                eventEndDateInput.value = '';
            }
        });

        // Settings
        settingsBtn.addEventListener('click', openSettingsModal);
        closeSettingsBtn.addEventListener('click', closeSettingsModal);
        saveSettingsBtn.addEventListener('click', saveSettings);
    }

    // --- Settings Modal ---

    function openSettingsModal() {
        settingsModal.classList.add('open');
    }

    function closeSettingsModal() {
        settingsModal.classList.remove('open');
    }

    function saveSettings() {
        const url = gasUrlInput.value.trim();
        if (url) {
            localStorage.setItem('familyCalendar_gas_url', url);
            gasApiUrl = url;
            showMessage('設定を保存しました', 'success');
            closeSettingsModal();

            // 設定保存後、自動的にイベントを読み込む
            loadEvents();
        } else {
            showMessage('URLを入力してください', 'error');
        }
    }

    // --- Calendar Rendering ---

    function renderCalendar() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        currentRequestMonthLabel.textContent = `${year}年 ${month + 1}月`;
        calendarDays.innerHTML = '';

        let firstDayIndex = new Date(year, month, 1).getDay();
        firstDayIndex = (firstDayIndex === 0) ? 6 : firstDayIndex - 1;

        const lastDay = new Date(year, month + 1, 0).getDate();
        const prevLastDay = new Date(year, month, 0).getDate();

        let lastDayIndex = new Date(year, month + 1, 0).getDay();
        lastDayIndex = (lastDayIndex === 0) ? 6 : lastDayIndex - 1;

        const nextDays = 7 - lastDayIndex - 1;

        // Previous month filler
        for (let x = firstDayIndex; x > 0; x--) {
            const dayDiv = document.createElement('div');
            dayDiv.classList.add('day', 'prev-date');
            dayDiv.innerHTML = `<div class="day-header">${prevLastDay - x + 1}</div>`;
            calendarDays.appendChild(dayDiv);
        }

        // Current month days
        for (let i = 1; i <= lastDay; i++) {
            const dayDiv = document.createElement('div');
            dayDiv.classList.add('day');

            if (i === new Date().getDate() &&
                year === new Date().getFullYear() &&
                month === new Date().getMonth()) {
                dayDiv.classList.add('today');
            }

            const headerDiv = document.createElement('div');
            headerDiv.classList.add('day-header');
            headerDiv.textContent = i;
            dayDiv.appendChild(headerDiv);

            const eventsDiv = document.createElement('div');
            eventsDiv.classList.add('day-events');

            const dateString = formatDateString(year, month, i);
            const dayEvents = getEventsForDate(dateString);

            dayEvents.forEach(evt => {
                if (currentFilter !== 'all' && evt.category !== currentFilter) return;

                const pill = document.createElement('div');
                pill.classList.add('event-pill', evt.category);
                pill.textContent = evt.title;
                pill.title = evt.title + (evt.time ? ` (${evt.time})` : '');

                pill.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openModal(null, evt);
                });

                eventsDiv.appendChild(pill);
            });

            dayDiv.appendChild(eventsDiv);

            dayDiv.addEventListener('click', () => {
                const clickedDate = new Date(year, month, i);
                openModal(clickedDate);
            });

            calendarDays.appendChild(dayDiv);
        }

        // Next month filler
        for (let j = 1; j <= nextDays; j++) {
            const dayDiv = document.createElement('div');
            dayDiv.classList.add('day', 'next-date');
            dayDiv.innerHTML = `<div class="day-header">${j}</div>`;
            calendarDays.appendChild(dayDiv);
        }
    }

    function updateSidebarDate() {
        const now = new Date();
        sideCurrentDay.textContent = now.getDate();

        const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
        sideCurrentFullDate.textContent = new Intl.DateTimeFormat('ja-JP', options).format(now);
    }

    function renderUpcomingEvents() {
        upcomingEventsList.innerHTML = '';

        const nowStr = new Date().toISOString().split('T')[0];

        const futureEvents = events.filter(evt => {
            if (currentFilter !== 'all' && evt.category !== currentFilter) return false;
            return evt.date >= nowStr;
        }).sort((a, b) => {
            if (a.date === b.date) {
                return (a.time || '00:00').localeCompare(b.time || '00:00');
            }
            return a.date.localeCompare(b.date);
        });

        if (futureEvents.length === 0) {
            upcomingEventsList.innerHTML = '<div class="empty-state">予定はありません</div>';
            return;
        }

        futureEvents.slice(0, 5).forEach(evt => {
            const el = document.createElement('div');
            el.classList.add('event-card-mini');
            el.style.borderLeftColor = `var(--accent-${evt.category})`;

            const dateObj = new Date(evt.date);
            const dateStr = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;

            el.innerHTML = `
                <div style="font-size: 0.8rem; opacity: 0.8; display:flex; justify-content:space-between;">
                    <span>${dateStr}</span>
                    <span>${evt.time || ''}</span>
                </div>
                <div style="font-weight: 600; margin-top: 2px;">${evt.title}</div>
            `;

            el.addEventListener('click', () => {
                openModal(null, evt);
            });

            upcomingEventsList.appendChild(el);
        });
    }

    // --- Data Helpers ---

    function getEventsForDate(dateStr) {
        return events.filter(e => e.date === dateStr);
    }

    function formatDateString(year, month, day) {
        const m = String(month + 1).padStart(2, '0');
        const d = String(day).padStart(2, '0');
        return `${year}-${m}-${d}`;
    }

    // --- Modal Logic ---

    function openModal(dateObj = null, eventObj = null) {
        modal.classList.add('open');

        if (eventObj) {
            modalTitle.textContent = '予定を編集';
            eventIdInput.value = eventObj.id;
            eventTitleInput.value = eventObj.title;
            eventDateInput.value = eventObj.date;
            eventTimeInput.value = eventObj.time || '';
            eventDescInput.value = eventObj.description || '';

            eventCategoryInputs.forEach(input => {
                if (input.value === eventObj.category) input.checked = true;
            });

            deleteEventBtn.classList.remove('hidden');
        } else {
            modalTitle.textContent = '予定を追加';
            eventIdInput.value = '';
            eventForm.reset();
            deleteEventBtn.classList.add('hidden');

            document.getElementById('cat-family').checked = true;

            if (dateObj) {
                const year = dateObj.getFullYear();
                const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                const day = String(dateObj.getDate()).padStart(2, '0');
                eventDateInput.value = `${year}-${month}-${day}`;
            } else {
                eventDateInput.valueAsDate = new Date();
            }
        }
    }

    function closeModal() {
        modal.classList.remove('open');

        // スマホで入力後に画面サイズを元に戻す
        // フォーカスを外してキーボードを閉じる
        if (document.activeElement) {
            document.activeElement.blur();
        }

        // ビューポートを元のサイズにリセット
        window.scrollTo(0, 0);

        // 連続予定のチェックボックスをリセット
        isMultiDayCheckbox.checked = false;
        endDateGroup.style.display = 'none';
        eventEndDateInput.required = false;
    }

    async function handleEventSubmit(e) {
        e.preventDefault();

        const id = eventIdInput.value;
        const title = eventTitleInput.value;
        const startDate = eventDateInput.value;
        const endDate = eventEndDateInput.value;
        const isMultiDay = isMultiDayCheckbox.checked;
        const time = eventTimeInput.value;
        const description = eventDescInput.value;
        const category = document.querySelector('input[name="category"]:checked').value;

        if (!title || !startDate) return;

        // 連続する予定の場合、終了日のバリデーション
        if (isMultiDay && (!endDate || endDate < startDate)) {
            showMessage('終了日は開始日以降を指定してください', 'error');
            return;
        }

        showLoading();

        try {
            if (id) {
                // Update (既存の予定の更新)
                const eventData = {
                    id: id,
                    title: title,
                    date: startDate,
                    time: time,
                    description: description,
                    category: category
                };
                await callGasApi('updateEvent', eventData);
                showMessage('予定を更新しました！', 'success');
            } else {
                // Create (新規予定の追加)
                if (isMultiDay) {
                    // 連続する予定の場合、各日付に個別に追加
                    const start = new Date(startDate);
                    const end = new Date(endDate);
                    const dayCount = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

                    for (let i = 0; i < dayCount; i++) {
                        const currentDate = new Date(start);
                        currentDate.setDate(start.getDate() + i);

                        const dateStr = currentDate.toISOString().split('T')[0];

                        const eventData = {
                            title: title,
                            date: dateStr,
                            time: time,
                            description: description,
                            category: category
                        };

                        await callGasApi('addEvent', eventData);
                    }

                    showMessage(`${dayCount}日分の予定を追加しました！`, 'success');
                } else {
                    // 単日の予定
                    const eventData = {
                        title: title,
                        date: startDate,
                        time: time,
                        description: description,
                        category: category
                    };
                    await callGasApi('addEvent', eventData);
                    showMessage('予定を追加しました！', 'success');
                }
            }

            closeModal();
            await loadEvents();
        } catch (error) {
            hideLoading();
            showMessage('保存に失敗しました: ' + error.message, 'error');
        }
    }

    async function deleteEvent() {
        const id = eventIdInput.value;
        if (!id) return;

        if (confirm('本当にこの予定を削除しますか？')) {
            showLoading();
            try {
                await callGasApi('deleteEvent', { eventId: id });
                showMessage('予定を削除しました', 'success');
                closeModal();
                await loadEvents();
            } catch (error) {
                hideLoading();
                showMessage('削除に失敗しました: ' + error.message, 'error');
            }
        }
    }
});
>>>>>>> bdb61e78f660d8a0753247b533634e412bdd917a
