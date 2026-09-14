/**
 * Realistic small-workshop roster for Apex NDT demo:
 * 6 customers · 15 inspectors · 33 equipment items
 * Varied methods, cert expiry, and calibration states (as of ~2026-09-12).
 */
import { Customer, Inspector, Equipment, MethodCertificate, NdtMethod } from '../types';

/** Tiny placeholder "certificate" document for seed / mock upload demos */
export const PLACEHOLDER_CERT_DOC =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="297" viewBox="0 0 420 297">
      <rect width="420" height="297" fill="#0f172a"/>
      <rect x="24" y="24" width="372" height="249" fill="none" stroke="#38bdf8" stroke-width="2"/>
      <text x="210" y="80" text-anchor="middle" fill="#e2e8f0" font-family="sans-serif" font-size="18" font-weight="700">NDT METHOD CERTIFICATE (DEMO)</text>
      <text x="210" y="120" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="12">Employer file copy — not a live certification-body seal</text>
      <text x="210" y="170" text-anchor="middle" fill="#7dd3fc" font-family="monospace" font-size="14">SAQCC / ISO 9712</text>
    </svg>`
  );

export const PLACEHOLDER_CAL_DOC =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="297" viewBox="0 0 420 297">
      <rect width="420" height="297" fill="#0f172a"/>
      <rect x="24" y="24" width="372" height="249" fill="none" stroke="#34d399" stroke-width="2"/>
      <text x="210" y="80" text-anchor="middle" fill="#e2e8f0" font-family="sans-serif" font-size="18" font-weight="700">CALIBRATION CERTIFICATE (DEMO)</text>
      <text x="210" y="120" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="12">SANAS-traceable lab certificate — mock document</text>
      <text x="210" y="170" text-anchor="middle" fill="#6ee7b7" font-family="monospace" font-size="14">CAL-SANAS DEMO</text>
    </svg>`
  );

function buildMethodCerts(
  inspId: string,
  defaultLevel: Inspector['level'],
  methods: NdtMethod[],
  baseExpiry: string,
  opts?: {
    pendingMethods?: NdtMethod[];
    rejectedMethods?: NdtMethod[];
    /** Per-method level overrides (ISO 9712 mixed levels) */
    levelByMethod?: Partial<Record<NdtMethod, Inspector['level']>>;
    /** Per-method expiry overrides */
    expiryByMethod?: Partial<Record<NdtMethod, string>>;
  }
): MethodCertificate[] {
  return methods.map((method) => {
    let status: MethodCertificate['verificationStatus'] = 'Verified';
    if (opts?.pendingMethods?.includes(method)) status = 'PendingVerification';
    if (opts?.rejectedMethods?.includes(method)) status = 'Rejected';
    const level = opts?.levelByMethod?.[method] || defaultLevel || 'Level 2';
    const expiryDate = opts?.expiryByMethod?.[method] || baseExpiry;
    const issueYear = Number(expiryDate.slice(0, 4)) - 2;
    return {
      id: `mcert-${inspId}-${method}`,
      method,
      level,
      certNumber: `${inspId.replace('insp-', 'SAQCC-').toUpperCase()}-${method}`,
      issuer: level === 'Level 3' ? 'ISO 9712 Certification Body (ZA)' : 'SAQCC-NDT',
      issueDate: `${issueYear}-01-15`,
      expiryDate,
      documentDataUrl: PLACEHOLDER_CERT_DOC,
      documentFileName: `${method}-certificate-demo.svg`,
      verificationStatus: status,
      verifiedAt: status === 'Verified' ? `${issueYear}-02-01T10:00:00.000Z` : undefined,
      verifiedByName: status === 'Verified' ? 'System Admin' : undefined,
      rejectionReason: status === 'Rejected' ? 'Scan illegible — re-upload clear PDF of wallet card.' : undefined
    };
  });
}

function withMethodCerts(
  insp: Inspector,
  opts?: {
    pendingMethods?: NdtMethod[];
    rejectedMethods?: NdtMethod[];
    levelByMethod?: Partial<Record<NdtMethod, Inspector['level']>>;
    expiryByMethod?: Partial<Record<NdtMethod, string>>;
  }
): Inspector {
  const methodCertificates = buildMethodCerts(
    insp.id,
    insp.level || 'Level 2',
    insp.methods,
    insp.certExpiryDate,
    opts
  );
  const rank = { 'Level 1': 1, 'Level 2': 2, 'Level 3': 3 } as const;
  const verified = methodCertificates.filter(c => c.verificationStatus === 'Verified');
  const derivedLevel = verified.length > 0
    ? verified.reduce((best, c) => (rank[c.level] > rank[best] ? c.level : best), verified[0].level)
    : (insp.level || 'Level 2');
  const soonestExpiry = methodCertificates.reduce(
    (earliest, c) => (c.expiryDate < earliest ? c.expiryDate : earliest),
    methodCertificates[0]?.expiryDate || insp.certExpiryDate
  );
  return {
    ...insp,
    level: derivedLevel,
    certExpiryDate: soonestExpiry,
    methodCertificates
  };
}

export const workshopCustomers: Customer[] = [
  {
    id: 'cust-1',
    companyName: 'ABC Engineering (Pty) Ltd',
    contactPerson: 'Johan van der Merwe',
    email: 'johan@abcengineering.co.za',
    phone: '+27 82 450 9182',
    sites: [
      { id: 'site-1-1', name: 'Johannesburg Fabrication Workshop', address: '88 Main Reef Road, Industria, Johannesburg, 2093' },
      { id: 'site-1-2', name: 'Secunda Gas Plant - Unit 4', address: 'Secunda Complex, Mpumalanga, 2302' }
    ],
    notes: 'Key fabrication contractor for heavy pressure vessels and pipe spools.',
    createdAt: '2026-01-15T08:00:00.000Z'
  },
  {
    id: 'cust-2',
    companyName: 'Sasol Synfuels Mining & Gas',
    contactPerson: 'Nomvula Sithole',
    email: 'nomvula.sithole@sasol.com',
    phone: '+27 17 610 3450',
    sites: [
      { id: 'site-2-1', name: 'Sasolburg Chemical Complex - Steam Line Spool', address: 'Klasie Havenga Road, Sasolburg, Free State, 1947' }
    ],
    notes: 'Strict HSE protocol required. Site induction valid through Dec 2026.',
    createdAt: '2026-02-01T09:30:00.000Z'
  },
  {
    id: 'cust-3',
    companyName: 'Transnet Freight Rail Engineering',
    contactPerson: 'David Khumalo',
    email: 'david.khumalo@transnet.net',
    phone: '+27 11 584 0192',
    sites: [
      { id: 'site-3-1', name: 'Koedoespoort Rail Mechanical Yard', address: 'Koedoespoort, Pretoria East, 0186' }
    ],
    notes: 'Axle and bogey visual and magnetic particle inspections.',
    createdAt: '2026-02-10T11:00:00.000Z'
  },
  {
    id: 'cust-4',
    companyName: 'Eskom Generation — Tutuka Power Station',
    contactPerson: 'Andile Dlamini',
    email: 'andile.dlamini@eskom.co.za',
    phone: '+27 17 779 2100',
    sites: [
      { id: 'site-4-1', name: 'Tutuka Boiler Island — Unit 3', address: 'Standerton District, Mpumalanga, 2430' },
      { id: 'site-4-2', name: 'Tutuka Ash Handling Plant', address: 'Standerton District, Mpumalanga, 2430' }
    ],
    notes: 'Outage window inspections. PTW and confined-space permits mandatory.',
    createdAt: '2026-03-01T08:00:00.000Z'
  },
  {
    id: 'cust-5',
    companyName: 'Murray & Roberts Cementation',
    contactPerson: 'Claire Naidoo',
    email: 'claire.naidoo@murrob.com',
    phone: '+27 11 456 8700',
    sites: [
      { id: 'site-5-1', name: 'Kloof Gold Mine — Shaft 4 Headgear', address: 'Westonaria, Gauteng, 1780' }
    ],
    notes: 'Structural MT/VT on lifting lugs and pad eyes. Night shift preferred.',
    createdAt: '2026-03-18T10:00:00.000Z'
  },
  {
    id: 'cust-6',
    companyName: 'Sappi Saiccor Mill',
    contactPerson: 'Riaan du Plessis',
    email: 'riaan.duplessis@sappi.com',
    phone: '+27 39 973 8000',
    sites: [
      { id: 'site-6-1', name: 'Saiccor Digester Train B', address: 'Umkomaas, KwaZulu-Natal, 4170' }
    ],
    notes: 'Corrosion mapping UT campaigns on digester shells. Acid-resistant PPE required.',
    createdAt: '2026-04-05T09:00:00.000Z'
  }
];

/** 15 inspectors — mix of L1/L2/L3, methods, and cert validity (demo date ~2026-09-12) */
const workshopInspectorsBase: Inspector[] = [
  {
    id: 'insp-1',
    fullName: 'Thabo Mokoena',
    email: 'thabo.m@apexndt.co.za',
    phone: '+27 73 892 4410',
    certification: 'SAQCC / ISO 9712 Level 2',
    certNumber: 'SAQCC-NDT-8492',
    level: 'Level 2',
    certExpiryDate: '2027-06-30',
    methods: ['UT', 'MT', 'PT', 'VT'],
    notes: 'Senior multi-method inspector. UT/MT/PT Level 2; VT Level 1. Primary supervisor for Level 1 technicians.'
  },
  {
    id: 'insp-l3-1',
    fullName: 'Dr. Johan Pretorius',
    email: 'johan.p@apexndt.co.za',
    phone: '+27 82 555 9012',
    certification: 'ISO 9712 Level 3 / ASNT Level III',
    certNumber: 'ISO-9712-L3-ZA-0412',
    level: 'Level 3',
    certExpiryDate: '2028-12-31',
    methods: ['UT', 'MT', 'PT', 'VT'],
    notes: 'Principal Technical Authority & QA reviewer. UT/MT Level 3; PT/VT Level 2.'
  },
  {
    id: 'insp-2',
    fullName: 'Sipho Zulu',
    email: 'sipho.zulu@apexndt.co.za',
    phone: '+27 84 321 7789',
    certification: 'SAQCC NDT Level 2',
    certNumber: 'SAQCC-NDT-9104',
    level: 'Level 2',
    certExpiryDate: '2026-09-28',
    methods: ['MT', 'PT', 'VT'],
    notes: 'Surface methods specialist. Cert expiring soon — renew before October outages.'
  },
  {
    id: 'insp-3',
    fullName: 'Pieter Botha',
    email: 'pieter.b@apexndt.co.za',
    phone: '+27 82 990 1234',
    certification: 'ISO 9712 UT Level 2',
    certNumber: 'ISO-9712-ZA-3841',
    level: 'Level 2',
    certExpiryDate: '2026-08-15',
    methods: ['UT'],
    notes: 'UT qualified but CERT EXPIRED — must be blocked from new job assignment until renewed.'
  },
  {
    id: 'insp-4',
    fullName: 'Lesego Nkosi',
    email: 'lesego.n@apexndt.co.za',
    phone: '+27 76 541 8823',
    certification: 'SAQCC NDT Level 1',
    certNumber: 'SAQCC-NDT-L1-1122',
    level: 'Level 1',
    certExpiryDate: '2027-03-31',
    methods: ['UT', 'MT'],
    defaultSupervisorId: 'insp-1',
    notes: 'Junior L1. Must be supervised by L2/L3 per ISO 9712.'
  },
  {
    id: 'insp-5',
    fullName: 'Amina Jacobs',
    email: 'amina.j@apexndt.co.za',
    phone: '+27 71 204 6631',
    certification: 'SAQCC / ISO 9712 Level 2',
    certNumber: 'SAQCC-NDT-7721',
    level: 'Level 2',
    certExpiryDate: '2027-11-15',
    methods: ['UT', 'VT'],
    notes: 'UT thickness & corrosion mapping lead. Coastal plant experience.'
  },
  {
    id: 'insp-6',
    fullName: 'Kabelo Molefe',
    email: 'kabelo.m@apexndt.co.za',
    phone: '+27 79 118 4402',
    certification: 'SAQCC NDT Level 1',
    certNumber: 'SAQCC-NDT-L1-2208',
    level: 'Level 1',
    certExpiryDate: '2026-07-01',
    methods: ['MT', 'PT'],
    defaultSupervisorId: 'insp-2',
    notes: 'L1 surface methods — CERT EXPIRED. Block assignment despite method match.'
  },
  {
    id: 'insp-7',
    fullName: 'Nadia Ferreira',
    email: 'nadia.f@apexndt.co.za',
    phone: '+27 83 667 9011',
    certification: 'ISO 9712 Level 2',
    certNumber: 'ISO-9712-ZA-5510',
    level: 'Level 2',
    certExpiryDate: '2027-01-20',
    methods: ['PT', 'VT'],
    notes: 'PT / VT specialist for stainless and aluminium fabrications.'
  },
  {
    id: 'insp-8',
    fullName: 'Mandla Khumalo',
    email: 'mandla.k@apexndt.co.za',
    phone: '+27 72 339 1188',
    certification: 'SAQCC / ISO 9712 Level 2',
    certNumber: 'SAQCC-NDT-6402',
    level: 'Level 2',
    certExpiryDate: '2026-10-05',
    methods: ['UT', 'MT', 'VT'],
    notes: 'Cert due soon. Strong on structural UT + MT combination jobs.'
  },
  {
    id: 'insp-9',
    fullName: 'Fatima Essop',
    email: 'fatima.e@apexndt.co.za',
    phone: '+27 81 445 7720',
    certification: 'ISO 9712 Level 3',
    certNumber: 'ISO-9712-L3-ZA-0881',
    level: 'Level 3',
    certExpiryDate: '2028-06-30',
    methods: ['UT', 'MT'],
    notes: 'Second L3 — UT/MT procedure author. Can back up Pretorius on QA reviews.'
  },
  {
    id: 'insp-10',
    fullName: 'Gerhard Venter',
    email: 'gerhard.v@apexndt.co.za',
    phone: '+27 82 101 3344',
    certification: 'SAQCC NDT Level 2',
    certNumber: 'SAQCC-NDT-5019',
    level: 'Level 2',
    certExpiryDate: '2025-12-31',
    methods: ['MT', 'PT', 'VT', 'UT'],
    notes: 'Multi-method L2 but CERT EXPIRED Dec 2025 — blocked from assignment until renewal.'
  },
  {
    id: 'insp-11',
    fullName: 'Thandiwe Mabaso',
    email: 'thandiwe.m@apexndt.co.za',
    phone: '+27 74 882 1905',
    certification: 'SAQCC NDT Level 1',
    certNumber: 'SAQCC-NDT-L1-3340',
    level: 'Level 1',
    certExpiryDate: '2027-08-15',
    methods: ['VT', 'PT'],
    defaultSupervisorId: 'insp-7',
    notes: 'L1 visual / penetrant. Valid cert. Default supervisor Nadia Ferreira.'
  },
  {
    id: 'insp-12',
    fullName: 'Ryan Pillay',
    email: 'ryan.p@apexndt.co.za',
    phone: '+27 83 220 6712',
    certification: 'ISO 9712 UT Level 2',
    certNumber: 'ISO-9712-ZA-4188',
    level: 'Level 2',
    certExpiryDate: '2027-04-30',
    methods: ['UT'],
    notes: 'UT-only L2. Flaw detection and TOFD-assist experience (demo scope: UT).'
  },
  {
    id: 'insp-13',
    fullName: 'Lindiwe Dube',
    email: 'lindiwe.d@apexndt.co.za',
    phone: '+27 71 990 2284',
    certification: 'SAQCC / ISO 9712 Level 2',
    certNumber: 'SAQCC-NDT-8830',
    level: 'Level 2',
    certExpiryDate: '2026-09-20',
    methods: ['MT'],
    notes: 'MT-only L2. Cert expiring within days — warn on assign.'
  },
  {
    id: 'insp-14',
    fullName: 'Chris van Wyk',
    email: 'chris.vw@apexndt.co.za',
    phone: '+27 82 776 4419',
    certification: 'SAQCC NDT Level 1',
    certNumber: 'SAQCC-NDT-L1-4411',
    level: 'Level 1',
    certExpiryDate: '2027-12-01',
    methods: ['UT'],
    defaultSupervisorId: 'insp-5',
    notes: 'L1 UT under Amina Jacobs. Valid cert.'
  },
  {
    id: 'insp-15',
    fullName: 'Precious Ndlovu',
    email: 'precious.n@apexndt.co.za',
    phone: '+27 76 330 5518',
    certification: 'ISO 9712 Level 2',
    certNumber: 'ISO-9712-ZA-2299',
    level: 'Level 2',
    certExpiryDate: '2027-09-10',
    methods: ['PT', 'MT', 'VT'],
    notes: 'Surface methods L2. Covers night-shift structural campaigns.'
  }
];

/** Enrich with per-method certificates (assignment source of truth). Mixed levels + verify demos. */
export const workshopInspectors: Inspector[] = workshopInspectorsBase.map(insp => {
  if (insp.id === 'insp-1') {
    // Thabo: UT/MT/PT L2, VT L1
    return withMethodCerts(insp, {
      levelByMethod: { UT: 'Level 2', MT: 'Level 2', PT: 'Level 2', VT: 'Level 1' }
    });
  }
  if (insp.id === 'insp-l3-1') {
    // Johan: UT/MT L3, PT/VT L2
    return withMethodCerts(insp, {
      levelByMethod: { UT: 'Level 3', MT: 'Level 3', PT: 'Level 2', VT: 'Level 2' }
    });
  }
  if (insp.id === 'insp-2') {
    // Sipho: PT pending; MT L2, VT L1
    return withMethodCerts(insp, {
      pendingMethods: ['PT'],
      levelByMethod: { MT: 'Level 2', PT: 'Level 2', VT: 'Level 1' }
    });
  }
  if (insp.id === 'insp-4') {
    // Lesego: UT L1, MT L1
    return withMethodCerts(insp, {
      levelByMethod: { UT: 'Level 1', MT: 'Level 1' }
    });
  }
  if (insp.id === 'insp-5') {
    // Amina: UT L2, VT L1
    return withMethodCerts(insp, {
      levelByMethod: { UT: 'Level 2', VT: 'Level 1' }
    });
  }
  if (insp.id === 'insp-7') {
    // Nadia: VT rejected; PT L2, VT L1
    return withMethodCerts(insp, {
      rejectedMethods: ['VT'],
      levelByMethod: { PT: 'Level 2', VT: 'Level 1' }
    });
  }
  if (insp.id === 'insp-8') {
    // Mandla: UT L2, MT L2, VT L1
    return withMethodCerts(insp, {
      levelByMethod: { UT: 'Level 2', MT: 'Level 2', VT: 'Level 1' }
    });
  }
  if (insp.id === 'insp-9') {
    // Fatima: UT L3, MT L2
    return withMethodCerts(insp, {
      levelByMethod: { UT: 'Level 3', MT: 'Level 2' }
    });
  }
  if (insp.id === 'insp-11') {
    // Thandiwe: VT L1, PT L1
    return withMethodCerts(insp, {
      levelByMethod: { VT: 'Level 1', PT: 'Level 1' }
    });
  }
  if (insp.id === 'insp-12') {
    // Ryan: UT pending
    return withMethodCerts(insp, { pendingMethods: ['UT'] });
  }
  if (insp.id === 'insp-15') {
    // Precious: PT L2, MT L2, VT L1
    return withMethodCerts(insp, {
      levelByMethod: { PT: 'Level 2', MT: 'Level 2', VT: 'Level 1' }
    });
  }
  return withMethodCerts(insp);
});

function makeEquip(opts: {
  id: string;
  name: string;
  type: string;
  serialNumber: string;
  category: NonNullable<Equipment['category']>;
  calibrationDate: string;
  calibrationExpiryDate: string;
  status?: Equipment['status'];
  checkoutStatus?: Equipment['checkoutStatus'];
  notes?: string;
  currentJobId?: string;
  currentJobNumber?: string;
  checkedOutTo?: string;
  checkedOutAt?: string;
}): Equipment {
  const calStatus = opts.status || (
    opts.calibrationExpiryDate < '2026-09-12' ? 'Expired'
      : opts.calibrationExpiryDate <= '2026-10-12' ? 'Due Soon'
      : 'Operational'
  );
  const certificateNumber = `CAL-SANAS-${opts.calibrationDate.slice(0, 4)}-${opts.id.replace(/\D/g, '').padStart(4, '0')}`;
  return {
    id: opts.id,
    name: opts.name,
    type: opts.type,
    serialNumber: opts.serialNumber,
    category: opts.category,
    status: calStatus,
    checkoutStatus: opts.checkoutStatus || 'Available',
    currentJobId: opts.currentJobId,
    currentJobNumber: opts.currentJobNumber,
    checkedOutTo: opts.checkedOutTo,
    checkedOutAt: opts.checkedOutAt,
    calibrationDate: opts.calibrationDate,
    calibrationExpiryDate: opts.calibrationExpiryDate,
    calibrationHistory: [
      {
        id: `cal-${opts.id}-1`,
        calDate: opts.calibrationDate,
        calExpiryDate: opts.calibrationExpiryDate,
        certificateNumber,
        laboratory: 'SANAS Accredited Metrology Lab',
        referenceStandard: 'Workshop master reference standards',
        performedBy: 'K. Naidoo (SANAS Metrologist)',
        result: 'PASS',
        notes: 'Routine calibration cycle.',
        timestamp: `${opts.calibrationDate}T09:00:00.000Z`
      }
    ],
    calibrationCertificate: {
      certificateNumber,
      laboratory: 'SANAS Accredited Metrology Lab',
      documentDataUrl: PLACEHOLDER_CAL_DOC,
      documentFileName: `${opts.serialNumber}-cal-cert-demo.svg`,
      uploadedAt: `${opts.calibrationDate}T09:00:00.000Z`
    },
    traceabilityLog: [
      {
        id: `trace-${opts.id}-init`,
        timestamp: `${opts.calibrationDate}T09:00:00.000Z`,
        action: 'Returned',
        notes: 'Registered in workshop equipment pool.'
      }
    ],
    notes: opts.notes
  };
}

/** 33 equipment items — UT / MT / PT / VT / General, mixed cal states */
export const workshopEquipment: Equipment[] = [
  // Keep original demo IDs with richer fields for jobs
  {
    ...makeEquip({
      id: 'eq-1',
      name: 'Olympus 27MG Ultrasonic Gauge',
      type: 'Ultrasonic Thickness Gauge',
      serialNumber: 'SN-OLY-27MG-9482',
      category: 'Ultrasonic',
      calibrationDate: '2026-03-01',
      calibrationExpiryDate: '2027-03-01',
      notes: 'Primary UT gauge. 5-step CS block verified.'
    }),
    calibrationCertificate: {
      certificateNumber: 'CAL-SANAS-2026-0183',
      laboratory: 'Fluke Calibration Lab (SANAS Accredited)',
      documentDataUrl: PLACEHOLDER_CAL_DOC,
      documentFileName: 'SN-OLY-27MG-9482-cal-cert-demo.svg',
      uploadedAt: '2026-03-01T09:00:00.000Z'
    },
    calibrationHistory: [
      {
        id: 'cal-eq1-1',
        calDate: '2026-03-01',
        calExpiryDate: '2027-03-01',
        certificateNumber: 'CAL-SANAS-2026-0183',
        laboratory: 'Fluke Calibration Lab (SANAS Accredited)',
        referenceStandard: '5-step carbon steel step wedge (2.5mm – 20mm)',
        performedBy: 'K. Naidoo (SANAS Metrologist)',
        result: 'PASS',
        notes: 'Zero-drift verified across all ranges.',
        timestamp: '2026-03-01T09:00:00.000Z'
      }
    ]
  },
  {
    ...makeEquip({
      id: 'eq-2',
      name: 'Parker B300 Contour Magnetic Yoke',
      type: 'Electromagnetic AC/DC Yoke',
      serialNumber: 'SN-PKR-B300-4821',
      category: 'Magnetic Particle',
      calibrationDate: '2026-04-10',
      calibrationExpiryDate: '2026-09-25',
      checkoutStatus: 'On Job',
      currentJobId: 'job-2',
      currentJobNumber: 'NDT-2026-0002',
      checkedOutTo: 'Thabo Mokoena',
      checkedOutAt: '2026-09-11T07:30:00.000Z',
      notes: 'Due soon. Deployed on job-2.'
    })
  },
  {
    ...makeEquip({
      id: 'eq-3',
      name: 'Magnaflux Spotcheck Penetrant Kit & Lux Meter',
      type: 'Dye Penetrant System & Light Meter',
      serialNumber: 'SN-MAG-SKL-0192',
      category: 'Liquid Penetrant',
      calibrationDate: '2025-08-01',
      calibrationExpiryDate: '2026-08-01',
      status: 'Out of Service',
      checkoutStatus: 'Incident Reported',
      notes: 'Expired cal + open incident — locked out of Available pool.'
    }),
    checkoutStatus: 'Incident Reported'
  },
  makeEquip({ id: 'eq-4', name: 'Olympus Epoch 650 Flaw Detector', type: 'Ultrasonic Flaw Detector', serialNumber: 'SN-OLY-EP650-1102', category: 'Ultrasonic', calibrationDate: '2026-01-15', calibrationExpiryDate: '2027-01-15' }),
  makeEquip({ id: 'eq-5', name: 'GE DMS Go+ Thickness Gauge', type: 'Ultrasonic Thickness Gauge', serialNumber: 'SN-GE-DMS-7741', category: 'Ultrasonic', calibrationDate: '2025-06-01', calibrationExpiryDate: '2026-06-01', notes: 'EXPIRED — do not deploy.' }),
  makeEquip({ id: 'eq-6', name: 'Sonatest Sitescan D-50', type: 'Ultrasonic Flaw Detector', serialNumber: 'SN-SON-D50-3310', category: 'Ultrasonic', calibrationDate: '2026-05-20', calibrationExpiryDate: '2026-10-01', notes: 'Cal due soon.' }),
  makeEquip({ id: 'eq-7', name: 'Dakota Ultrasonics ZX-6', type: 'Ultrasonic Thickness Gauge', serialNumber: 'SN-DAK-ZX6-8820', category: 'Ultrasonic', calibrationDate: '2026-07-01', calibrationExpiryDate: '2027-07-01' }),
  makeEquip({ id: 'eq-8', name: 'Olympus 38DL Plus', type: 'Ultrasonic Thickness Gauge', serialNumber: 'SN-OLY-38DL-2291', category: 'Ultrasonic', calibrationDate: '2026-02-10', calibrationExpiryDate: '2027-02-10' }),
  makeEquip({ id: 'eq-9', name: 'Krautkramer USM Go', type: 'Ultrasonic Flaw Detector', serialNumber: 'SN-KK-USMGO-4412', category: 'Ultrasonic', calibrationDate: '2025-11-01', calibrationExpiryDate: '2026-05-01', notes: 'EXPIRED.' }),
  makeEquip({ id: 'eq-10', name: 'Cygnus 4+ Underwater Gauge', type: 'Ultrasonic Thickness Gauge', serialNumber: 'SN-CYG-4P-0199', category: 'Ultrasonic', calibrationDate: '2026-04-01', calibrationExpiryDate: '2027-04-01', notes: 'Splash-zone / marine work.' }),

  makeEquip({ id: 'eq-11', name: 'Magnaflux Y-7 AC/DC Yoke', type: 'Electromagnetic Yoke', serialNumber: 'SN-MAG-Y7-5521', category: 'Magnetic Particle', calibrationDate: '2026-03-15', calibrationExpiryDate: '2027-03-15' }),
  makeEquip({ id: 'eq-12', name: 'Parker DA-400 Contour Probe', type: 'Electromagnetic Yoke', serialNumber: 'SN-PKR-DA400-1188', category: 'Magnetic Particle', calibrationDate: '2025-09-01', calibrationExpiryDate: '2026-09-01', notes: 'EXPIRED.' }),
  makeEquip({ id: 'eq-13', name: 'Johnson & Allen Articulated Yoke', type: 'AC Articulated Yoke', serialNumber: 'SN-JA-ART-9033', category: 'Magnetic Particle', calibrationDate: '2026-06-01', calibrationExpiryDate: '2026-10-08', notes: 'Due soon.' }),
  makeEquip({ id: 'eq-14', name: 'Magnaflux MB-122 Permanent Magnet', type: 'Permanent Magnet Yoke', serialNumber: 'SN-MAG-MB122-4410', category: 'Magnetic Particle', calibrationDate: '2026-01-20', calibrationExpiryDate: '2027-01-20' }),
  makeEquip({ id: 'eq-15', name: 'Tiede WE Universal Yoke', type: 'Electromagnetic Yoke', serialNumber: 'SN-TIE-WE-7722', category: 'Magnetic Particle', calibrationDate: '2026-08-01', calibrationExpiryDate: '2027-08-01' }),
  makeEquip({ id: 'eq-16', name: 'Parker B310DC Dry Powder Kit', type: 'DC Yoke + Dry Powder', serialNumber: 'SN-PKR-B310-6611', category: 'Magnetic Particle', calibrationDate: '2025-12-15', calibrationExpiryDate: '2026-06-15', notes: 'EXPIRED.' }),

  makeEquip({ id: 'eq-17', name: 'Magnaflux SKL-SP2 Visible PT Kit', type: 'Visible Dye Penetrant Kit', serialNumber: 'SN-MAG-SKL-2201', category: 'Liquid Penetrant', calibrationDate: '2026-05-01', calibrationExpiryDate: '2027-05-01' }),
  makeEquip({ id: 'eq-18', name: 'Sherwin DP-50 Fluorescent PT Kit', type: 'Fluorescent Penetrant System', serialNumber: 'SN-SHW-DP50-3390', category: 'Liquid Penetrant', calibrationDate: '2026-02-01', calibrationExpiryDate: '2026-09-30', notes: 'Due soon — UV intensity check required.' }),
  makeEquip({ id: 'eq-19', name: 'Ardrox 996P Penetrant Station', type: 'Penetrant Process Kit', serialNumber: 'SN-ARD-996P-1108', category: 'Liquid Penetrant', calibrationDate: '2025-07-01', calibrationExpiryDate: '2026-07-01', notes: 'EXPIRED.' }),
  makeEquip({ id: 'eq-20', name: 'Magnaflux ZB-100F UV Lamp', type: 'UV-A Inspection Lamp', serialNumber: 'SN-MAG-ZB100-5544', category: 'Liquid Penetrant', calibrationDate: '2026-07-15', calibrationExpiryDate: '2027-07-15' }),
  makeEquip({ id: 'eq-21', name: 'Spectroline OPTIMAX 365', type: 'UV-A LED Lamp', serialNumber: 'SN-SPL-OPT365-8821', category: 'Liquid Penetrant', calibrationDate: '2026-03-01', calibrationExpiryDate: '2026-10-05', notes: 'Due soon.' }),

  makeEquip({ id: 'eq-22', name: 'Extech LT300 Lux Meter', type: 'Illuminance Meter', serialNumber: 'SN-EXT-LT300-1919', category: 'Visual / Optical', calibrationDate: '2026-04-12', calibrationExpiryDate: '2027-04-12' }),
  makeEquip({ id: 'eq-23', name: 'Testo 540 Lux Meter', type: 'Illuminance Meter', serialNumber: 'SN-TES-540-2288', category: 'Visual / Optical', calibrationDate: '2025-10-01', calibrationExpiryDate: '2026-04-01', notes: 'EXPIRED.' }),
  makeEquip({ id: 'eq-24', name: 'Olympus IPLEX GX Borescope', type: 'Video Borescope', serialNumber: 'SN-OLY-IPLEX-7701', category: 'Visual / Optical', calibrationDate: '2026-06-20', calibrationExpiryDate: '2027-06-20' }),
  makeEquip({ id: 'eq-25', name: 'Mitutoyo Digimatic Vernier 150mm', type: 'Digital Vernier Caliper', serialNumber: 'SN-MIT-DIG-150-4412', category: 'Visual / Optical', calibrationDate: '2026-01-10', calibrationExpiryDate: '2027-01-10' }),
  makeEquip({ id: 'eq-26', name: 'Elcometer 224 Surface Profile Gauge', type: 'Surface Profile Gauge', serialNumber: 'SN-ELC-224-9090', category: 'Visual / Optical', calibrationDate: '2026-08-01', calibrationExpiryDate: '2026-10-10', notes: 'Due soon.' }),

  makeEquip({ id: 'eq-27', name: '5-Step CS Calibration Block #A', type: 'UT Reference Block', serialNumber: 'SN-BLK-CS5-001', category: 'General', calibrationDate: '2026-01-01', calibrationExpiryDate: '2028-01-01', notes: 'Workshop master step wedge.' }),
  makeEquip({ id: 'eq-28', name: '5-Step CS Calibration Block #B', type: 'UT Reference Block', serialNumber: 'SN-BLK-CS5-002', category: 'General', calibrationDate: '2025-01-01', calibrationExpiryDate: '2026-01-01', notes: 'EXPIRED — quarantine.' }),
  makeEquip({ id: 'eq-29', name: 'IIW V1 Calibration Block', type: 'UT Calibration Block', serialNumber: 'SN-BLK-IIWV1-014', category: 'General', calibrationDate: '2026-05-01', calibrationExpiryDate: '2028-05-01' }),
  makeEquip({ id: 'eq-30', name: 'ASME Piping Calibration Block', type: 'UT Piping Cal Block', serialNumber: 'SN-BLK-ASME-P88', category: 'General', calibrationDate: '2026-03-01', calibrationExpiryDate: '2027-03-01' }),
  makeEquip({ id: 'eq-31', name: '10 lb AC Lift Test Weight', type: 'MT Lift Test Standard', serialNumber: 'SN-MT-LIFT-10LB', category: 'General', calibrationDate: '2026-02-01', calibrationExpiryDate: '2027-02-01' }),
  makeEquip({ id: 'eq-32', name: 'Pie Field Indicator Gauge Set', type: 'MT Field Indicator', serialNumber: 'SN-MT-PIE-07', category: 'General', calibrationDate: '2026-07-01', calibrationExpiryDate: '2027-07-01' }),
  makeEquip({ id: 'eq-33', name: 'Workshop Digital Thermometer', type: 'Surface / Ambient Thermometer', serialNumber: 'SN-TMP-WS-112', category: 'General', calibrationDate: '2026-06-01', calibrationExpiryDate: '2026-09-25', notes: 'Due soon — used for WEP temp checks.' })
];
