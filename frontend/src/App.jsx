import React, { useState, useEffect } from 'react';
import axios from 'axios';
import vkBridge from '@vkontakte/vk-bridge';
import { 
  Panel, PanelHeader, Epic, Tabbar, TabbarItem, 
  View, Group, SimpleCell, Badge, Header, Button, Div, SplitLayout, SplitCol,
  ModalRoot, ModalPage, ModalPageHeader, PanelHeaderButton, FormItem, Input, Select, Alert
} from '@vkontakte/vkui';
import { 
  Icon28GraphOutline, 
  Icon28ListOutline, 
  Icon28AddOutline,
  Icon28HomeOutline,
  Icon28CalendarOutline,
  Icon28FolderOutline,
  Icon28SettingsOutline,
  Icon24Done,
  Icon24Play,
  Icon24Replay,
  Icon24ClockOutline,
  Icon24Dismiss
} from '@vkontakte/icons';

const mockTasks = [
  { id: 1, text: "Подготовить квартальный отчет", status: "new", deadline: "2026-05-20", priority: "high", project: "website" },
  { id: 2, text: "Провести дизайн-ревью", status: "new", deadline: "2026-05-18", priority: "urgent", project: "app" },
  { id: 3, text: "Согласовать бюджет с отделом МСБ", status: "pending", deadline: "2026-05-22", priority: "medium", project: "brandbook" },
  { id: 4, text: "Обновить документацию API", status: "pending", deadline: "2026-05-25", priority: "low", project: "app" },
  { id: 5, text: "Подготовить презентацию", status: "pending", deadline: "2026-05-28", priority: "medium", project: "website" },
];

// Безопасная работа с localStorage (защита от падений в Safari на iOS)
const safeStorage = {
  getItem: (key) => {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  },
  setItem: (key, value) => {
    try { localStorage.setItem(key, value); } catch (e) {}
  }
};

export default function App() {
  const [activeStory, setActiveStory] = useState('dashboard');
  const [tasks, setTasks] = useState(mockTasks);
  const [users, setUsers] = useState([]);
  const [activeModal, setActiveModal] = useState(null);
  const [popout, setPopout] = useState(null);
  const [newTaskText, setNewTaskText] = useState('');
  const [editTaskStatus, setEditTaskStatus] = useState('pending');
  const [newDeadline, setNewDeadline] = useState(new Date().toISOString().split('T')[0]);
  const [newAssignee, setNewAssignee] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [newProject, setNewProject] = useState('none');
  const [filterAssignee, setFilterAssignee] = useState('all'); 
  const [sortBy, setSortBy] = useState('date');
  const [editTaskId, setEditTaskId] = useState(null);
  const [chartTab, setChartTab] = useState('progress'); 
  const [chartPeriod, setChartPeriod] = useState('Неделя'); 
  const [notifications, setNotifications] = useState([]);
  const notificationsCount = notifications.filter(n => !n.is_read).length;

  // Settings
  const [userName, setUserName] = useState(() => safeStorage.getItem('userName') || 'Коллега');
  const [vkUserId, setVkUserId] = useState(() => Number(safeStorage.getItem('vkUserId')) || null);
  const [soundEnabled, setSoundEnabled] = useState(() => safeStorage.getItem('soundEnabled') !== 'false');
  const [showCatHelper, setShowCatHelper] = useState(() => safeStorage.getItem('showCatHelper') !== 'false');

  useEffect(() => {
    safeStorage.setItem('soundEnabled', soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    safeStorage.setItem('showCatHelper', showCatHelper);
  }, [showCatHelper]);

  const playCompletionSound = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      gain1.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.005, audioCtx.currentTime + 0.12);
      osc1.start();
      osc1.stop(audioCtx.currentTime + 0.12);

      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
        gain2.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.005, audioCtx.currentTime + 0.22);
        osc2.start();
        osc2.stop(audioCtx.currentTime + 0.22);
      }, 70);
    } catch (e) {
      console.log('Audio not allowed or supported', e);
    }
  };

  useEffect(() => {
    try {
      vkBridge.send('VKWebAppInit');
      vkBridge.send('VKWebAppGetUserInfo')
        .then(data => {
          if (data.first_name) {
            setUserName(data.first_name);
            safeStorage.setItem('userName', data.first_name);
            if (data.id) {
              setVkUserId(data.id);
              safeStorage.setItem('vkUserId', data.id);
            }
          }
        })
        .catch(err => console.log('VK Bridge error:', err));
    } catch (e) {
      console.log('VK Bridge init failed', e);
    }
    axios.get('https://sticks-writings-bit-frog.trycloudflare.com/api/users')
      .then(res => setUsers(res.data))
      .catch(err => console.log('Backend users not available yet', err));

    axios.get('https://sticks-writings-bit-frog.trycloudflare.com/api/tasks')
      .then(res => {
         if (res.data && res.data.length > 0) setTasks(res.data);
      })
      .catch(err => console.log('Backend tasks not available yet', err));
  }, []);

  useEffect(() => {
    if (users.length === 0) return;
    const matchedUser = users.find(u => 
      (vkUserId && u.vk_id === vkUserId) || 
      (u.full_name && u.full_name.includes(userName))
    );
    const userId = matchedUser ? matchedUser.id : users[0].id;
    
    axios.get(`https://sticks-writings-bit-frog.trycloudflare.com/api/notifications?user_id=${userId}`)
      .then(res => {
        setNotifications(res.data);
      })
      .catch(err => console.error("Could not fetch notifications", err));
  }, [users, vkUserId, userName, tasks]);

  const handleOpenNotifications = () => {
    setActiveModal('notifications');
    if (notificationsCount > 0) {
      const matchedUser = users.find(u => (vkUserId && u.vk_id === vkUserId) || (u.full_name && u.full_name.includes(userName)));
      const userId = matchedUser ? matchedUser.id : users[0].id;
      
      axios.put(`https://sticks-writings-bit-frog.trycloudflare.com/api/notifications/read?user_id=${userId}`)
        .then(() => {
          setNotifications(notifications.map(n => ({ ...n, is_read: true })));
        })
        .catch(err => console.error(err));
    }
  };

  const toggleStatus = (id) => {
    let playSound = false;
    let nextStatus = 'pending';
    const updated = tasks.map(t => {
      if (t.id === id) {
        if (t.status === 'pending') nextStatus = 'new';
        else if (t.status === 'new') { nextStatus = 'done'; playSound = true; }
        else nextStatus = 'pending';
        return { ...t, status: nextStatus };
      }
      return t;
    });
    setTasks(updated);
    if (playSound) playCompletionSound();
    axios.put(`https://sticks-writings-bit-frog.trycloudflare.com/api/tasks/${id}`, { status: nextStatus })
      .catch(err => console.error("Error updating task status", err));
  };

  const changeTaskStatus = (id, newStatus) => {
    let playSound = false;
    const updated = tasks.map(t => {
      if (t.id === id) {
        if (newStatus === 'done' && t.status !== 'done') playSound = true;
        return { ...t, status: newStatus };
      }
      return t;
    });
    setTasks(updated);
    if (playSound) playCompletionSound();
    axios.put(`https://sticks-writings-bit-frog.trycloudflare.com/api/tasks/${id}`, { status: newStatus })
      .catch(err => console.error("Error updating task status", err));
  };

  const confirmDeleteTask = (id) => {
    setPopout(
      <Alert
        actions={[
          {
            title: 'Отмена',
            autoclose: true,
            mode: 'cancel',
          },
          {
            title: 'Удалить',
            autoclose: true,
            mode: 'destructive',
            action: () => {
              setTasks(tasks.filter(t => t.id !== id));
              axios.delete(`https://sticks-writings-bit-frog.trycloudflare.com/api/tasks/${id}`)
                .catch(err => console.error("Error deleting task", err));
            },
          },
        ]}
        actionsLayout="horizontal"
        onClose={() => setPopout(null)}
        header="Подтверждение"
        text="Вы уверены, что хотите удалить эту задачу?"
      />
    );
  };

  const deleteTask = (id) => {
    confirmDeleteTask(id);
  };

  // Фильтруем задачи на доске по исполнителю
  const filteredTasks = tasks.filter(t => {
    if (filterAssignee === 'all') return true;
    return t.assignee && String(t.assignee.id) === String(filterAssignee);
  });

  const priorityWeight = { urgent: 4, high: 3, medium: 2, low: 1 };
  const sortedFilteredTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === 'priority') {
      const wA = priorityWeight[a.priority || 'medium'] || 0;
      const wB = priorityWeight[b.priority || 'medium'] || 0;
      if (wA !== wB) return wB - wA;
    }
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });
  const pendingTasks = sortedFilteredTasks.filter(t => t.status === 'pending');
  const newTasks = sortedFilteredTasks.filter(t => t.status === 'new');
  const doneTasks = sortedFilteredTasks.filter(t => t.status === 'done');
  const progress = tasks.length ? Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100) : 0;
  // Считаем прогресс по проектам динамически
  const getProjPct = (key, defaultPct) => {
    const pTasks = tasks.filter(t => t.project === key);
    return pTasks.length ? Math.round((pTasks.filter(t => t.status === 'done').length / pTasks.length) * 100) : defaultPct;
  };
  const websitePct = getProjPct('website', 75);
  const appPct = getProjPct('app', 40);
  const brandbookPct = getProjPct('brandbook', 100);
  const avgProjectsPct = Math.round((websitePct + appPct + brandbookPct) / 3);

  // Игровая RPG-механика котика:
  const xpPerTask = 100;
  const xpPerLevel = 300;
  const totalCompletedTasks = tasks.filter(t => t.status === 'done').length;
  const totalXp = totalCompletedTasks * xpPerTask;
  
  const catLevel = Math.floor(totalXp / xpPerLevel) + 1;
  const currentLevelXp = totalXp % xpPerLevel;
  const catProgressPercent = Math.round((currentLevelXp / xpPerLevel) * 100);

  // Статистика по приоритетам:
  const getPriorityStats = (priorityKey) => {
    const total = tasks.filter(t => (t.priority || 'medium') === priorityKey).length;
    const completed = tasks.filter(t => (t.priority || 'medium') === priorityKey && t.status === 'done').length;
    const active = total - completed;
    return { total, completed, active };
  };
  
  const urgentStats = getPriorityStats('urgent');
  const highStats = getPriorityStats('high');
  const mediumStats = getPriorityStats('medium');
  const lowStats = getPriorityStats('low');

  // Динамические показатели для шапки графика аналитики:
  const getDynamicChartValue = () => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'done').length;

    if (completedTasks === 0) {
      if (chartTab === 'progress') {
        return {
          val: '0%',
          sub: <span>Вы еще не завершили ни одной задачи. Вперёд! 🐾</span>
        };
      } else if (chartTab === 'priority') {
        return {
          val: '0%',
          sub: <span>Активные приоритетные задачи ждут твоего внимания ⚡</span>
        };
      } else {
        return {
          val: `${avgProjectsPct}%`,
          sub: <span>Средний прогресс по проектам 📦</span>
        };
      }
    }

    if (chartTab === 'progress') {
      return {
        val: `${progress}%`,
        sub: <span>Выполнено {completedTasks} из {totalTasks} задач</span>
      };
    } else if (chartTab === 'priority') {
      const totalP = tasks.length;
      const completedP = tasks.filter(t => t.status === 'done').length;
      const pct = totalP ? Math.round((completedP / totalP) * 100) : 0;
      return {
        val: `${pct}%`,
        sub: <span>Выполнено {completedP} приоритетных задач</span>
      };
    } else {
      return {
        val: `${avgProjectsPct}%`,
        sub: <span>Средний прогресс по активным проектам 📊</span>
      };
    }
  };
  
  const chartValInfo = getDynamicChartValue();

  // Логика котика-ассистента (строго по процентам)
  const getCatMood = () => {
    if (tasks.length === 0) return { img: "/cat_sleepy.png", text: "Сплю... Делать совсем нечего." };
    if (progress < 20) return { img: "/cat_shocked.png", text: "А-а-а! Сколько работы! Паника!" };
    if (progress < 40) return { img: "/cat_sad.png", text: "Мяу... Еще так много задач." };
    if (progress < 60) return { img: "/cat_working.png", text: "За ноутбуком! Я слежу за дедлайнами." };
    if (progress < 100) return { img: "/cat_happy.png", text: "Радость! Отлично идем!" };
    return { img: "/cat_party.png", text: "Мурр! Все задачи выполнены!" };
  };
  const catMood = getCatMood();

  const modal = (
    <ModalRoot activeModal={activeModal} onClose={() => setActiveModal(null)}>
      <ModalPage 
        id="create-task"
        onClose={() => setActiveModal(null)}
        settlingHeight={100}
        dynamicContentHeight={true}
        header={
          <ModalPageHeader
            before={<PanelHeaderButton onClick={() => setActiveModal(null)}><Icon24Dismiss /></PanelHeaderButton>}
          >
            {editTaskId ? 'Редактировать задачу' : 'Новая задача'}
          </ModalPageHeader>
        }
      >
        <FormItem top="Описание задачи">
          <Input 
            type="text" 
            placeholder="Например: Провести презентацию для МСБ" 
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
          />
        </FormItem>
        <FormItem top="Дедлайн">
          <Input 
            type="date" 
            value={newDeadline}
            onChange={(e) => setNewDeadline(e.target.value)}
          />
        </FormItem>
        <FormItem top="Ответственный">
          <Select
            placeholder="Выберите исполнителя"
            value={newAssignee}
            onChange={(e) => setNewAssignee(e.target.value)}
            options={users.map(u => ({ label: u.full_name, value: u.id }))}
          />
        </FormItem>
        <FormItem top="Приоритет">
          <Select
            placeholder="Выберите приоритет"
            value={newPriority}
            onChange={(e) => setNewPriority(e.target.value)}
            options={[
              { label: '🔥 Срочно', value: 'urgent' },
              { label: '⚡ Высокий', value: 'high' },
              { label: '🟢 Средний', value: 'medium' },
              { label: '🔵 Низкий', value: 'low' },
            ]}
          />
        </FormItem>
        <FormItem top="Проект">
          <Select
            placeholder="Выберите проект"
            value={newProject}
            onChange={(e) => setNewProject(e.target.value)}
            options={[
              { label: '📦 Нет проекта', value: 'none' },
              { label: '💻 Разработка сайта', value: 'website' },
              { label: '📱 Мобильное приложение', value: 'app' },
              { label: '🎯 Бренд-бук компании', value: 'brandbook' },
            ]}
          />
        </FormItem>
        <FormItem>
          <button className="custom-modal-btn" style={{ padding: '14px' }} onClick={() => {
            if (newTaskText.trim()) {
              const payload = {
                text: newTaskText,
                status: editTaskId ? editTaskStatus : 'pending',
                deadline: newDeadline,
                assignee_id: newAssignee ? Number(newAssignee) : null,
                priority: newPriority,
                project: newProject !== 'none' ? newProject : null,
              };

              if (editTaskId) {
                axios.put(`https://sticks-writings-bit-frog.trycloudflare.com/api/tasks/${editTaskId}`, payload)
                  .then(res => {
                    setTasks(tasks.map(t => t.id === editTaskId ? { ...res.data, priority: newPriority, project: newProject !== 'none' ? newProject : null } : t));
                  })
                  .catch(err => console.error(err));
              } else {
                let authorId = 1;
                if (users.length > 0) {
                  const matchedUser = users.find(u => 
                    (vkUserId && u.vk_id === vkUserId) || 
                    (u.full_name && u.full_name.includes(userName))
                  );
                  authorId = matchedUser ? matchedUser.id : users[0].id;
                }
                axios.post(`https://sticks-writings-bit-frog.trycloudflare.com/api/tasks?author_id=${authorId}`, payload)
                  .then(res => setTasks([{ ...res.data, priority: newPriority, project: newProject !== 'none' ? newProject : null }, ...tasks]))
                  .catch(err => {
                    console.log('Using mock post', err);
                    setTasks([{
                      id: Date.now(),
                      ...payload,
                      assignee: users.find(u => u.id === Number(newAssignee))
                    }, ...tasks]);
                  });
              }

              setNewTaskText('');
              setNewAssignee('');
              setNewPriority('medium');
              setNewProject('none');
              setEditTaskId(null);
              setActiveModal(null);
              setActiveStory('board'); 
            }
          }}>
            {editTaskId ? 'Сохранить' : 'Создать задачу'}
          </button>
        </FormItem>
      </ModalPage>
        <ModalPage
          id="notifications"
          onClose={() => setActiveModal(null)}
          header={
            <ModalPageHeader
              right={<PanelHeaderButton onClick={() => setActiveModal(null)}><Icon24Dismiss /></PanelHeaderButton>}
            >
              <span style={{ fontSize: '20px', fontWeight: '800' }}>Уведомления</span>
            </ModalPageHeader>
          }
        >
          <Div style={{ padding: '0 16px 100px 16px', maxHeight: '60vh', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
                <div style={{ color: '#8E92A2', fontSize: '15px', fontWeight: '600' }}>Нет новых уведомлений</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                {notifications.map(notif => (
                  <div key={notif.id} style={{ 
                    padding: '16px', 
                    background: notif.is_read ? '#F8F9FA' : 'linear-gradient(135deg, rgba(138,43,226,0.08) 0%, rgba(138,43,226,0.02) 100%)', 
                    borderRadius: '16px',
                    border: notif.is_read ? '1px solid rgba(0,0,0,0.04)' : '1px solid rgba(138,43,226,0.15)',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'flex-start',
                    boxShadow: notif.is_read ? 'none' : '0 8px 24px rgba(138,43,226,0.06)'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      background: notif.is_read ? '#EAECEF' : 'linear-gradient(135deg, #8A2BE2, #B92BE2)',
                      color: notif.is_read ? '#8E92A2' : '#FFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px',
                      flexShrink: 0,
                      boxShadow: notif.is_read ? 'none' : '0 4px 12px rgba(138,43,226,0.3)'
                    }}>
                      {notif.is_read ? '🔔' : '✨'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: '700', lineHeight: '1.4', color: '#1C1C1E', marginBottom: '6px' }}>
                        {notif.text}
                      </div>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: notif.is_read ? '#A0A3B1' : '#8A2BE2' }}>
                        {new Date(notif.created_at).toLocaleString('ru-RU', { hour: '2-digit', minute:'2-digit', day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                    {!notif.is_read && (
                      <div style={{ width: '8px', height: '8px', background: '#FF3B30', borderRadius: '50%', flexShrink: 0, marginTop: '4px', boxShadow: '0 0 8px rgba(255,59,48,0.6)' }}></div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Div>
        </ModalPage>
    </ModalRoot>
  );

  return (
    <SplitLayout modal={modal} popout={popout}>
      <SplitCol>
        <div className="custom-app-layout">
          {/* ЛЕВЫЙ САЙДБАР */}
          <aside className="left-sidebar">
            <div className="logo-section">
              <span className="logo-icon">🎯</span>
              <h2 className="logo-title">Управление<br/>задачами</h2>
            </div>
            
            <nav className="sidebar-menu">
              <button 
                className={`menu-item ${activeStory === 'dashboard' ? 'active' : ''}`}
                onClick={() => setActiveStory('dashboard')}
              >
                <Icon28HomeOutline width={20} height={20} />
                <span>Главная</span>
              </button>
              <button 
                className={`menu-item ${activeStory === 'board' ? 'active' : ''}`}
                onClick={() => setActiveStory('board')}
              >
                <Icon28ListOutline width={20} height={20} />
                <span>Задачи</span>
              </button>
              <button 
                className={`menu-item ${activeStory === 'calendar' ? 'active' : ''}`}
                onClick={() => setActiveStory('calendar')}
              >
                <Icon28CalendarOutline width={20} height={20} />
                <span>Календарь</span>
              </button>
              <button 
                className={`menu-item ${activeStory === 'statistics' ? 'active' : ''}`}
                onClick={() => setActiveStory('statistics')}
              >
                <Icon28GraphOutline width={20} height={20} />
                <span>Статистика</span>
              </button>
              <button 
                className={`menu-item ${activeStory === 'projects' ? 'active' : ''}`}
                onClick={() => setActiveStory('projects')}
              >
                <Icon28FolderOutline width={20} height={20} />
                <span>Проекты</span>
              </button>
              <button 
                className={`menu-item ${activeStory === 'settings' ? 'active' : ''}`}
                onClick={() => setActiveStory('settings')}
              >
                <Icon28SettingsOutline width={20} height={20} />
                <span>Настройки</span>
              </button>
              <button 
                className={`menu-item ${activeStory === 'pet' ? 'active' : ''}`}
                onClick={() => setActiveStory('pet')}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', marginRight: '0' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.5 11.5c0 5-4.5 9-8.5 9s-8.5-4-8.5-9"/>
                    <path d="M3.5 11.5l-2-6.5 6 2"/>
                    <path d="M20.5 11.5l2-6.5-6 2"/>
                    <circle cx="8" cy="11" r="1.2" fill="currentColor" stroke="none"/>
                    <circle cx="16" cy="11" r="1.2" fill="currentColor" stroke="none"/>
                    <path d="M10.5 13.5c.5.5 1 1 1.5 0 .5 1 1 .5 1.5 0" />
                    <path d="M2 13h3M1 16h3M22 13h-3M23 16h-3" />
                  </svg>
                </div>
                <span>Мой питомец</span>
              </button>
            </nav>
 
            {/* Кнопка Новая задача */}
            <button className="new-task-btn-sidebar" onClick={() => {
              setNewTaskText('');
              setNewAssignee('');
              setNewPriority('medium');
              setNewProject('none');
              setEditTaskId(null);
              setEditTaskStatus('pending');
              setActiveModal('create-task');
            }}>
              Новая задача <span className="plus-icon">+</span>
            </button>
          </aside>
 
          {/* ЦЕНТРАЛЬНАЯ ЧАСТЬ */}
          <main className="center-workspace">
            {/* Шапка приветствия и поиска */}
            <header className="workspace-header">
              <div className="greeting-block">
                <h1 className="greeting-title">Привет, {userName}! 👋</h1>
                <p className="greeting-subtitle">У тебя отличный день для продуктивной работы</p>
              </div>
              <div className="top-actions">
                <div className="search-bar">
                  <span className="search-icon">🔍</span>
                  <input type="text" placeholder="Поиск задач..." />
                </div>
                <div className="notification-bell" onClick={handleOpenNotifications}>
                  <span>🔔</span>
                  {notificationsCount > 0 && <span className="bell-badge">{notificationsCount}</span>}
                </div>
              </div>
            </header>

            {activeStory === 'dashboard' ? (
              /* ГЛАВНАЯ СТРАНИЦА ДАШБОРДА */
              <div className="dashboard-content">
                {/* Карточки-счетчики */}
                <div className="summary-cards">
                  <div className="summary-card pending-summary" onClick={() => setActiveStory('board')}>
                    <div className="summary-icon-bg pending-bg">⏳</div>
                    <div className="summary-info">
                      <span className="summary-label">К выполнению</span>
                      <h3 className="summary-count">{pendingTasks.length} задач</h3>
                    </div>
                    <button className="summary-action-btn">Посмотреть</button>
                  </div>

                  <div className="summary-card in-progress-summary" onClick={() => setActiveStory('board')}>
                    <div className="summary-icon-bg in-progress-bg">⚡</div>
                    <div className="summary-info">
                      <span className="summary-label">В работе</span>
                      <h3 className="summary-count">{newTasks.length} задачи</h3>
                    </div>
                    <button className="summary-action-btn">Посмотреть</button>
                  </div>

                  <div className="summary-card done-summary" onClick={() => setActiveStory('board')}>
                    <div className="summary-icon-bg done-bg">✅</div>
                    <div className="summary-info">
                      <span className="summary-label">Выполнено</span>
                      <h3 className="summary-count">{doneTasks.length} задач</h3>
                    </div>
                    <button className="summary-action-btn">Посмотреть</button>
                  </div>
                </div>

                {/* Секция с графиком и приоритетами */}
                <div className="progress-priority-section">
                  {/* График прогресса */}
                  <div className="dashboard-glass-card progress-chart-card">
                    <div className="chart-header">
                      <div className="chart-tabs">
                        <span 
                          className={`chart-tab ${chartTab === 'progress' ? 'active' : ''}`}
                          onClick={() => setChartTab('progress')}
                          style={{ cursor: 'pointer' }}
                        >
                          Прогресс
                        </span>
                        <span 
                          className={`chart-tab ${chartTab === 'priority' ? 'active' : ''}`}
                          onClick={() => setChartTab('priority')}
                          style={{ cursor: 'pointer' }}
                        >
                          По приоритетам
                        </span>
                        <span 
                          className={`chart-tab ${chartTab === 'projects' ? 'active' : ''}`}
                          onClick={() => setChartTab('projects')}
                          style={{ cursor: 'pointer' }}
                        >
                          По проектам
                        </span>
                      </div>
                      <select 
                        className="chart-period-select" 
                        value={chartPeriod} 
                        onChange={(e) => setChartPeriod(e.target.value)}
                        style={{
                          fontSize: '13px',
                          fontWeight: '700',
                          color: '#8A2BE2',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          outline: 'none'
                        }}
                      >
                        <option value="Неделя">Неделя ▾</option>
                        <option value="Месяц">Месяц ▾</option>
                        <option value="Год">Год ▾</option>
                      </select>
                    </div>
                    
                    <div className="chart-value-block">
                      <h2 className="chart-percentage">{chartValInfo.val}</h2>
                      <span className="chart-percentage-sub">{chartValInfo.sub}</span>
                    </div>

                    <div className="svg-chart-container" style={{ minHeight: '120px', display: 'flex', alignItems: 'center' }}>
                      {chartTab === 'progress' && (
                        <>
                          {chartPeriod === 'Неделя' && (
                            <svg viewBox="0 0 500 130" className="smooth-area-chart" preserveAspectRatio="none">
                              <defs>
                                <linearGradient id="chart-grad-week" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#8A2BE2" stopOpacity="0.2" />
                                  <stop offset="100%" stopColor="#8A2BE2" stopOpacity="0.0" />
                                </linearGradient>
                              </defs>
                              <path 
                                d={totalCompletedTasks === 0 ? "M 0 120 L 500 120 L 500 130 L 0 130 Z" : "M 0 100 C 70 95, 140 70, 210 75 C 280 80, 350 45, 420 50 L 500 40 L 500 130 L 0 130 Z"} 
                                fill="url(#chart-grad-week)"
                              />
                              <path 
                                d={totalCompletedTasks === 0 ? "M 0 120 L 500 120" : "M 0 100 C 70 95, 140 70, 210 75 C 280 80, 350 45, 420 50 L 500 40"} 
                                fill="none" 
                                stroke="#8A2BE2" 
                                strokeWidth="3"
                                strokeDasharray={totalCompletedTasks === 0 ? "5,5" : "none"}
                              />
                              <circle cx="210" cy={totalCompletedTasks === 0 ? "120" : "75"} r="4" fill="#8A2BE2" stroke="#fff" strokeWidth="2" />
                              <circle cx="350" cy={totalCompletedTasks === 0 ? "120" : "45"} r="4" fill="#8A2BE2" stroke="#fff" strokeWidth="2" />
                              <circle cx="500" cy={totalCompletedTasks === 0 ? "120" : "40"} r="4" fill="#8A2BE2" stroke="#fff" strokeWidth="2" />
                            </svg>
                          )}
                          {chartPeriod === 'Месяц' && (
                            <svg viewBox="0 0 500 130" className="smooth-area-chart" preserveAspectRatio="none">
                              <defs>
                                <linearGradient id="chart-grad-month" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#8A2BE2" stopOpacity="0.2" />
                                  <stop offset="100%" stopColor="#8A2BE2" stopOpacity="0.0" />
                                </linearGradient>
                              </defs>
                              <path 
                                d={totalCompletedTasks === 0 ? "M 0 120 L 500 120 L 500 130 L 0 130 Z" : "M 0 110 C 100 80, 180 50, 250 85 C 320 120, 400 30, 450 60 L 500 30 L 500 130 L 0 130 Z"} 
                                fill="url(#chart-grad-month)"
                              />
                              <path 
                                d={totalCompletedTasks === 0 ? "M 0 120 L 500 120" : "M 0 110 C 100 80, 180 50, 250 85 C 320 120, 400 30, 450 60 L 500 30"} 
                                fill="none" 
                                stroke="#8A2BE2" 
                                strokeWidth="3"
                                strokeDasharray={totalCompletedTasks === 0 ? "5,5" : "none"}
                              />
                              <circle cx="250" cy={totalCompletedTasks === 0 ? "120" : "85"} r="4" fill="#8A2BE2" stroke="#fff" strokeWidth="2" />
                              <circle cx="450" cy={totalCompletedTasks === 0 ? "120" : "60"} r="4" fill="#8A2BE2" stroke="#fff" strokeWidth="2" />
                              <circle cx="500" cy={totalCompletedTasks === 0 ? "120" : "30"} r="4" fill="#8A2BE2" stroke="#fff" strokeWidth="2" />
                            </svg>
                          )}
                          {chartPeriod === 'Год' && (
                            <svg viewBox="0 0 500 130" className="smooth-area-chart" preserveAspectRatio="none">
                              <defs>
                                <linearGradient id="chart-grad-year" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#8A2BE2" stopOpacity="0.2" />
                                  <stop offset="100%" stopColor="#8A2BE2" stopOpacity="0.0" />
                                </linearGradient>
                              </defs>
                              <path 
                                d={totalCompletedTasks === 0 ? "M 0 120 L 500 120 L 500 130 L 0 130 Z" : "M 0 120 C 120 110, 220 30, 320 60 C 380 90, 440 20, 480 40 L 500 20 L 500 130 L 0 130 Z"} 
                                fill="url(#chart-grad-year)"
                              />
                              <path 
                                d={totalCompletedTasks === 0 ? "M 0 120 L 500 120" : "M 0 120 C 120 110, 220 30, 320 60 C 380 90, 440 20, 480 40 L 500 20"} 
                                fill="none" 
                                stroke="#8A2BE2" 
                                strokeWidth="3"
                                strokeDasharray={totalCompletedTasks === 0 ? "5,5" : "none"}
                              />
                              <circle cx="320" cy={totalCompletedTasks === 0 ? "120" : "60"} r="4" fill="#8A2BE2" stroke="#fff" strokeWidth="2" />
                              <circle cx="480" cy={totalCompletedTasks === 0 ? "120" : "40"} r="4" fill="#8A2BE2" stroke="#fff" strokeWidth="2" />
                              <circle cx="500" cy={totalCompletedTasks === 0 ? "120" : "20"} r="4" fill="#8A2BE2" stroke="#fff" strokeWidth="2" />
                            </svg>
                          )}
                        </>
                      )}

                      {chartTab === 'priority' && (
                        <div className="priority-chart-bars" style={{ padding: '10px 0', display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
                          <div className="priority-bar-item">
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>
                              <span style={{ color: '#FF3B30' }}>🔥 Срочно</span>
                              <span>{urgentStats.completed} из {urgentStats.total} выполнено ({urgentStats.active} активных)</span>
                            </div>
                            <div style={{ height: '8px', background: 'rgba(0,0,0,0.04)', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', background: '#FF3B30', width: `${(urgentStats.completed / urgentStats.total || 0) * 100}%`, borderRadius: '4px' }}></div>
                            </div>
                          </div>
                          <div className="priority-bar-item">
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>
                              <span style={{ color: '#FF9500' }}>⚡ Высокий</span>
                              <span>{highStats.completed} из {highStats.total} выполнено ({highStats.active} активных)</span>
                            </div>
                            <div style={{ height: '8px', background: 'rgba(0,0,0,0.04)', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', background: '#FF9500', width: `${(highStats.completed / highStats.total || 0) * 100}%`, borderRadius: '4px' }}></div>
                            </div>
                          </div>
                          <div className="priority-bar-item">
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>
                              <span style={{ color: '#34C759' }}>🟢 Средний</span>
                              <span>{mediumStats.completed} из {mediumStats.total} выполнено ({mediumStats.active} активных)</span>
                            </div>
                            <div style={{ height: '8px', background: 'rgba(0,0,0,0.04)', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', background: '#34C759', width: `${(mediumStats.completed / mediumStats.total || 0) * 100}%`, borderRadius: '4px' }}></div>
                            </div>
                          </div>
                          <div className="priority-bar-item">
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>
                              <span style={{ color: '#007AFF' }}>🔵 Низкий</span>
                              <span>{lowStats.completed} из {lowStats.total} выполнено ({lowStats.active} активных)</span>
                            </div>
                            <div style={{ height: '8px', background: 'rgba(0,0,0,0.04)', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', background: '#007AFF', width: `${(lowStats.completed / lowStats.total || 0) * 100}%`, borderRadius: '4px' }}></div>
                            </div>
                          </div>
                        </div>
                      )}

                      {chartTab === 'projects' && (
                        <div className="projects-chart-bars" style={{ padding: '10px 0', display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
                          <div className="project-bar-item">
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>
                              <span>📦 Разработка сайта</span>
                              <span style={{ color: '#8A2BE2' }}>{websitePct}%</span>
                            </div>
                            <div style={{ height: '8px', background: 'rgba(0,0,0,0.04)', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', background: '#8A2BE2', width: `${websitePct}%`, borderRadius: '4px', transition: 'width 0.3s ease' }}></div>
                            </div>
                          </div>
                          <div className="project-bar-item">
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>
                              <span>📱 Мобильное приложение</span>
                              <span style={{ color: '#FF9500' }}>{appPct}%</span>
                            </div>
                            <div style={{ height: '8px', background: 'rgba(0,0,0,0.04)', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', background: '#FF9500', width: `${appPct}%`, borderRadius: '4px', transition: 'width 0.3s ease' }}></div>
                            </div>
                          </div>
                          <div className="project-bar-item">
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>
                              <span>🎯 Бренд-бук компании</span>
                              <span style={{ color: '#34C759' }}>{brandbookPct}%</span>
                            </div>
                            <div style={{ height: '8px', background: 'rgba(0,0,0,0.04)', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', background: '#34C759', width: `${brandbookPct}%`, borderRadius: '4px', transition: 'width 0.3s ease' }}></div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {chartTab === 'progress' && (
                      <div className="chart-days" style={{ marginTop: '12px' }}>
                        <span>Пн</span><span>Вт</span><span>Ср</span><span>Чт</span><span>Пт</span><span>Сб</span><span>Вс</span>
                      </div>
                    )}
                  </div>

                  {/* Приоритетные задачи */}
                  <div className="dashboard-glass-card priority-list-card">
                    <h3 className="section-title">Приоритетные задачи</h3>
                    <div className="priority-items">
                      {tasks.filter(t => t.status !== 'done').length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '20px 0', color: '#8E92A2', fontSize: '13px', fontWeight: '600' }}>
                          🎉 Все приоритетные задачи выполнены!
                        </div>
                      ) : (
                        tasks.filter(t => t.status !== 'done').slice(0, 4).map((task) => {
                          const pInfo = (() => {
                            switch(task.priority || 'medium') {
                              case 'urgent': return { label: 'Срочно', color: '#FF3B30' };
                              case 'high': return { label: 'Высокий', color: '#FF9500' };
                              case 'low': return { label: 'Низкий', color: '#007AFF' };
                              default: return { label: 'Средний', color: '#34C759' };
                            }
                          })();
                          return (
                            <div key={task.id} className="priority-item">
                              <span className="priority-dot" style={{ background: pInfo.color }}></span>
                              <span className="priority-text">{task.text}</span>
                              <span className="priority-tag" style={{ color: pInfo.color, background: `${pInfo.color}15` }}>
                                {pInfo.label}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* Нижний ряд: Проекты и Дедлайны */}
                <div className="bottom-dashboard-row">
                  {/* Активные проекты */}
                  <div className="dashboard-glass-card projects-card" onClick={() => setActiveStory('projects')} style={{ cursor: 'pointer' }}>
                    <div className="card-header-row">
                      <h3 className="section-title">Активные проекты</h3>
                      <span className="see-all-link">Посмотреть все</span>
                    </div>
                    <div className="project-list">
                      <div className="project-item">
                        <div className="project-info">
                          <span className="project-name">Разработка сайта</span>
                          <span className="project-pct">{websitePct}%</span>
                        </div>
                        <div className="project-bar"><div className="project-bar-fill" style={{ width: `${websitePct}%`, background: '#8A2BE2', transition: 'width 0.3s ease' }}></div></div>
                      </div>
                      <div className="project-item">
                        <div className="project-info">
                          <span className="project-name">Мобильное приложение</span>
                          <span className="project-pct">{appPct}%</span>
                        </div>
                        <div className="project-bar"><div className="project-bar-fill" style={{ width: `${appPct}%`, background: '#FF9500', transition: 'width 0.3s ease' }}></div></div>
                      </div>
                      <div className="project-item">
                        <div className="project-info">
                          <span className="project-name">Бренд-бук компании</span>
                          <span className="project-pct">{brandbookPct}%</span>
                        </div>
                        <div className="project-bar"><div className="project-bar-fill" style={{ width: `${brandbookPct}%`, background: '#34C759', transition: 'width 0.3s ease' }}></div></div>
                      </div>
                    </div>
                  </div>
                  {/* Ближайшие дедлайны */}
                  <div className="dashboard-glass-card deadlines-card">
                    <div className="card-header-row">
                      <h3 className="section-title">Ближайшие дедлайны</h3>
                      <span className="see-all-link" onClick={() => setActiveStory('calendar')} style={{ cursor: 'pointer' }}>Календарь</span>
                    </div>
                    <div className="deadline-list">
                      {(() => {
                        const activeTasksWithDeadlines = tasks
                          .filter(t => t.status !== 'done' && t.deadline)
                          .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

                        if (activeTasksWithDeadlines.length === 0) {
                          return (
                            <div style={{ textAlign: 'center', color: '#8E92A2', fontSize: '13px', padding: '20px 0', fontWeight: '600' }}>
                              🎉 Нет активных задач с дедлайнами!
                            </div>
                          );
                        }

                        const getPriorityLabel = (priority) => {
                          switch (priority) {
                            case 'urgent': return { label: 'Срочно 🔥', color: '#FF3B30' };
                            case 'high': return { label: 'Высокий ⚡', color: '#FF9500' };
                            case 'medium': return { label: 'Средний 🟢', color: '#34C759' };
                            case 'low': return { label: 'Низкий 🔵', color: '#007AFF' };
                            default: return { label: 'Средний 🟢', color: '#34C759' };
                          }
                        };

                        return activeTasksWithDeadlines.slice(0, 3).map((task, idx) => {
                          const pInfo = getPriorityLabel(task.priority);
                          const deadlineDate = new Date(task.deadline);
                          const formattedDate = deadlineDate.toLocaleDateString('ru-RU', {
                            month: 'short',
                            day: 'numeric'
                          });
                          return (
                            <div key={task.id || idx} className="deadline-item">
                              <div className="deadline-info">
                                <span className="deadline-name">📋 {task.text}</span>
                                <span className="deadline-time">⏰ До {formattedDate}</span>
                              </div>
                              <span className="deadline-tag" style={{ background: `${pInfo.color}15`, color: pInfo.color }}>
                                {pInfo.label}
                              </span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>

                {/* Совет дня */}
                <div className="advice-banner">
                  <span className="advice-icon">💡</span>
                  <p className="advice-text">
                    <strong>Совет дня:</strong> Разбей большую задачу на маленькие шаги — так она станет не такой пугающей!
                  </p>
                  <button className="advice-btn" onClick={(e) => e.target.parentElement.style.display = 'none'}>Понял, спасибо!</button>
                </div>

              </div>
            ) : activeStory === 'board' ? (
              /* СТРАНИЦА KANBAN ДОСКИ (НАШИ ГОРЯЧИЕ КОЛОНКИ) */
              <div className="board-content-wrapper">
                <div className="board-header-row" style={{ display: 'flex', gap: '10px' }}>
                  <select 
                    className="filter-dropdown" 
                    value={sortBy} 
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="date">По новизне</option>
                    <option value="priority">По приоритету</option>
                  </select>
                  <select 
                    className="filter-dropdown" 
                    value={filterAssignee} 
                    onChange={(e) => setFilterAssignee(e.target.value)}
                  >
                    <option value="all">Все исполнители</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.full_name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="board-container">
                  {/* КОЛОНКА 1: ОЖИДАЮТ (БЭКЛОГ) */}
                  <div className="kanban-column">
                    <div className="column-header">
                      <span className="column-title">⏳ К выполнению</span>
                      <span className="column-badge">{pendingTasks.length}</span>
                    </div>
                    <div className="task-list">
                      {pendingTasks.map(task => (
                        <div key={task.id} className="glass-card task-card pending-card">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <p className="task-text">{task.text}</p>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button className="edit-task-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', opacity: 0.7 }} onClick={(e) => {
                                e.stopPropagation();
                                setEditTaskId(task.id);
                                setNewTaskText(task.text);
                                setEditTaskStatus(task.status || 'pending');
                                setNewDeadline(task.deadline || '');
                                setNewAssignee(task.assignee ? String(task.assignee.id) : '');
                                setNewPriority(task.priority || 'medium');
                                setNewProject(task.project || 'none');
                                setActiveModal('create-task');
                              }}>✏️</button>
                              <button className="delete-task-btn" onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}>✕</button>
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', marginBottom: '8px' }}>
                            <div style={{ fontSize: '10px', color: '#8E92A2' }}>
                              {task.author ? `От кого: ${task.author.full_name}` : ''}
                            </div>
                            {(() => {
                              switch(task.priority) {
                                case 'urgent': return <span style={{fontSize: '10px', fontWeight: '800', color: '#FF3B30', background: '#FF3B3015', padding: '2px 6px', borderRadius: '4px'}}>🔥 Срочно</span>;
                                case 'high': return <span style={{fontSize: '10px', fontWeight: '800', color: '#FF9500', background: '#FF950015', padding: '2px 6px', borderRadius: '4px'}}>⚡ Высокий</span>;
                                case 'low': return <span style={{fontSize: '10px', fontWeight: '800', color: '#007AFF', background: '#007AFF15', padding: '2px 6px', borderRadius: '4px'}}>🔵 Низкий</span>;
                                default: return <span style={{fontSize: '10px', fontWeight: '800', color: '#34C759', background: '#34C75915', padding: '2px 6px', borderRadius: '4px'}}>🟢 Средний</span>;
                              }
                            })()}
                          </div>
                          <div className="task-footer">
                            <div className="task-meta">
                              <span className="deadline" style={{ color: new Date(task.deadline) < new Date() ? '#ff453a' : 'rgba(0,0,0,0.5)' }}>
                                ⏳ {task.deadline || 'Без срока'}
                              </span>
                              {task.assignee && (
                                <span className="assignee">
                                  <span className="avatar-initials">{task.assignee.full_name[0]}</span>
                                  {task.assignee.full_name.split(' ')[0]}
                                </span>
                              )}
                            </div>
                            <button className="action-pill-btn done-btn" onClick={() => changeTaskStatus(task.id, 'new')}>
                              <Icon24Play width={14} height={14} /> В работу
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* КОЛОНКА 2: В РАБОТЕ */}
                  <div className="kanban-column">
                    <div className="column-header">
                      <span className="column-title">⚡ В работе</span>
                      <span className="column-badge">{newTasks.length}</span>
                    </div>
                    <div className="task-list">
                      {newTasks.map(task => (
                        <div key={task.id} className="glass-card task-card in-progress-card">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <p className="task-text">{task.text}</p>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button className="edit-task-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', opacity: 0.7 }} onClick={(e) => {
                                e.stopPropagation();
                                setEditTaskId(task.id);
                                setNewTaskText(task.text);
                                setEditTaskStatus(task.status || 'pending');
                                setNewDeadline(task.deadline || '');
                                setNewAssignee(task.assignee ? String(task.assignee.id) : '');
                                setNewPriority(task.priority || 'medium');
                                setNewProject(task.project || 'none');
                                setActiveModal('create-task');
                              }}>✏️</button>
                              <button className="delete-task-btn" onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}>✕</button>
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', marginBottom: '8px' }}>
                            <div style={{ fontSize: '10px', color: '#8E92A2' }}>
                              {task.author ? `От кого: ${task.author.full_name}` : ''}
                            </div>
                            {(() => {
                              switch(task.priority) {
                                case 'urgent': return <span style={{fontSize: '10px', fontWeight: '800', color: '#FF3B30', background: '#FF3B3015', padding: '2px 6px', borderRadius: '4px'}}>🔥 Срочно</span>;
                                case 'high': return <span style={{fontSize: '10px', fontWeight: '800', color: '#FF9500', background: '#FF950015', padding: '2px 6px', borderRadius: '4px'}}>⚡ Высокий</span>;
                                case 'low': return <span style={{fontSize: '10px', fontWeight: '800', color: '#007AFF', background: '#007AFF15', padding: '2px 6px', borderRadius: '4px'}}>🔵 Низкий</span>;
                                default: return <span style={{fontSize: '10px', fontWeight: '800', color: '#34C759', background: '#34C75915', padding: '2px 6px', borderRadius: '4px'}}>🟢 Средний</span>;
                              }
                            })()}
                          </div>
                          <div className="task-footer">
                            <div className="task-meta">
                              <span className="deadline" style={{ color: new Date(task.deadline) < new Date() ? '#ff453a' : 'rgba(0,0,0,0.5)' }}>
                                ⏳ {task.deadline || 'Без срока'}
                              </span>
                              {task.assignee && (
                                <span className="assignee">
                                  <span className="avatar-initials">{task.assignee.full_name[0]}</span>
                                  {task.assignee.full_name.split(' ')[0]}
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button className="action-pill-btn revert-btn" style={{ background: '#FF950020', color: '#FF9500', display: 'flex', alignItems: 'center', gap: '4px', border: 'none', padding: '6px 12px', borderRadius: '16px', fontWeight: '700', fontSize: '11px', cursor: 'pointer' }} onClick={() => changeTaskStatus(task.id, 'pending')}>
                                <Icon24Replay width={14} height={14} /> Отложить
                              </button>
                              <button className="action-pill-btn done-btn" onClick={() => changeTaskStatus(task.id, 'done')}>
                                <Icon24Done width={14} height={14} /> Выполнить
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* КОЛОНКА 3: ВЫПОЛНЕНО */}
                  <div className="kanban-column">
                    <div className="column-header">
                      <span className="column-title">✅ Выполнено</span>
                      <span className="column-badge">{doneTasks.length}</span>
                    </div>
                    <div className="task-list">
                      {doneTasks.map(task => (
                        <div key={task.id} className="glass-card task-card done-card">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <p className="task-text">{task.text}</p>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button className="edit-task-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', opacity: 0.7 }} onClick={(e) => {
                                e.stopPropagation();
                                setEditTaskId(task.id);
                                setNewTaskText(task.text);
                                setEditTaskStatus(task.status || 'pending');
                                setNewDeadline(task.deadline || '');
                                setNewAssignee(task.assignee ? String(task.assignee.id) : '');
                                setNewPriority(task.priority || 'medium');
                                setNewProject(task.project || 'none');
                                setActiveModal('create-task');
                              }}>✏️</button>
                              <button className="delete-task-btn" onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}>✕</button>
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', marginBottom: '8px' }}>
                            <div style={{ fontSize: '10px', color: '#8E92A2' }}>
                              {task.author ? `От кого: ${task.author.full_name}` : ''}
                            </div>
                            {(() => {
                              switch(task.priority) {
                                case 'urgent': return <span style={{fontSize: '10px', fontWeight: '800', color: '#FF3B30', background: '#FF3B3015', padding: '2px 6px', borderRadius: '4px'}}>🔥 Срочно</span>;
                                case 'high': return <span style={{fontSize: '10px', fontWeight: '800', color: '#FF9500', background: '#FF950015', padding: '2px 6px', borderRadius: '4px'}}>⚡ Высокий</span>;
                                case 'low': return <span style={{fontSize: '10px', fontWeight: '800', color: '#007AFF', background: '#007AFF15', padding: '2px 6px', borderRadius: '4px'}}>🔵 Низкий</span>;
                                default: return <span style={{fontSize: '10px', fontWeight: '800', color: '#34C759', background: '#34C75915', padding: '2px 6px', borderRadius: '4px'}}>🟢 Средний</span>;
                              }
                            })()}
                          </div>
                          <div className="task-footer">
                            <div className="task-meta">
                              <span className="deadline done-deadline">✅ Завершено</span>
                              {task.assignee && (
                                <span className="assignee">
                                  <span className="avatar-initials">{task.assignee.full_name[0]}</span>
                                  {task.assignee.full_name.split(' ')[0]}
                                </span>
                              )}
                            </div>
                            <button className="action-pill-btn revert-btn" onClick={() => changeTaskStatus(task.id, 'new')}>
                              <Icon24Replay width={14} height={14} /> Вернуть
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : activeStory === 'calendar' ? (
              /* СТРАНИЦА КАЛЕНДАРЯ */
              <div className="calendar-content-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: '800' }}>📅 Расписание задач</h2>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#8A2BE2', background: 'rgba(138,43,226,0.1)', padding: '6px 12px', borderRadius: '12px' }}>
                    {["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"][new Date().getMonth()]} {new Date().getFullYear()}
                  </span>
                </div>
                
                <div className="dashboard-glass-card calendar-card" style={{ padding: '20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '8px', textAlign: 'center', fontWeight: '700', fontSize: '12px', color: '#8E92A2', marginBottom: '14px' }}>
                    <span>Пн</span><span>Вт</span><span>Ср</span><span>Чт</span><span>Пт</span><span>Сб</span><span>Вс</span>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '8px' }}>
                    {[...Array(new Date(new Date().getFullYear(), new Date().getMonth(), 1).getDay() === 0 ? 6 : new Date(new Date().getFullYear(), new Date().getMonth(), 1).getDay() - 1)].map((_, i) => (
                      <div key={`empty-${i}`} style={{ height: '80px', borderRadius: '8px', background: 'rgba(0,0,0,0.01)' }}></div>
                    ))}
                    
                    {[...Array(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate())].map((_, i) => {
                      const dayNum = i + 1;
                      const mStr = (new Date().getMonth() + 1).toString().padStart(2, '0');
                      const dateStr = `${new Date().getFullYear()}-${mStr}-${dayNum < 10 ? '0' + dayNum : dayNum}`;
                      const dayTasks = tasks.filter(t => t.deadline === dateStr);
                      return (
                        <div key={dayNum} style={{ 
                          height: '80px', 
                          borderRadius: '8px', 
                          background: dayTasks.length > 0 ? 'rgba(138,43,226,0.03)' : '#fff', 
                          border: dayTasks.length > 0 ? '1px solid rgba(138,43,226,0.12)' : '1px solid rgba(0,0,0,0.04)',
                          padding: '6px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          position: 'relative'
                        }}>
                          <span style={{ fontSize: '11px', fontWeight: '800', color: dayTasks.length > 0 ? '#8A2BE2' : '#8E92A2' }}>{dayNum}</span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto', maxHeight: '50px' }}>
                            {dayTasks.map(t => (
                              <div key={t.id} style={{ 
                                fontSize: '9px', 
                                fontWeight: '700', 
                                padding: '2px 4px', 
                                borderRadius: '4px', 
                                background: t.status === 'done' ? '#34C75920' : '#8A2BE215', 
                                color: t.status === 'done' ? '#34C759' : '#8A2BE2',
                                textDecoration: t.status === 'done' ? 'line-through' : 'none',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                               }}>
                                 {t.text}
                               </div>
                             ))}
                           </div>
                         </div>
                       );
                     })}
                   </div>
                 </div>
               </div>
             ) : activeStory === 'statistics' ? (
               /* СТРАНИЦА СТАТИСТИКИ */
               <div className="statistics-content-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                 <h2 style={{ fontSize: '20px', fontWeight: '800' }}>📈 Аналитика и эффективность</h2>
                 
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                   <div className="dashboard-glass-card" style={{ padding: '20px', textAlign: 'center' }}>
                     <span style={{ fontSize: '12px', fontWeight: '700', color: '#8E92A2' }}>Всего задач</span>
                     <h1 style={{ fontSize: '32px', fontWeight: '800', margin: '10px 0', color: '#8A2BE2' }}>{tasks.length}</h1>
                     <span style={{ fontSize: '11px', fontWeight: '600', color: '#34C759' }}>В работе: {newTasks.length + pendingTasks.length}</span>
                   </div>
                   <div className="dashboard-glass-card" style={{ padding: '20px', textAlign: 'center' }}>
                     <span style={{ fontSize: '12px', fontWeight: '700', color: '#8E92A2' }}>Выполнено</span>
                     <h1 style={{ fontSize: '32px', fontWeight: '800', margin: '10px 0', color: '#34C759' }}>{doneTasks.length}</h1>
                     <span style={{ fontSize: '11px', fontWeight: '600', color: '#8A2BE2' }}>Эффективность: {progress}%</span>
                   </div>
                   <div className="dashboard-glass-card" style={{ padding: '20px', textAlign: 'center' }}>
                     <span style={{ fontSize: '12px', fontWeight: '700', color: '#8E92A2' }}>Продуктивность котика</span>
                     <h1 style={{ fontSize: '32px', fontWeight: '800', margin: '10px 0', color: '#FF9500' }}>{catLevel} ур.</h1>
                     <span style={{ fontSize: '11px', fontWeight: '600', color: '#FF3B30' }}>Опыт: {currentLevelXp} XP</span>
                   </div>
                 </div>
         
                 <div className="dashboard-glass-card" style={{ padding: '20px' }}>
                   <h3 style={{ fontSize: '14px', fontWeight: '800', marginBottom: '14px' }}>⚡ Распределение продуктивности по дням недели</h3>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '150px', padding: '10px 0' }}>
                     {(() => {
                       const days = [
                         { label: 'Пн', index: 1 },
                         { label: 'Вт', index: 2 },
                         { label: 'Ср', index: 3 },
                         { label: 'Чт', index: 4 },
                         { label: 'Пт', index: 5 },
                         { label: 'Сб', index: 6 },
                         { label: 'Вс', index: 0 }
                       ];
                       
                       const completedTasks = tasks.filter(t => t.status === 'done');
                       const counts = days.map(d => {
                         const count = completedTasks.filter(t => {
                           if (!t.deadline) return false;
                           const dt = new Date(t.deadline);
                           return dt.getDay() === d.index;
                         }).length;
                         return { day: d.label, count };
                       });
                       
                       const maxCount = Math.max(...counts.map(c => c.count), 0);
                       
                       return counts.map((item, idx) => {
                         const heightVal = maxCount > 0 ? Math.round((item.count / maxCount) * 110) + 10 : 8;
                         return (
                           <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flex: 1 }}>
                             <span style={{ fontSize: '9px', fontWeight: '800', color: item.count > 0 ? '#8A2BE2' : 'transparent' }}>
                               {item.count > 0 ? `${item.count} шт.` : ''}
                             </span>
                             <div style={{ 
                               width: '24px', 
                               height: `${heightVal}px`, 
                               background: item.count > 0 ? 'linear-gradient(180deg, #8A2BE2 0%, #FF9500 100%)' : 'rgba(0,0,0,0.05)', 
                               borderRadius: '6px',
                               position: 'relative',
                               transition: 'height 0.3s ease, background 0.3s ease'
                             }}></div>
                             <span style={{ fontSize: '11px', fontWeight: '800', color: item.count > 0 ? '#8A2BE2' : '#8E92A2' }}>{item.day}</span>
                           </div>
                         );
                       });
                     })()}
                   </div>
                 </div>
               </div>
            ) : activeStory === 'projects' ? (
              /* СТРАНИЦА ПРОЕКТОВ (activeStory === 'projects') */
              <div className="projects-content-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '800' }}>📦 Рабочие проекты</h2>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {[
                    { key: 'website', name: 'Разработка сайта', defaultPct: 75, color: '#8A2BE2', defaultStatus: 'В работе', desc: 'Запуск новой версии корпоративного портала.' },
                    { key: 'app', name: 'Мобильное приложение', defaultPct: 40, color: '#FF9500', defaultStatus: 'В работе', desc: 'Создание iOS и Android приложений для клиентов.' },
                    { key: 'brandbook', name: 'Бренд-бук компании', defaultPct: 100, color: '#34C759', defaultStatus: 'Завершен', desc: 'Обновление фирменного стиля и руководства.' }
                  ].map((p, idx) => {
                    const projectTasks = tasks.filter(t => t.project === p.key);
                    const total = projectTasks.length;
                    const completed = projectTasks.filter(t => t.status === 'done').length;
                    
                    // Если задач в проекте нет, используем дефолтные макетные значения
                    const pct = total ? Math.round((completed / total) * 100) : p.defaultPct;
                    const status = pct === 100 ? 'Завершен' : p.defaultStatus;

                    return (
                      <div key={idx} className="dashboard-glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <h3 style={{ fontSize: '15px', fontWeight: '800' }}>{p.name}</h3>
                            <p style={{ fontSize: '12px', color: '#8E92A2', marginTop: '2px' }}>{p.desc}</p>
                          </div>
                          <span style={{ 
                            fontSize: '11px', 
                            fontWeight: '800', 
                            padding: '4px 8px', 
                            borderRadius: '8px', 
                            background: status === 'Завершен' ? '#34C75915' : '#8A2BE215', 
                            color: status === 'Завершен' ? '#34C759' : '#8A2BE2' 
                          }}>
                            {status}
                          </span>
                        </div>
                        
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>
                            <span>Прогресс выполнения</span>
                            <span style={{ color: p.color }}>{pct}%</span>
                          </div>
                          <div style={{ height: '8px', background: 'rgba(0,0,0,0.04)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: p.color, width: `${pct}%`, borderRadius: '4px', transition: 'width 0.3s ease' }}></div>
                          </div>
                        </div>

                        {/* Интерактивный список задач проекта */}
                        <div style={{ marginTop: '10px', background: 'rgba(0,0,0,0.02)', borderRadius: '12px', padding: '12px' }}>
                          <div style={{ fontSize: '11.5px', fontWeight: '800', marginBottom: '8px', color: '#8E92A2', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Задачи проекта ({total})</span>
                            <span>Выполнено: {completed} из {total}</span>
                          </div>
                          {total === 0 ? (
                            <div style={{ fontSize: '11px', color: '#8E92A2', padding: '4px 0', fontWeight: '600' }}>
                              В этом проекте пока нет задач.
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {projectTasks.map(task => {
                                const isDone = task.status === 'done';
                                const pInfo = (() => {
                                  switch(task.priority || 'medium') {
                                    case 'urgent': return { label: 'Срочно', color: '#FF3B30' };
                                    case 'high': return { label: 'Высокий', color: '#FF9500' };
                                    case 'low': return { label: 'Низкий', color: '#007AFF' };
                                    default: return { label: 'Средний', color: '#34C759' };
                                  }
                                })();
                                return (
                                  <div key={task.id} style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center', 
                                    padding: '8px 12px', 
                                    background: '#fff', 
                                    borderRadius: '8px',
                                    border: '1px solid rgba(0,0,0,0.03)'
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      <button 
                                        onClick={() => toggleStatus(task.id)}
                                        style={{
                                          width: '18px',
                                          height: '18px',
                                          borderRadius: '50%',
                                          border: `2px solid ${isDone ? '#30D158' : '#C7C7CC'}`,
                                          background: isDone ? '#30D158' : 'transparent',
                                          color: '#fff',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          fontSize: '10px',
                                          fontWeight: '800',
                                          cursor: 'pointer',
                                          outline: 'none',
                                          padding: '0'
                                        }}
                                      >
                                        {isDone ? '✓' : ''}
                                      </button>
                                      <span style={{ 
                                        fontSize: '12px', 
                                        fontWeight: '700', 
                                        textDecoration: isDone ? 'line-through' : 'none', 
                                        color: isDone ? '#8E92A2' : '#1C1C1E' 
                                      }}>
                                        {task.text}
                                      </span>
                                    </div>
                                    
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span style={{ fontSize: '9.5px', fontWeight: '800', color: pInfo.color, background: `${pInfo.color}12`, padding: '2px 6px', borderRadius: '6px' }}>
                                        {pInfo.label}
                                      </span>
                                      {task.deadline && (
                                        <span style={{ fontSize: '10px', color: '#8E92A2', fontWeight: '600' }}>
                                          ⏰ {task.deadline}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : activeStory === 'settings' ? (
              /* СТРАНИЦА НАСТРОЕК (activeStory === 'settings') */
              <div className="settings-content-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '800' }}>⚙️ Настройки профиля и интерфейса</h2>
                
                <div className="dashboard-glass-card" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '800', color: '#8E92A2', letterSpacing: '0.5px' }}>ТВОЁ ИМЯ</label>
                    <input 
                      type="text" 
                      value={userName} 
                      onChange={(e) => {
                        setUserName(e.target.value);
                        safeStorage.setItem('userName', e.target.value);
                      }}
                      style={{
                        padding: '12px 16px',
                        borderRadius: '12px',
                        border: '1px solid rgba(0,0,0,0.08)',
                        fontSize: '14px',
                        fontWeight: '700',
                        color: '#1C1C1E',
                        background: 'rgba(255,255,255,0.7)',
                        outline: 'none',
                        width: '100%',
                        maxWidth: '320px',
                        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)',
                        transition: 'border-color 0.2s ease'
                      }}
                      placeholder="Введи имя..."
                    />
                  </div>

                  <hr style={{ border: 'none', borderTop: '1px solid rgba(0,0,0,0.05)', margin: '5px 0' }} />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '800', color: '#8E92A2', letterSpacing: '0.5px' }}>ИНТЕРФЕЙС И ЗВУКИ</label>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input 
                        type="checkbox" 
                        id="sound-notifications"
                        checked={soundEnabled}
                        onChange={(e) => setSoundEnabled(e.target.checked)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#8A2BE2' }}
                      />
                      <label htmlFor="sound-notifications" style={{ fontSize: '13.5px', fontWeight: '700', color: '#1C1C1E', cursor: 'pointer', userSelect: 'none' }}>
                        Включить звуковые эффекты при выполнении задач
                      </label>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input 
                        type="checkbox" 
                        id="show-cat"
                        checked={showCatHelper}
                        onChange={(e) => setShowCatHelper(e.target.checked)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#8A2BE2' }}
                      />
                      <label htmlFor="show-cat" style={{ fontSize: '13.5px', fontWeight: '700', color: '#1C1C1E', cursor: 'pointer', userSelect: 'none' }}>
                        Отображать котика-помощника в боковой панели
                      </label>
                    </div>
                  </div>

                  <div style={{ marginTop: '10px', fontSize: '11px', color: '#8E92A2', fontWeight: '700', background: 'rgba(138,43,226,0.05)', padding: '10px 14px', borderRadius: '10px' }}>
                    💡 Все настройки сохраняются автоматически в реальном времени. Попробуй изменить имя и посмотри на приветствие!
                  </div>
                </div>
              </div>
            ) : activeStory === 'pet' ? (
              <div className="pet-content-wrapper" style={{ padding: '24px', display: 'flex', justifyContent: 'center' }}>
                <div className="cat-helper-card" style={{ transform: 'scale(1.2)', transformOrigin: 'top center', marginTop: '20px', width: '100%', maxWidth: '300px' }}>
                  <div className="cat-bubble" style={{ fontSize: '15px', padding: '12px' }}>{catMood.text}</div>
                  <div className="cat-image-container">
                    <img src={catMood.img} alt="Cat Mascot" className="cat-helper-img" />
                  </div>
                  
                  <div className="cat-level-row">
                    <span className="cat-level-lbl" style={{ fontSize: '14px' }}>Уровень {catLevel}</span>
                    <span className="cat-xp-lbl" style={{ fontSize: '12px' }}>Опыт: {currentLevelXp}/{xpPerLevel} XP</span>
                  </div>
                  <div className="cat-level-progress" style={{ height: '10px' }}>
                    <div className="cat-level-progress-fill" style={{ width: `${catProgressPercent}%` }}></div>
                  </div>
                  <div className="cat-xp-hint" style={{ fontSize: '12px', color: '#8E92A2', marginTop: '12px', fontWeight: '700', textAlign: 'center' }}>
                    🌟 +100 XP за каждую выполненную задачу!
                  </div>
                </div>
              </div>
            ) : null}
            
            {/* Плавающая кнопка для мобилок (создать задачу) */}
            {!activeModal && <button className="mobile-fab" onClick={() => {
              setNewTaskText('');
              setNewAssignee('');
              setNewPriority('medium');
              setNewProject('none');
              setEditTaskId(null);
              setEditTaskStatus('pending');
              setActiveModal('create-task');
            }}>+</button>}
          </main>

          {/* ПРАВЫЙ САЙДБАР: КОТИК И ЗАДАЧИ */}
          <aside className="right-sidebar">
            <div className="sidebar-header-row">
              <h3 className="right-sidebar-title">❤️ Твой кот-помощник</h3>
              <span className="more-options">•••</span>
            </div>

            {/* КАРТОЧКА КОТИКА */}
            <div className="cat-helper-card">
              <div className="cat-bubble">{catMood.text}</div>
              <div className="cat-image-container">
                <img src={catMood.img} alt="Cat Mascot" className="cat-helper-img" />
              </div>
              
              {/* Прогресс-бар котика */}
              <div className="cat-level-row">
                <span className="cat-level-lbl">Уровень {catLevel}</span>
                <span className="cat-xp-lbl">Опыт: {currentLevelXp}/{xpPerLevel} XP</span>
              </div>
              <div className="cat-level-progress">
                <div className="cat-level-progress-fill" style={{ width: `${catProgressPercent}%` }}></div>
              </div>
              <div className="cat-xp-hint" style={{ fontSize: '10.5px', color: '#8E92A2', marginTop: '8px', fontWeight: '700' }}>
                🌟 +100 XP за каждую выполненную задачу!
              </div>
            </div>

            {/* Статистика выполнения задач */}
            <div className="today-tasks-progress-card">
              <div className="pct-donut-container">
                <svg viewBox="0 0 36 36" className="pct-donut-svg">
                  <path className="donut-ring" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="3" />
                  <path className="donut-segment" strokeDasharray={`${progress}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#8A2BE2" strokeWidth="3" />
                  <text x="18" y="20.35" className="donut-number">{progress}%</text>
                </svg>
              </div>
              <div className="pct-info">
                <span className="pct-lbl">Сегодня выполнено</span>
                <h4 className="pct-count">{doneTasks.length} из {tasks.length} задач</h4>
              </div>
            </div>

            {/* СПИСОК МОИХ ЗАДАЧ */}
            <div className="my-tasks-container">
              <div className="my-tasks-header">
                <h3 className="section-title">Мои задачи</h3>
                <button className="add-task-mini-btn" onClick={() => setActiveModal('create-task')}>+</button>
              </div>
              <div className="my-tasks-list">
                {tasks.map((task) => {
                  const isDone = task.status === 'done';
                  const leftColors = {
                    'pending': '#0A84FF',
                    'new': '#FF9F0A',
                    'done': '#30D158'
                  };
                  return (
                    <div key={task.id} className={`my-task-item ${isDone ? 'done' : ''}`} style={{ borderLeft: `4px solid ${leftColors[task.status]}` }}>
                      <div className="my-task-details">
                        <p className="my-task-text">{task.text}</p>
                        <div className="my-task-meta">
                          <span className="my-task-time">⏰ {task.deadline || 'Без срока'}</span>
                          <span className="my-task-urgency">Высокий</span>
                        </div>
                      </div>
                      <button className={`my-task-checkbox ${isDone ? 'checked' : ''}`} onClick={() => toggleStatus(task.id)}>
                        {isDone ? '✓' : ''}
                      </button>
                    </div>
                  );
                })}
              </div>
              <p className="my-tasks-encouragement">Ты молодец! Продолжай в том же духе! 🐾</p>
            </div>
          </aside>
        </div>
      </SplitCol>
    </SplitLayout>
  );
}
