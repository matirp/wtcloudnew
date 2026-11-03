import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Navbar';
import Scanner from './components/Scanner/Scanner';
import CustomerList from './components/Customers/CustomerList';
import CustomerForm from './components/Customers/CustomerForm';
import AttendanceLog from './components/Attendance/AttendanceLog';
import Dashboard from './components/Attendance/Dashboard';
import MenuBoard from './components/Mess/MenuBoard';
import NoticeBoard from './components/Mess/NoticeBoard';
import LeaveManager from './components/Mess/LeaveManager';
import PaymentManager from './components/Mess/PaymentManager';

export default function App() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/"                      element={<Navigate to="/scanner" replace />} />
          <Route path="/scanner"               element={<Scanner />} />
          <Route path="/customers"             element={<CustomerList />} />
          <Route path="/customers/new"         element={<CustomerForm />} />
          <Route path="/customers/:id/edit"    element={<CustomerForm />} />
          <Route path="/attendance"            element={<AttendanceLog />} />
          <Route path="/dashboard"             element={<Dashboard />} />
          <Route path="/menu"                  element={<MenuBoard />} />
          <Route path="/notices"               element={<NoticeBoard />} />
          <Route path="/leaves"                element={<LeaveManager />} />
          <Route path="/payments"              element={<PaymentManager />} />
          <Route path="*"                      element={<Navigate to="/scanner" replace />} />
        </Routes>
      </main>
    </div>
  );
}
