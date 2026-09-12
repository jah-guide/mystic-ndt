import {
  Customer, Inspector, Equipment, Job, CompanySettings,
  NdtProcedure, EquipmentIncident, EquipmentTraceabilityEntry
} from '../types';
import {
  initialCompanySettings, initialCustomers, initialInspectors,
  initialEquipment, initialJobs, initialProcedures, initialIncidents
} from './seedData';

const STORAGE_KEYS = {
  SETTINGS: 'ndt_company_settings_v2',
  CUSTOMERS: 'ndt_customers_v2',
  INSPECTORS: 'ndt_inspectors_v2',
  EQUIPMENT: 'ndt_equipment_v2',
  JOBS: 'ndt_jobs_v5',
  PROCEDURES: 'ndt_procedures_v1',
  INCIDENTS: 'ndt_incidents_v1',
  CURRENT_USER_ROLE: 'ndt_user_role_v1',
  CURRENT_INSPECTOR_ID: 'ndt_current_inspector_id_v1'
};

function dispatchUpdate() {
  window.dispatchEvent(new Event('ndt_data_updated'));
}

export const StorageService = {
  // ─── Settings ──────────────────────────────────────────────
  getSettings(): CompanySettings {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) { this.saveSettings(initialCompanySettings); return initialCompanySettings; }
    try { return JSON.parse(raw); } catch { return initialCompanySettings; }
  },
  saveSettings(settings: CompanySettings): void {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    dispatchUpdate();
  },

  // ─── Customers ─────────────────────────────────────────────
  getCustomers(): Customer[] {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    if (!raw) { this.saveCustomers(initialCustomers); return initialCustomers; }
    try { return JSON.parse(raw); } catch { return initialCustomers; }
  },
  saveCustomers(customers: Customer[]): void {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    dispatchUpdate();
  },
  addCustomer(customer: Omit<Customer, 'id' | 'createdAt'>): Customer {
    const customers = this.getCustomers();
    const newCustomer: Customer = { ...customer, id: 'cust-' + Date.now(), createdAt: new Date().toISOString() };
    customers.unshift(newCustomer);
    this.saveCustomers(customers);
    return newCustomer;
  },
  updateCustomer(customer: Customer): void {
    const customers = this.getCustomers().map(c => c.id === customer.id ? customer : c);
    this.saveCustomers(customers);
  },

  // ─── Inspectors ────────────────────────────────────────────
  getInspectors(): Inspector[] {
    const raw = localStorage.getItem(STORAGE_KEYS.INSPECTORS);
    if (!raw) { this.saveInspectors(initialInspectors); return initialInspectors; }
    try { return JSON.parse(raw); } catch { return initialInspectors; }
  },
  saveInspectors(inspectors: Inspector[]): void {
    localStorage.setItem(STORAGE_KEYS.INSPECTORS, JSON.stringify(inspectors));
    dispatchUpdate();
  },
  addInspector(inspector: Omit<Inspector, 'id'>): Inspector {
    const inspectors = this.getInspectors();
    const newInspector: Inspector = { ...inspector, id: 'insp-' + Date.now() };
    inspectors.unshift(newInspector);
    this.saveInspectors(inspectors);
    return newInspector;
  },
  updateInspector(inspector: Inspector): void {
    const inspectors = this.getInspectors().map(i => i.id === inspector.id ? inspector : i);
    this.saveInspectors(inspectors);
  },

  // ─── Equipment ─────────────────────────────────────────────
  getEquipment(): Equipment[] {
    const raw = localStorage.getItem(STORAGE_KEYS.EQUIPMENT);
    if (!raw) { this.saveEquipment(initialEquipment); return initialEquipment; }
    try { return JSON.parse(raw); } catch { return initialEquipment; }
  },
  saveEquipment(equipment: Equipment[]): void {
    localStorage.setItem(STORAGE_KEYS.EQUIPMENT, JSON.stringify(equipment));
    dispatchUpdate();
  },
  addEquipment(item: Omit<Equipment, 'id'>): Equipment {
    const equipment = this.getEquipment();
    const newItem: Equipment = { ...item, id: 'eq-' + Date.now(), checkoutStatus: 'Available' };
    equipment.unshift(newItem);
    this.saveEquipment(equipment);
    return newItem;
  },
  updateEquipment(item: Equipment): void {
    const equipment = this.getEquipment().map(e => e.id === item.id ? item : e);
    this.saveEquipment(equipment);
  },

  /**
   * Checks out one or more equipment items to a job.
   * Sets checkoutStatus = 'On Job' and records the traceability entry.
   */
  checkoutEquipmentList(
    equipmentIds: string[],
    jobId: string,
    jobNumber: string,
    inspectorName: string
  ): void {
    const allEquipment = this.getEquipment();
    const now = new Date().toISOString();
    const updated = allEquipment.map(eq => {
      if (!equipmentIds.includes(eq.id)) return eq;
      const entry: EquipmentTraceabilityEntry = {
        id: 'trace-' + Date.now() + '-' + eq.id,
        timestamp: now,
        action: 'Checked Out',
        jobId,
        jobNumber,
        inspectorName,
        notes: `Deployed on job ${jobNumber}`
      };
      return {
        ...eq,
        checkoutStatus: 'On Job' as const,
        currentJobId: jobId,
        currentJobNumber: jobNumber,
        checkedOutTo: inspectorName,
        checkedOutAt: now,
        traceabilityLog: [entry, ...(eq.traceabilityLog || [])]
      };
    });
    this.saveEquipment(updated);
  },

  /**
   * Returns equipment from a job back to 'Available'.
   */
  returnEquipmentList(equipmentIds: string[], jobNumber: string): void {
    const allEquipment = this.getEquipment();
    const now = new Date().toISOString();
    const updated = allEquipment.map(eq => {
      if (!equipmentIds.includes(eq.id)) return eq;
      // Don't override if it's flagged with an incident
      if (eq.checkoutStatus === 'Incident Reported') return eq;
      const entry: EquipmentTraceabilityEntry = {
        id: 'trace-' + Date.now() + '-' + eq.id,
        timestamp: now,
        action: 'Returned',
        jobNumber,
        notes: `Returned from job ${jobNumber}`
      };
      return {
        ...eq,
        checkoutStatus: 'Available' as const,
        currentJobId: undefined,
        currentJobNumber: undefined,
        checkedOutTo: undefined,
        checkedOutAt: undefined,
        traceabilityLog: [entry, ...(eq.traceabilityLog || [])]
      };
    });
    this.saveEquipment(updated);
  },

  // ─── Jobs ──────────────────────────────────────────────────
  getJobs(): Job[] {
    const raw = localStorage.getItem(STORAGE_KEYS.JOBS);
    if (!raw) { this.saveJobs(initialJobs); return initialJobs; }
    try {
      const jobs: Job[] = JSON.parse(raw);
      // Migrate legacy single equipmentId → equipmentIds[]
      return jobs.map(j => ({
        ...j,
        equipmentIds: j.equipmentIds ?? ((j as any).equipmentId ? [(j as any).equipmentId] : [])
      }));
    } catch { return initialJobs; }
  },
  saveJobs(jobs: Job[]): void {
    localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(jobs));
    dispatchUpdate();
  },
  getJobById(id: string): Job | undefined {
    return this.getJobs().find(j => j.id === id);
  },
  generateNextJobNumber(): string {
    const jobs = this.getJobs();
    const currentYear = new Date().getFullYear();
    const prefix = `NDT-${currentYear}-`;
    const matching = jobs
      .map(j => j.jobNumber)
      .filter(num => num && num.startsWith(prefix))
      .map(num => parseInt(num.replace(prefix, ''), 10))
      .filter(n => !isNaN(n));
    const nextSeq = matching.length > 0 ? Math.max(...matching) + 1 : 1;
    return `${prefix}${nextSeq.toString().padStart(4, '0')}`;
  },
  addJob(job: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>): Job {
    const jobs = this.getJobs();
    const newJob: Job = {
      ...job,
      id: 'job-' + Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    jobs.unshift(newJob);
    this.saveJobs(jobs);
    return newJob;
  },
  updateJob(job: Job): void {
    const jobs = this.getJobs().map(j => {
      if (j.id === job.id) return { ...job, updatedAt: new Date().toISOString() };
      return j;
    });
    this.saveJobs(jobs);
  },
  deleteJob(id: string): void {
    const jobs = this.getJobs().filter(j => j.id !== id);
    this.saveJobs(jobs);
  },

  // ─── NDT Procedures ────────────────────────────────────────
  getProcedures(): NdtProcedure[] {
    const raw = localStorage.getItem(STORAGE_KEYS.PROCEDURES);
    if (!raw) { this.saveProcedures(initialProcedures); return initialProcedures; }
    try { return JSON.parse(raw); } catch { return initialProcedures; }
  },
  saveProcedures(procedures: NdtProcedure[]): void {
    localStorage.setItem(STORAGE_KEYS.PROCEDURES, JSON.stringify(procedures));
    dispatchUpdate();
  },
  addProcedure(proc: Omit<NdtProcedure, 'id' | 'createdAt' | 'updatedAt'>): NdtProcedure {
    const procedures = this.getProcedures();
    const newProc: NdtProcedure = {
      ...proc,
      id: 'proc-' + Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    procedures.unshift(newProc);
    this.saveProcedures(procedures);
    return newProc;
  },
  updateProcedure(proc: NdtProcedure): void {
    const procedures = this.getProcedures().map(p => p.id === proc.id ? { ...proc, updatedAt: new Date().toISOString() } : p);
    this.saveProcedures(procedures);
  },
  generateNextProcedureNumber(method: string): string {
    const procedures = this.getProcedures();
    const prefix = `WEP-${method}-`;
    const matching = procedures
      .map(p => p.procedureNumber)
      .filter(n => n.startsWith(prefix))
      .map(n => parseInt(n.replace(prefix, ''), 10))
      .filter(n => !isNaN(n));
    const nextSeq = matching.length > 0 ? Math.max(...matching) + 1 : 1;
    return `${prefix}${nextSeq.toString().padStart(3, '0')}`;
  },

  // ─── Equipment Incidents ───────────────────────────────────
  getIncidents(): EquipmentIncident[] {
    const raw = localStorage.getItem(STORAGE_KEYS.INCIDENTS);
    if (!raw) { this.saveIncidents(initialIncidents); return initialIncidents; }
    try { return JSON.parse(raw); } catch { return initialIncidents; }
  },
  saveIncidents(incidents: EquipmentIncident[]): void {
    localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(incidents));
    dispatchUpdate();
  },
  addIncident(incident: Omit<EquipmentIncident, 'id'>): EquipmentIncident {
    const incidents = this.getIncidents();
    const newIncident: EquipmentIncident = { ...incident, id: 'inc-' + Date.now() };
    incidents.unshift(newIncident);
    this.saveIncidents(incidents);

    // Lock the equipment
    const equipment = this.getEquipment();
    const now = new Date().toISOString();
    const updated = equipment.map(eq => {
      if (eq.id !== incident.equipmentId) return eq;
      const entry: EquipmentTraceabilityEntry = {
        id: 'trace-' + Date.now() + '-' + eq.id,
        timestamp: now,
        action: 'Incident Reported',
        jobId: incident.jobId,
        jobNumber: incident.jobNumber,
        notes: `${incident.type}: ${incident.description}`
      };
      return {
        ...eq,
        checkoutStatus: 'Incident Reported' as const,
        traceabilityLog: [entry, ...(eq.traceabilityLog || [])]
      };
    });
    this.saveEquipment(updated);

    return newIncident;
  },
  updateIncident(incident: EquipmentIncident): void {
    const incidents = this.getIncidents().map(i => i.id === incident.id ? incident : i);
    this.saveIncidents(incidents);

    // If resolved, return the equipment to Available
    if (incident.status === 'Resolved') {
      const equipment = this.getEquipment();
      const now = new Date().toISOString();
      const updated = equipment.map(eq => {
        if (eq.id !== incident.equipmentId) return eq;
        // Only return if currently in incident state
        if (eq.checkoutStatus !== 'Incident Reported') return eq;
        const entry: EquipmentTraceabilityEntry = {
          id: 'trace-' + Date.now() + '-' + eq.id,
          timestamp: now,
          action: 'Incident Resolved',
          notes: incident.adminNotes || 'Incident resolved by admin'
        };
        return {
          ...eq,
          checkoutStatus: 'Available' as const,
          currentJobId: undefined,
          currentJobNumber: undefined,
          checkedOutTo: undefined,
          traceabilityLog: [entry, ...(eq.traceabilityLog || [])]
        };
      });
      this.saveEquipment(updated);
    }
  },
  getOpenIncidentCount(): number {
    return this.getIncidents().filter(i => i.status !== 'Resolved').length;
  },

  // ─── Reset ─────────────────────────────────────────────────
  resetAllData(): void {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(initialCompanySettings));
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(initialCustomers));
    localStorage.setItem(STORAGE_KEYS.INSPECTORS, JSON.stringify(initialInspectors));
    localStorage.setItem(STORAGE_KEYS.EQUIPMENT, JSON.stringify(initialEquipment));
    localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(initialJobs));
    localStorage.setItem(STORAGE_KEYS.PROCEDURES, JSON.stringify(initialProcedures));
    localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(initialIncidents));
    dispatchUpdate();
  },

  // ─── Image Compression Helper ─────────────────────────────
  async compressImageFile(file: File, maxDimension: number = 1000, quality: number = 0.75): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > height) {
            if (width > maxDimension) { height = Math.round((height * maxDimension) / width); width = maxDimension; }
          } else {
            if (height > maxDimension) { width = Math.round((width * maxDimension) / height); height = maxDimension; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve(e.target?.result as string); return; }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }
};
