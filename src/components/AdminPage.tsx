import { useState } from 'react'
import {
  Search,
  Users,
  Activity,
  AlertCircle,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Shield,
  Edit2,
  Trash2
} from 'lucide-react'
import type { AuthUser } from '../services/authApi'

type AdminPageProps = {
  currentUser: AuthUser | null
  pushToast?: (text: string, tone?: 'info' | 'error') => void
}

export function AdminPage({ currentUser, pushToast }: AdminPageProps) {
  const [searchQuery, setSearchQuery] = useState('')

  // Mock data for users
  const [mockUsers] = useState([
    { id: '1', name: 'Nguyễn Văn A', email: 'nguyenvana@example.com', role: 'admin', status: 'active', lastLogin: 'Vừa xong' },
    { id: '2', name: 'Trần Thị B', email: 'tranthib@example.com', role: 'user', status: 'active', lastLogin: '5 phút trước' },
    { id: '3', name: 'Lê Văn C', email: 'levanc@example.com', role: 'user', status: 'inactive', lastLogin: '2 ngày trước' },
    { id: '4', name: 'Phạm Thị D', email: 'phamthid@example.com', role: 'moderator', status: 'active', lastLogin: '1 giờ trước' },
    { id: '5', name: 'Hoàng Văn E', email: 'hoangvane@example.com', role: 'user', status: 'suspended', lastLogin: '1 tháng trước' },
  ])

  return (
    <div className="admin-page-container">
      <header className="admin-header">
        <div className="admin-header-title">
          <h1>Quản trị hệ thống</h1>
          <p>Xin chào, {currentUser?.displayName || currentUser?.fullName || 'Admin'}!</p>
        </div>
        <div className="admin-search">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Tìm kiếm người dùng, cài đặt..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </header>

      <div className="admin-dashboard-cards">
        <div className="stat-card">
          <div className="stat-icon users-icon"><Users size={24} /></div>
          <div className="stat-info">
            <h3>Tổng người dùng</h3>
            <p className="stat-value">1,248</p>
            <span className="stat-trend positive">+12% so với tháng trước</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon active-icon"><Activity size={24} /></div>
          <div className="stat-info">
            <h3>Đang hoạt động</h3>
            <p className="stat-value">156</p>
            <span className="stat-trend">Bây giờ</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon alert-icon"><AlertCircle size={24} /></div>
          <div className="stat-info">
            <h3>Cảnh báo hệ thống</h3>
            <p className="stat-value">2</p>
            <span className="stat-trend negative">Cần xử lý</span>
          </div>
        </div>
      </div>

      <div className="admin-content-section">
        <div className="section-header">
          <h2>Danh sách người dùng</h2>
          <button className="btn-primary" onClick={() => pushToast?.('Tính năng thêm người dùng chưa được implement')}>
            + Thêm người dùng
          </button>
        </div>
        
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Người dùng</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th>Đăng nhập cuối</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {mockUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="user-cell">
                      <div className="user-avatar">{user.name.charAt(0)}</div>
                      <div>
                        <strong>{user.name}</strong>
                        <span>{user.email}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`role-badge role-${user.role}`}>
                      {user.role === 'admin' ? <Shield size={12} /> : null}
                      {user.role}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge status-${user.status}`}>
                      {user.status === 'active' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                      {user.status === 'active' ? 'Hoạt động' : user.status === 'inactive' ? 'Không hoạt động' : 'Đã khóa'}
                    </span>
                  </td>
                  <td className="text-muted">{user.lastLogin}</td>
                  <td>
                    <div className="action-buttons">
                      <button title="Chỉnh sửa" onClick={() => pushToast?.('Chỉnh sửa ' + user.name)}><Edit2 size={16} /></button>
                      <button title="Xóa" className="text-danger" onClick={() => pushToast?.('Xóa ' + user.name, 'error')}><Trash2 size={16} /></button>
                      <button title="Tùy chọn khác"><MoreVertical size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
