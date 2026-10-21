import React, { useState, useEffect, useCallback } from 'react';
import { 
  Briefcase, Users, Award, Wrench, Settings, LayoutDashboard, RefreshCw, CalendarDays
} from 'lucide-react';
import { UserRole, Customer, Inspector, Equipment, Job, CompanySettings, NdtProcedure } from './types';
import { StorageService } from './services/storage';
import { Header } from './components/common/Header';
import { AdminDashboard, type AdminNavigatePayload, type JobsNavFilter } from './components/admin/AdminDashboard';
import { JobList } from './components/admin/JobList';
import { CustomerManagement } from './components/admin/CustomerManagement';
import { InspectorManagement } from './components/admin/InspectorManagement';
import { EquipmentManagement } from './components/admin/EquipmentManagement';
import { RenewalsHub } from './components/admin/RenewalsHub';
import { DispatchBoard } from './components/admin/DispatchBoard';
import { SettingsView } from './components/admin/SettingsView';
import { TechnicianDashboard } from './components/technician/TechnicianDashboard';
import { JobDetailView } from './components/technician/JobDetailView';
import { JobFormModal } from './components/admin/JobFormModal';
import { Level3Dashboard } from './components/verifier/Level3Dashboard';

type AdminTab = 'dashboard' | 'jobs' | 'customers' | 'inspectors' | 'equipment' | 'renewals' | 'dispatch' | 'settings';

export const App: React.FC = () => {
  const [role, setRole] = useState<UserRole>('admin');
  const [adminTab, setAdminTab] = useState<AdminTab>('dashboard');
  const [focusInspectorId, setFocusInspectorId] = useState<string | null>(null);
  const [focusEquipmentId, setFocusEquipmentId] = useState<string | null>(null);
  /** Jobs list filter from dashboard KPI; cleared when opening Jobs from nav. */
  const [jobsNavFilter, setJobsNavFilter] = useState<JobsNavFilter | null>(null);
  const [jobsListKey, setJobsListKey] = useState(0);

  const goAdminTab = (tab: AdminTab, payload?: AdminNavigatePayload) => {
    if (tab === 'jobs') {
      setJobsNavFilter(payload?.jobsFilter ?? null);
      setJobsListKey((k) => k + 1);
    } else {
      setJobsNavFilter(null);
    }
    setAdminTab(tab);
  };

  // Application Data State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [inspectors, setInspectors] = useState<Inspector[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [procedures, setProcedures] = useState<NdtProcedure[]>([]);
  const [settings, setSettings] = useState<CompanySettings>(StorageService.getSettings());
  
  // Selected Inspector for Technician view (default to Thabo Mokoena)
  const [selectedInspectorId, setSelectedInspectorId] = useState<string>('insp-4');
  
  // Active Inspection Job view (when opened from Admin or Tech)
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [cockpitEditJobId, setCockpitEditJobId] = useState<string | null>(null);

  const loadAllData = useCallback(() => {
    const c = StorageService.getCustomers();
    const i = StorageService.getInspectors();
    const e = StorageService.getEquipment();
    const j = StorageService.getJobs();
    const p = StorageService.getProcedures();
    const s = StorageService.getSettings();

    setCustomers(c);
    setInspectors(i);
    setEquipment(e);
    setJobs(j);
    setProcedures(p);
    setSettings(s);

    if (i.length > 0 && !selectedInspectorId) {
      setSelectedInspectorId(i[0].id);
    }
  }, [selectedInspectorId]);

  useEffect(() => {
    loadAllData();

    const handleDataUpdate = () => {
      loadAllData();
    };

    window.addEventListener('ndt_data_updated', handleDataUpdate);
    return () => window.removeEventListener('ndt_data_updated', handleDataUpdate);
  }, [loadAllData]);

  const handleResetData = () => {
    if (confirm('Reset demo data to the factory seed? This clears localStorage demo jobs and reloads sample stories.')) {
      StorageService.resetAllData();
      loadAllData();
      setActiveJobId(null);
      setSelectedInspectorId('insp-4');
      setRole('admin');
    }
  };

  const handleJobUpdated = (updatedJob: Job) => {
    StorageService.updateJob(updatedJob);
    loadAllData();
  };

  const activeJob = jobs.find(j => j.id === activeJobId);
  const cockpitEditJob = jobs.find(j => j.id === cockpitEditJobId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-sky-500 selection:text-white">
      
      {/* Header — single Demo-as persona switcher (no auth) */}
      <Header
        currentRole={role}
        onRoleChange={(newRole) => {
          setRole(newRole);
          setActiveJobId(null);
          setCockpitEditJobId(null);
        }}
        selectedInspectorId={selectedInspectorId}
        onInspectorChange={(id) => {
          setSelectedInspectorId(id);
          setActiveJobId(null);
          setCockpitEditJobId(null);
        }}
        onResetData={handleResetData}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6">
        
        {/* If an inspection job is active in Admin mode, show the full inspection cockpit */}
        {role === 'admin' && activeJob ? (
          <JobDetailView
            job={activeJob}
            customer={customers.find(c => c.id === activeJob.customerId)}
            inspector={inspectors.find(i => i.id === activeJob.inspectorId)}
            supervisor={inspectors.find(i => i.id === activeJob.supervisorId)}
            equipmentList={equipment.filter(e => activeJob.equipmentIds?.includes(e.id))}
            settings={settings}
            userRole={role}
            onBack={() => {
              setActiveJobId(null);
              setCockpitEditJobId(null);
            }}
            onJobUpdated={handleJobUpdated}
            onEditJob={() => setCockpitEditJobId(activeJob.id)}
          />
        ) : role === 'admin' ? (
          <div>
            {/* Admin Desktop/Tablet Navigation Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-6 border-b border-slate-800 scrollbar-none">
              <button
                type="button"
                onClick={() => goAdminTab('dashboard')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
                  adminTab === 'dashboard'
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </button>

              <button
                type="button"
                onClick={() => goAdminTab('jobs')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
                  adminTab === 'jobs'
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                <span>Jobs ({jobs.length})</span>
              </button>

              <button
                type="button"
                onClick={() => goAdminTab('customers')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
                  adminTab === 'customers'
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Customers ({customers.length})</span>
              </button>

              <button
                type="button"
                onClick={() => goAdminTab('inspectors')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
                  adminTab === 'inspectors'
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Award className="w-4 h-4" />
                <span>Inspectors ({inspectors.length})</span>
              </button>

              <button
                type="button"
                onClick={() => goAdminTab('equipment')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
                  adminTab === 'equipment'
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Wrench className="w-4 h-4" />
                <span>Equipment ({equipment.length})</span>
              </button>

              <button
                type="button"
                onClick={() => goAdminTab('renewals')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
                  adminTab === 'renewals'
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <RefreshCw className="w-4 h-4" />
                <span>Renewals</span>
              </button>

              <button
                type="button"
                onClick={() => goAdminTab('dispatch')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
                  adminTab === 'dispatch'
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <CalendarDays className="w-4 h-4" />
                <span>Dispatch</span>
              </button>

              <button
                type="button"
                onClick={() => goAdminTab('settings')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
                  adminTab === 'settings'
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </button>
            </div>

            {/* Admin Subviews */}
            {adminTab === 'dashboard' && (
              <AdminDashboard
                jobs={jobs}
                customers={customers}
                inspectors={inspectors}
                equipment={equipment}
                procedures={procedures}
                settings={settings}
                onNavigateToTab={(t, payload) => goAdminTab(t as AdminTab, payload)}
                onOpenInspector={(id) => {
                  setFocusInspectorId(id);
                  goAdminTab('inspectors');
                }}
                onOpenEquipment={(id) => {
                  setFocusEquipmentId(id);
                  goAdminTab('equipment');
                }}
                onOpenJobDetail={(j) => setActiveJobId(j.id)}
                onJobUpdated={handleJobUpdated}
              />
            )}

            {adminTab === 'jobs' && (
              <JobList
                key={`jobs-${jobsListKey}-${jobsNavFilter ?? 'ALL'}`}
                jobs={jobs}
                customers={customers}
                inspectors={inspectors}
                equipment={equipment}
                procedures={procedures}
                settings={settings}
                onJobUpdated={handleJobUpdated}
                onOpenJobDetail={(j) => setActiveJobId(j.id)}
                initialStatusFilter={jobsNavFilter ?? 'ALL'}
              />
            )}

            {adminTab === 'customers' && (
              <CustomerManagement
                customers={customers}
                jobs={jobs}
                inspectors={inspectors}
                equipment={equipment}
                settings={settings}
                onCustomerUpdated={loadAllData}
                onOpenJob={(id) => setActiveJobId(id)}
              />
            )}

            {adminTab === 'inspectors' && (
              <InspectorManagement
                key={focusInspectorId ? `insp-${focusInspectorId}` : 'inspectors-list'}
                inspectors={inspectors}
                jobs={jobs}
                customers={customers}
                equipment={equipment}
                settings={settings}
                onInspectorUpdated={loadAllData}
                onOpenJob={(id) => setActiveJobId(id)}
                focusInspectorId={focusInspectorId}
              />
            )}

            {adminTab === 'equipment' && (
              <EquipmentManagement
                key={focusEquipmentId ? `eq-${focusEquipmentId}` : 'equipment-list'}
                equipment={equipment}
                jobs={jobs}
                onEquipmentUpdated={loadAllData}
                onOpenJob={(id) => setActiveJobId(id)}
                focusEquipmentId={focusEquipmentId}
              />
            )}

            {adminTab === 'renewals' && (
              <RenewalsHub
                inspectors={inspectors}
                equipment={equipment}
                onOpenInspector={(id) => {
                  setFocusInspectorId(id);
                  setAdminTab('inspectors');
                }}
                onOpenEquipment={(id) => {
                  setFocusEquipmentId(id);
                  setAdminTab('equipment');
                }}
              />
            )}

            {adminTab === 'dispatch' && (
              <DispatchBoard
                jobs={jobs}
                customers={customers}
                inspectors={inspectors}
                equipment={equipment}
                procedures={procedures}
                onJobUpdated={loadAllData}
                onOpenJob={(jobId) => setActiveJobId(jobId)}
              />
            )}

            {adminTab === 'settings' && (
              <SettingsView
                settings={settings}
                onSettingsUpdated={(newSet) => {
                  setSettings(newSet);
                  loadAllData();
                }}
              />
            )}
          </div>
        ) : role === 'l3_verifier' ? (
          /* Level 3 Technical Authority & QA Multi-Sign Verification Cockpit */
          <Level3Dashboard
            jobs={jobs}
            customers={customers}
            inspectors={inspectors}
            equipment={equipment}
            procedures={procedures}
            settings={settings}
            onJobUpdated={handleJobUpdated}
            onProceduresUpdated={loadAllData}
          />
        ) : (
          /* Technician Mobile-First Inspection Cockpit */
          <TechnicianDashboard
            jobs={jobs}
            customers={customers}
            inspectors={inspectors}
            equipment={equipment}
            settings={settings}
            currentInspectorId={selectedInspectorId}
            onJobUpdated={handleJobUpdated}
            onInspectorsUpdated={loadAllData}
          />
        )}

      </main>

      {role === 'admin' && cockpitEditJob && (
        <JobFormModal
          key={cockpitEditJob.id}
          isOpen={Boolean(cockpitEditJob)}
          onClose={() => setCockpitEditJobId(null)}
          onJobCreated={(updatedJob) => {
            handleJobUpdated(updatedJob);
            setCockpitEditJobId(null);
          }}
          customers={customers}
          inspectors={inspectors}
          equipment={equipment}
          procedures={procedures}
          existingJob={cockpitEditJob}
        />
      )}

      {/* Offline Status & Standard Compliance Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-3 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-400 font-medium">Local Storage Autosave Active</span>
          </div>
          <div>
            <span>{settings.companyName} • ISO 9712–shaped demo workflow (not an accredited SoR)</span>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default App;
