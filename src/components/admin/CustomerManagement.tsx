import React, { useMemo, useState } from 'react';
import {
  Plus, Edit3, MapPin, Mail, Phone, Building, X, Trash2, Search, ArrowLeft, ChevronRight, FileText
} from 'lucide-react';
import { Customer, Site, Job } from '../../types';
import { StorageService } from '../../services/storage';
import { formatDate } from '../../utils/formatters';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

interface CustomerManagementProps {
  customers: Customer[];
  jobs: Job[];
  onCustomerUpdated: () => void;
  onOpenJob?: (jobId: string) => void;
}

export const CustomerManagement: React.FC<CustomerManagementProps> = ({
  customers,
  jobs,
  onCustomerUpdated,
  onOpenJob
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | undefined>(undefined);

  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [sites, setSites] = useState<Site[]>([]);

  useBodyScrollLock(isModalOpen);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(c =>
      c.companyName.toLowerCase().includes(q) ||
      c.contactPerson.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q)
    );
  }, [customers, searchQuery]);

  const handleOpenModal = (cust?: Customer) => {
    if (cust) {
      setEditingCustomer(cust);
      setCompanyName(cust.companyName);
      setContactPerson(cust.contactPerson);
      setEmail(cust.email);
      setPhone(cust.phone);
      setNotes(cust.notes || '');
      setSites([...cust.sites]);
    } else {
      setEditingCustomer(undefined);
      setCompanyName('');
      setContactPerson('');
      setEmail('');
      setPhone('');
      setNotes('');
      setSites([{ id: 'site-' + Date.now(), name: 'Main Fabrication Facility', address: 'Johannesburg, South Africa' }]);
    }
    setIsModalOpen(true);
  };

  const handleAddSite = () => {
    setSites(prev => [
      ...prev,
      { id: 'site-' + Date.now() + '-' + prev.length, name: `Site ${prev.length + 1}`, address: '' }
    ]);
  };

  const handleUpdateSite = (id: string, field: 'name' | 'address', value: string) => {
    setSites(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleRemoveSite = (id: string) => {
    if (sites.length <= 1) {
      alert('A customer must have at least one site location.');
      return;
    }
    setSites(prev => prev.filter(s => s.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) return;

    if (editingCustomer) {
      StorageService.updateCustomer({
        ...editingCustomer,
        companyName,
        contactPerson,
        email,
        phone,
        sites,
        notes
      });
    } else {
      StorageService.addCustomer({
        companyName,
        contactPerson,
        email,
        phone,
        sites,
        notes
      });
    }

    onCustomerUpdated();
    setIsModalOpen(false);
  };

  const jobRow = (j: Job) => (
    <button
      key={j.id}
      type="button"
      onClick={() => onOpenJob?.(j.id)}
      className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-sky-500/40 text-left transition-colors"
    >
      <div className="min-w-0">
        <div className="font-bold text-sm text-white truncate">{j.jobNumber}</div>
        <div className="text-[11px] text-slate-400 truncate">{j.method} · {j.status} · {formatDate(j.inspectionDate)}</div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {j.reportNumber && (
          <span className="text-[10px] font-mono text-emerald-400">{j.reportNumber}</span>
        )}
        <ChevronRight className="w-4 h-4 text-slate-500" />
      </div>
    </button>
  );

  if (selectedCustomer) {
    const custJobs = jobs.filter(j => j.customerId === selectedCustomer.id);
    const currentJobs = custJobs.filter(j => j.status !== 'Completed' && j.status !== 'Draft');
    const pastJobs = custJobs.filter(j => j.status === 'Completed');
    const reports = pastJobs.filter(j => j.reportNumber);

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={() => setSelectedCustomerId(null)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-400 hover:text-sky-300 mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to customers
            </button>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {selectedCustomer.companyName}
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">{selectedCustomer.contactPerson}</p>
          </div>
          <button
            type="button"
            onClick={() => handleOpenModal(selectedCustomer)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-700 text-slate-200 text-sm font-bold hover:bg-slate-800 self-start"
          >
            <Edit3 className="w-4 h-4" />
            Edit customer
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Contact</h3>
              <div className="space-y-2 text-sm text-slate-300">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-sky-400 shrink-0" />
                  <span className="truncate">{selectedCustomer.email || '—'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>{selectedCustomer.phone || '—'}</span>
                </div>
              </div>
              {selectedCustomer.notes && (
                <p className="text-xs text-slate-400 pt-3 border-t border-slate-800">{selectedCustomer.notes}</p>
              )}
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Sites ({selectedCustomer.sites.length})
              </h3>
              <div className="space-y-2">
                {selectedCustomer.sites.map(s => (
                  <div key={s.id} className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-xs">
                    <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-sky-400" />
                      {s.name}
                    </div>
                    {s.address && <p className="text-slate-400 mt-1 pl-5">{s.address}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Current jobs ({currentJobs.length})
              </h3>
              <div className="space-y-2">
                {currentJobs.length === 0 && <p className="text-xs text-slate-500">No open jobs.</p>}
                {currentJobs.map(jobRow)}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Past jobs ({pastJobs.length})
              </h3>
              <div className="space-y-2">
                {pastJobs.length === 0 && <p className="text-xs text-slate-500">No completed jobs yet.</p>}
                {pastJobs.map(jobRow)}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" />
                Reports issued ({reports.length})
              </h3>
              <div className="space-y-2">
                {reports.length === 0 && <p className="text-xs text-slate-500">No certificates issued yet.</p>}
                {reports.map(j => (
                  <button
                    key={j.id}
                    type="button"
                    onClick={() => onOpenJob?.(j.id)}
                    className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-emerald-950/20 border border-emerald-500/20 hover:border-emerald-400/40 text-left"
                  >
                    <div>
                      <div className="font-mono text-sm text-emerald-300 font-bold">{j.reportNumber}</div>
                      <div className="text-[11px] text-slate-400">{j.jobNumber} · {formatDate(j.completedAt || j.inspectionDate)}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {isModalOpen && renderModal()}
      </div>
    );
  }

  function renderModal() {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-3 sm:p-4 overflow-hidden">
        <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
                <Building className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-white">
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </h3>
            </div>
            <button type="button" onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-slate-200">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Company Name *</label>
              <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Contact Person</label>
                <input type="text" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Phone</label>
                <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500" />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-400">Inspection Sites / Plants</span>
                <button type="button" onClick={handleAddSite} className="text-xs font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Add Site
                </button>
              </div>
              <div className="space-y-3">
                {sites.map((s, idx) => (
                  <div key={s.id} className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <input type="text" value={s.name} onChange={(e) => handleUpdateSite(s.id, 'name', e.target.value)} required
                        placeholder={`Site ${idx + 1} Name`}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-sky-500" />
                      {sites.length > 1 && (
                        <button type="button" onClick={() => handleRemoveSite(s.id)} className="p-1 rounded text-slate-500 hover:text-rose-400">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <input type="text" value={s.address} onChange={(e) => handleUpdateSite(s.id, 'address', e.target.value)}
                      placeholder="Site Physical Address"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-sky-500" />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Client Notes & Protocol</label>
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500" />
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 font-semibold text-xs hover:bg-slate-800">Cancel</button>
              <button type="submit" className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 text-white font-bold text-sm shadow-lg">
                {editingCustomer ? 'Update Customer' : 'Save Customer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Customer Registry</h1>
          <p className="text-xs sm:text-sm text-slate-400">Search clients, then open a profile for sites, jobs, and reports</p>
        </div>
        <button
          type="button"
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-white font-bold text-sm shadow-lg shadow-sky-500/25 active:scale-95 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Customer</span>
        </button>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search company, contact, email…"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
        />
      </div>

      <div className="space-y-2">
        {filteredCustomers.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-8 text-center text-sm text-slate-400">
            No customers match your search.
          </div>
        )}
        {filteredCustomers.map(cust => {
          const custJobs = jobs.filter(j => j.customerId === cust.id);
          const openCount = custJobs.filter(j => j.status !== 'Completed' && j.status !== 'Draft').length;
          const completedCount = custJobs.filter(j => j.status === 'Completed').length;

          return (
            <button
              key={cust.id}
              type="button"
              onClick={() => setSelectedCustomerId(cust.id)}
              className="w-full flex items-center gap-3 sm:gap-4 px-4 py-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-sky-500/40 text-left transition-colors group"
            >
              <div className="w-10 h-10 rounded-lg bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0">
                <Building className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-extrabold text-white truncate">{cust.companyName}</div>
                <div className="text-xs text-slate-400 truncate">{cust.contactPerson || 'No contact'} · {cust.sites.length} site{cust.sites.length === 1 ? '' : 's'}</div>
              </div>
              <div className="hidden sm:flex items-center gap-3 text-xs shrink-0">
                <span className="text-amber-300 font-semibold">{openCount} open</span>
                <span className="text-emerald-400 font-semibold">{completedCount} done</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-sky-400 shrink-0" />
            </button>
          );
        })}
      </div>

      {isModalOpen && renderModal()}
    </div>
  );
};
