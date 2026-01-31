// ========================================
// Family Calendar - Client Script (GAS)
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    let currentDate = new Date();
    let selectedDate = null;
    let events = [];
    let currentFilter = 'all';

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

    const loadingDiv = document.getElementById('loading');

    // --- Initialization ---
    try {
        init();
    } catch (e) {
        console.error('Initialization error:', e);
        hideLoading(); // エラーが起きても画面は表示する
    }

    function init() {
        updateSidebarDate();
        setupEventListeners();
        loadEvents();
        fetchSpreadsheetUrl(); // スプレッドシートの場所を確認
    }

    function fetchSpreadsheetUrl() {
        google.script.run.withSuccessHandler(url => {
            console.log('Database Spreadsheet URL:', url);
            // デバッグ用にコンソールに出力。必要に応じてUIにも表示可能
        }).getSpreadsheetUrl();
    }

    function loadEvents() {
        showLoading();
        google.script.run
            .withSuccessHandler(onEventsLoaded)
            .withFailureHandler(onError)
            .getAllEvents();
    }

    function onEventsLoaded(data) {
        events = data || [];
        hideLoading();
        renderCalendar();
        renderUpcomingEvents();
    }

    function onError(error) {
        console.error('エラー:', error);
        hideLoading();
        alert('データの読み込みに失敗しました: ' + error.message);
    }

    function showLoading() {
        if (loadingDiv) loadingDiv.style.display = 'flex';
    }

    function hideLoading() {
        if (loadingDiv) loadingDiv.style.display = 'none';
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
        });

        eventForm.addEventListener('submit', handleEventSubmit);
        deleteEventBtn.addEventListener('click', deleteEvent);
    }

    // --- Calendar Rendering ---

    function renderCalendar() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        currentRequestMonthLabel.textContent = `${year}年 ${month + 1}月`;
        calendarDays.innerHTML = '';

        let firstDayIndex = new Date(year, month, 1).getDay();
        firstDayIndex = (firstDayIndex + 6) % 7; // Monday start

        const lastDay = new Date(year, month + 1, 0).getDate();
        const prevLastDay = new Date(year, month, 0).getDate();

        let lastDayIndex = new Date(year, month + 1, 0).getDay();
        lastDayIndex = (lastDayIndex + 6) % 7;

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
    }

    function handleEventSubmit(e) {
        e.preventDefault();

        const id = eventIdInput.value;
        const title = eventTitleInput.value;
        const date = eventDateInput.value;
        const time = eventTimeInput.value;
        const description = eventDescInput.value;
        const category = document.querySelector('input[name="category"]:checked').value;

        if (!title || !date) return;

        const eventData = {
            id: id,
            title: title,
            date: date,
            time: time,
            description: description,
            category: category
        };

        showLoading();

        if (id) {
            // Update
            google.script.run
                .withSuccessHandler(onSaveSuccess)
                .withFailureHandler(onError)
                .updateEvent(eventData);
        } else {
            // Create
            google.script.run
                .withSuccessHandler(onSaveSuccess)
                .withFailureHandler(onError)
                .addEvent(eventData);
        }
    }

    function onSaveSuccess(response) {
        console.log('Save success:', response);
        closeModal();
        loadEvents(); // Reload all events
        alert('予定を保存しました！');
    }

    function deleteEvent() {
        const id = eventIdInput.value;
        if (!id) return;

        if (confirm('本当にこの予定を削除しますか？')) {
            showLoading();
            google.script.run
                .withSuccessHandler(onDeleteSuccess)
                .withFailureHandler(onError)
                .deleteEvent(id);
        }
    }

    function onDeleteSuccess(response) {
        closeModal();
        loadEvents();
    }
});
