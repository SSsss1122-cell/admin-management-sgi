import ProtectedRoute from '../components/ProtectedRoute';
import StudentDashboard from './StudentDashboard';

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <StudentDashboard />
    </ProtectedRoute>
  );
}