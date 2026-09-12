import React, { useState } from 'react';
import { Users, Plus, Edit3, MapPin, Mail, Phone, Building, X, Trash2 } from 'lucide-react';
import { Customer, Site, Job } from '../../types';
import { StorageService } from '../../services/storage';

interface CustomerManagementProps {
  customers: Customer[];
  jobs: Job[];
  onCustomerUpdated: () => void;
}

export const CustomerManagement: React.FC<CustomerManagementProps> = ({
  customers,
  jobs,
  onCustomerUpdated
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | undefined>(undefined);

  // Form State
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [sites, setSites] = useState<Site[]>([]);

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
      {
        id: 'site-' + Date.now() + '-' + prev.length,
        name: `Site ${prev.length + 1}`,
        address: ''
      }
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Customer Registry
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Manage clients, multi-site inspection plants, and contact details
          </p>
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

      {/* Customers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {customers.map(cust => {
          const custJobs = jobs.filter(j => j.customerId === cust.id);
          const completedCount = custJobs.filter(j => j.status === 'Completed').length;

          return (
            <div
              key={cust.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between hover:border-slate-700 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-extrabold text-base text-white">{cust.companyName}</h3>
                    <p className="text-xs text-slate-400 font-medium">{cust.contactPerson}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenModal(cust)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span className="truncate">{cust.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span>{cust.phone}</span>
                  </div>
                </div>

                {/* Sites */}
                <div className="mt-4 pt-3 border-t border-slate-800/80">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                    Inspection Sites ({cust.sites.length})
                  </span>
                  <div className="space-y-1.5">
                    {cust.sites.map(s => (
                      <div key={s.id} className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/80 text-xs">
                        <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 text-sky-400" />
                          <span>{s.name}</span>
                        </div>
                        {s.address && (
                          <div className="text-[11px] text-slate-400 pl-4.5 mt-0.5 truncate">
                            {s.address}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom statistics */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>{custJobs.length} total jobs</span>
                <span className="text-emerald-400 font-semibold">{completedCount} reports issued</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
                  <Building className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-white">
                  {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-slate-200">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Company Name *
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. ABC Engineering (Pty) Ltd"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="e.g. Johan van der Merwe"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. johan@abc.co.za"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +27 82 450 9182"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Sites Manager */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
                    Inspection Sites / Plants
                  </span>
                  <button
                    type="button"
                    onClick={handleAddSite}
                    className="text-xs font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Site</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {sites.map((s, idx) => (
                    <div key={s.id} className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={s.name}
                          onChange={(e) => handleUpdateSite(s.id, 'name', e.target.value)}
                          placeholder={`Site ${idx + 1} Name`}
                          className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-sky-500"
                          required
                        />
                        {sites.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSite(s.id)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={s.address}
                        onChange={(e) => handleUpdateSite(s.id, 'address', e.target.value)}
                        placeholder="Site Physical Address (e.g. 88 Main Reef Road, Industria, JHB)"
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Client Notes & Protocol
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Requires safety induction prior to site entry."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 font-semibold text-xs hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 text-white font-bold text-sm shadow-lg"
                >
                  {editingCustomer ? 'Update Customer' : 'Save Customer'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
