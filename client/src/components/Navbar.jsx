import { Link, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { group: 'Main', items: [
    { to: '/scanner',    icon: 'bi-camera-video',   label: 'Scanner'    },
    { to: '/dashboard',  icon: 'bi-grid-1x2',        label: 'Dashboard'  },
  ]},
  { group: 'Subscribers', items: [
    { to: '/customers',  icon: 'bi-people',           label: 'Customers'  },
    { to: '/attendance', icon: 'bi-check2-square',    label: 'Attendance' },
    { to: '/leaves',     icon: 'bi-calendar-x',       label: 'Leave'      },
  ]},
  { group: 'Operations', items: [
    { to: '/menu',       icon: 'bi-journal-text',     label: 'Menu'       },
    { to: '/payments',   icon: 'bi-credit-card',      label: 'Payments'   },
    { to: '/notices',    icon: 'bi-megaphone',        label: 'Notices'    },
  ]},
];

export default function Sidebar() {
  const { pathname } = useLocation();

  return (
    <aside className="sidebar">
      {/* Brand */}
      <Link to="/scanner" className="sidebar-brand">
        <div className="sidebar-brand-icon">
          <i className="bi bi-cup-hot" />
        </div>
        <div>
          <div className="sidebar-brand-text">MessMgmt</div>
          <div className="sidebar-brand-sub">College Mess System</div>
        </div>
      </Link>

      {/* Nav groups */}
      {NAV_ITEMS.map((group) => (
        <div key={group.group} className="sidebar-section">
          <div className="sidebar-section-label">{group.group}</div>
          {group.items.map(({ to, icon, label }) => (
            <Link
              key={to}
              to={to}
              className={`sidebar-link${pathname === to || pathname.startsWith(to + '/') ? ' active' : ''}`}
            >
              <i className={`bi ${icon}`} />
              {label}
            </Link>
          ))}
        </div>
      ))}

      <div className="sidebar-divider mt-auto" />
      <div className="sidebar-section">
        <div style={{ fontSize: 11, color: '#475569', padding: '0 8px 12px' }}>
          Version 1.0.0
        </div>
      </div>
    </aside>
  );
}
