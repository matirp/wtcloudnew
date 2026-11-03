import { useEffect, useState } from 'react';
import { Row, Col, Spinner, Badge } from 'react-bootstrap';
import { customerAPI } from '../../api/customers';
import { attendanceAPI } from '../../api/attendance';
import { noticeAPI } from '../../api/notices';
import { menuAPI } from '../../api/menu';
import { todayStr, MEAL_SLOTS } from '../../utils/slot';

const PRIORITY_VARIANT = { normal: 'secondary', important: 'warning', urgent: 'danger' };
const PRIORITY_ICON    = { normal: 'bi-info-circle', important: 'bi-exclamation-triangle', urgent: 'bi-exclamation-octagon' };

const STAT_DEFS = (stats, todayCount) => [
  { label: 'Active Subscribers', value: stats?.active   ?? '—', icon: 'bi-people-fill',       bg: '#eff6ff', color: '#3b82f6' },
  { label: 'Expired Subs',        value: stats?.expired  ?? '—', icon: 'bi-calendar-x-fill',   bg: '#fef2f2', color: '#ef4444' },
  { label: 'Low Meals (≤5)',      value: stats?.lowMeals ?? '—', icon: 'bi-exclamation-circle', bg: '#fffbeb', color: '#f59e0b' },
  { label: 'Pending Payments',    value: stats?.pending  ?? '—', icon: 'bi-wallet2',            bg: '#fdf4ff', color: '#a855f7' },
  { label: 'Faces Enrolled',      value: stats?.enrolled ?? '—', icon: 'bi-person-bounding-box',bg: '#f0fdf4', color: '#22c55e' },
  { label: "Today's Check-ins",   value: todayCount,              icon: 'bi-check-circle-fill',  bg: '#eff6ff', color: '#3b82f6' },
];

const SLOT_STYLE = {
  Breakfast: { bg: '#fffbeb', color: '#b45309', icon: 'bi-brightness-high' },
  Lunch:     { bg: '#eff6ff', color: '#1d4ed8', icon: 'bi-sun'             },
  Dinner:    { bg: '#f5f3ff', color: '#6d28d9', icon: 'bi-moon-stars'      },
};

export default function Dashboard() {
  const [stats,    setStats]    = useState(null);
  const [todayLog, setTodayLog] = useState([]);
  const [notices,  setNotices]  = useState([]);
  const [menu,     setMenu]     = useState(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([
      customerAPI.stats(),
      attendanceAPI.all({ date: todayStr() }),
      noticeAPI.list(),
      menuAPI.get(),
    ]).then(([sRes, aRes, nRes, mRes]) => {
      setStats(sRes.data);
      setTodayLog(aRes.data);
      setNotices(nRes.data);
      setMenu(mRes.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="d-flex align-items-center justify-content-center" style={{ height: 300 }}>
      <Spinner variant="primary" />
    </div>
  );

  const perSlot = MEAL_SLOTS.map((slot) => ({
    slot,
    count: todayLog.filter((l) => l.mealSlot === slot).length,
  }));

  return (
    <>
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Overview for {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      {/* Stat cards */}
      <Row className="g-3 mb-4">
        {STAT_DEFS(stats, todayLog.length).map((s) => (
          <Col key={s.label} sm={6} xl={2}>
            <div className="stat-card">
              <div className="stat-card-icon" style={{ background: s.bg, color: s.color }}>
                <i className={`bi ${s.icon}`} />
              </div>
              <div className="stat-card-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-card-label">{s.label}</div>
            </div>
          </Col>
        ))}
      </Row>

      <Row className="g-3">
        {/* Today's check-ins */}
        <Col lg={4}>
          <div className="app-card h-100">
            <div className="app-card-header">
              <h5><i className="bi bi-check2-all me-2 text-primary" />Today's Check-ins</h5>
              <span className="text-muted small">{todayStr()}</span>
            </div>
            <div className="app-card-body">
              <Row className="g-2 mb-3">
                {perSlot.map((s) => {
                  const style = SLOT_STYLE[s.slot];
                  return (
                    <Col key={s.slot} xs={4}>
                      <div className="rounded-3 text-center p-2" style={{ background: style.bg }}>
                        <i className={`bi ${style.icon}`} style={{ color: style.color, fontSize: 18 }} />
                        <div style={{ color: style.color, fontWeight: 700, fontSize: 22 }}>{s.count}</div>
                        <div style={{ color: style.color, fontSize: 11, fontWeight: 600 }}>{s.slot}</div>
                      </div>
                    </Col>
                  );
                })}
              </Row>
              {todayLog.length > 0 ? (
                <>
                  <div className="text-muted small mb-2" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>Recent</div>
                  {todayLog.slice(0, 6).map((l) => {
                    const style = SLOT_STYLE[l.mealSlot];
                    return (
                      <div key={l._id} className="d-flex justify-content-between align-items-center py-2" style={{ borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                        <span className="fw-500">{l.name}</span>
                        <span className="badge rounded-pill" style={{ background: style.bg, color: style.color }}>{l.mealSlot}</span>
                      </div>
                    );
                  })}
                </>
              ) : (
                <div className="empty-state" style={{ padding: '24px 0' }}>
                  <i className="bi bi-inbox" style={{ fontSize: 32 }} />
                  <p>No check-ins yet today</p>
                </div>
              )}
            </div>
          </div>
        </Col>

        {/* Today's menu */}
        <Col lg={4}>
          <div className="app-card h-100">
            <div className="app-card-header">
              <h5><i className="bi bi-journal-text me-2 text-primary" />Today's Menu</h5>
            </div>
            <div className="app-card-body">
              {[
                { key: 'breakfast', label: 'Breakfast', ...SLOT_STYLE.Breakfast },
                { key: 'lunch',     label: 'Lunch',     ...SLOT_STYLE.Lunch     },
                { key: 'dinner',    label: 'Dinner',    ...SLOT_STYLE.Dinner    },
              ].map((s) => (
                <div key={s.key} className="d-flex gap-3 mb-4 align-items-start">
                  <div className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{ width: 40, height: 40, background: s.bg, color: s.color }}>
                    <i className={`bi ${s.icon}`} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: s.color }}>{s.label}</div>
                    <div style={{ fontSize: 14, color: '#374151', marginTop: 2 }}>
                      {menu?.[s.key] || <span className="text-muted fst-italic">Not set</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Col>

        {/* Notices */}
        <Col lg={4}>
          <div className="app-card h-100">
            <div className="app-card-header">
              <h5><i className="bi bi-megaphone me-2 text-primary" />Notices</h5>
              <Badge bg="secondary" style={{ borderRadius: 6 }}>{notices.length}</Badge>
            </div>
            <div className="app-card-body" style={{ maxHeight: 380, overflowY: 'auto' }}>
              {notices.length === 0 ? (
                <div className="empty-state" style={{ padding: '24px 0' }}>
                  <i className="bi bi-megaphone" style={{ fontSize: 32 }} />
                  <p>No active notices</p>
                </div>
              ) : notices.map((n) => {
                const v = PRIORITY_VARIANT[n.priority];
                return (
                  <div key={n._id} className={`alert alert-${v} py-2 px-3 mb-2`} style={{ borderRadius: 8 }}>
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <i className={`bi ${PRIORITY_ICON[n.priority]}`} />
                      <strong style={{ fontSize: 13 }}>{n.title}</strong>
                    </div>
                    <div style={{ fontSize: 12 }}>{n.body}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </Col>
      </Row>
    </>
  );
}
