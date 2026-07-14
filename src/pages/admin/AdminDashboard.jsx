import AdminLayout from '../../components/layouts/AdminLayout';
import DashboardContent from '../../components/dashboard/DashboardContent';

/**
 * Dashboard Admin — minimalis dengan data visualisasi clean.
 * Sekarang direfaktor untuk menggunakan komponen DashboardContent.
 */
export default function AdminDashboard({ onNavigate, selectedProject, onProjectChange, activities, petugas, loading, refreshData }) {
  const activeActivity = activities?.find(a => a.name === selectedProject);

  return (
    <AdminLayout tab="admin-dash" onNavigate={onNavigate} selectedProject={selectedProject} onProjectChange={onProjectChange} activities={activities}>
      <div className="p-6 lg:p-8 w-full">
        {loading ? (
          <div className="text-center py-10 text-slate-500">Memuat data...</div>
        ) : (
          <DashboardContent 
            activities={activities}
            petugas={petugas}
            kegiatanId={activeActivity?.id || ''}
            groupBy="desa"
            isGabungan={false}
            title="Monitoring Pencacahan"
            activeProjectName={selectedProject}
          />
        )}
      </div>
    </AdminLayout>
  );
}
