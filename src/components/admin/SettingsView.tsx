import React, { useState } from 'react';
import { Sliders, Save, Building, ShieldCheck, FileText, CheckCircle2, RotateCcw } from 'lucide-react';
import { CompanySettings } from '../../types';
import { StorageService } from '../../services/storage';

interface SettingsViewProps {
  settings: CompanySettings;
  onSettingsUpdated: (settings: CompanySettings) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSettingsUpdated
}) => {
  const [formData, setFormData] = useState<CompanySettings>({ ...settings });
  const [showSavedToast, setShowSavedToast] = useState(false);

  const handleChange = (field: keyof CompanySettings, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    StorageService.saveSettings(formData);
    onSettingsUpdated(formData);
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 3000);
  };

  const handleResetDefaults = () => {
    if (!confirm('Reset company details to default sample data?')) return;
    StorageService.resetAllData();
    const fresh = StorageService.getSettings();
    setFormData(fresh);
    onSettingsUpdated(fresh);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Company & Report Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Configure company branding, accreditation details, and PDF certificate layout
          </p>
        </div>

        {showSavedToast && (
          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>Saved successfully</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-6">
        
        {/* Section 1: Company Profile */}
        <div>
          <h3 className="text-sm font-bold text-sky-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Building className="w-4 h-4" />
            <span>Company Branding & Contact</span>
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Company Legal Name *
              </label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => handleChange('companyName', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold text-sm focus:outline-none focus:border-sky-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Official Phone Number
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Reports Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Website
                </label>
                <input
                  type="text"
                  value={formData.website}
                  onChange={(e) => handleChange('website', e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Accreditation Body / ISO Standard
                </label>
                <input
                  type="text"
                  value={formData.sanasAccreditation || ''}
                  onChange={(e) => handleChange('sanasAccreditation', e.target.value)}
                  placeholder="e.g. SANAS / SAQCC Accredited NDT Body"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Physical Office Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: PDF Report Defaults */}
        <div className="pt-6 border-t border-slate-800">
          <h3 className="text-sm font-bold text-sky-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span>PDF Inspection Report Configuration</span>
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Default Test Procedure & Calibration Notes
              </label>
              <textarea
                rows={2}
                value={formData.defaultReportNotes}
                onChange={(e) => handleChange('defaultReportNotes', e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Official Report Footer & Disclaimer
              </label>
              <textarea
                rows={2}
                value={formData.reportFooter}
                onChange={(e) => handleChange('reportFooter', e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-4 py-2.5 rounded-xl border border-rose-500/30 text-rose-400 text-xs font-bold hover:bg-rose-500/10 flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Data</span>
          </button>

          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-white font-bold text-sm shadow-lg shadow-sky-500/25 active:scale-95 transition-all flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>

      </form>
    </div>
  );
};
