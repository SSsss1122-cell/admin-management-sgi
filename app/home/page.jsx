import ProtectedRoute from '../components/ProtectedRoute';
import MainDashboard from './MainDashboard';

export default function HomeDashboardPage() {
  return (
    <ProtectedRoute>
      <MainDashboard />
    </ProtectedRoute>
  );
}