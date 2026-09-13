import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  updateDoc,
  deleteDoc, 
  onSnapshot, 
  getDoc,
  getDocs,
  getDocFromServer,
  query,
  where,
  enableIndexedDbPersistence
} from 'firebase/firestore';
import { Employee, AttendanceRecord, SystemSettings } from '../types';
import firebaseAppletConfig from '../../firebase-applet-config.json';
import { 
  DEFAULT_SETTINGS, 
  saveSettings, 
  saveEmployees, 
  saveRecords,
  getStoredSettings,
  getStoredEmployees,
  getStoredRecords
} from './storage';

// Firebase Client Configuration
export const firebaseConfig = {
  projectId: firebaseAppletConfig.projectId || "ai-studio-applet-webapp-ceedb",
  appId: firebaseAppletConfig.appId || "1:657921917073:web:0d3a861a153bd3c2d33f30",
  apiKey: firebaseAppletConfig.apiKey || "AIzaSyCYViM7Vpt01fOGaTpUIXZPc65fkOs6mnc",
  authDomain: firebaseAppletConfig.authDomain || "ai-studio-applet-webapp-ceedb.firebaseapp.com",
  firestoreDatabaseId: firebaseAppletConfig.firestoreDatabaseId || "ai-studio-att-d446b4ef-47dc-4bff-8473-3579e810cd2e",
  storageBucket: firebaseAppletConfig.storageBucket || "ai-studio-applet-webapp-ceedb.firebasestorage.app",
  messagingSenderId: firebaseAppletConfig.messagingSenderId || "657921917073",
};

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with specific database ID
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Validate connection to Firestore on boot
if (typeof window !== 'undefined') {
  getDocFromServer(doc(db, 'test', 'connection')).catch((error) => {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or waiting for connection.');
    }
  });
}

// Cloud Collections
const SETTINGS_DOC_REF = doc(db, 'settings', 'system_config');
const EMPLOYEES_COLLECTION_REF = collection(db, 'employees');
const RECORDS_COLLECTION_REF = collection(db, 'attendance_records');

/**
 * Deeply removes any `undefined` values from an object or array.
 * Firestore setDoc strictly forbids `undefined` and throws an error if any field is undefined.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as unknown as T;
  }
  return JSON.parse(JSON.stringify(data));
}

// Enable offline caching if available in browser
if (typeof window !== 'undefined') {
  try {
    enableIndexedDbPersistence(db).catch((err) => {
      // Multiple tabs open or not supported, ignore silently
      console.debug('Firestore offline persistence notice:', err.code);
    });
  } catch {
    // Ignore
  }
}

/**
 * 1. Subscribe to Cloud Settings in Realtime
 */
export function subscribeToCloudSettings(
  onUpdate: (settings: SystemSettings) => void,
  onError?: (err: any) => void
): () => void {
  return onSnapshot(
    SETTINGS_DOC_REF,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as SystemSettings;
        const merged: SystemSettings = {
          ...DEFAULT_SETTINGS,
          ...data,
          location: {
            ...DEFAULT_SETTINGS.location,
            ...(data.location || {}),
          },
          hours: {
            ...DEFAULT_SETTINGS.hours,
            ...(data.hours || {}),
          },
        };
        saveSettings(merged, false); // Cache locally without duplicate synthetic dispatch
        onUpdate(merged);
      } else {
        // If settings doc does not exist yet, NEVER push default settings from client subscription!
        // Doing so from a client or employee phone would overwrite the real company settings!
        const currentStored = typeof window !== 'undefined' ? (getStoredSettings?.() || DEFAULT_SETTINGS) : DEFAULT_SETTINGS;
        onUpdate(currentStored);
      }
    },
    (err) => {
      console.warn('Settings cloud sync listener error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Save Settings to Cloud Firestore
 */
export async function pushSettingsToCloud(settings: SystemSettings): Promise<void> {
  saveSettings(settings, false); // update local cache immediately
  try {
    const cleaned = sanitizeForFirestore(settings);
    await setDoc(SETTINGS_DOC_REF, cleaned, { merge: true });
  } catch (err) {
    console.error('Failed to push settings to cloud:', err);
    throw err;
  }
}

/**
 * 2. Subscribe to Cloud Employees in Realtime
 */
export function subscribeToCloudEmployees(
  onUpdate: (employees: Employee[]) => void,
  onError?: (err: any) => void
): () => void {
  return onSnapshot(
    EMPLOYEES_COLLECTION_REF,
    (snapshot) => {
      if (snapshot.empty) {
        // Cloud collection is empty - do NOT auto-seed from local storage as that resurrects deleted employees!
        saveEmployees([]);
        onUpdate([]);
        return;
      }

      const employeesMap = new Map<string, Employee>();
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Employee;
        const emp: Employee = {
          ...data,
          id: docSnap.id,
        };
        const codeKey = (emp.code || '').trim();
        if (codeKey) {
          const existing = employeesMap.get(codeKey);
          if (!existing) {
            employeesMap.set(codeKey, emp);
          } else {
            // Keep the one with active device binding or preferred record
            if (!existing.boundDeviceId && emp.boundDeviceId) {
              employeesMap.set(codeKey, emp);
            }
          }
        } else {
          employeesMap.set(docSnap.id, emp);
        }
      });

      const employees: Employee[] = Array.from(employeesMap.values());

      // Sort by code
      employees.sort((a, b) => {
        const numA = parseInt(a.code, 10) || 0;
        const numB = parseInt(b.code, 10) || 0;
        return numA - numB;
      });

      saveEmployees(employees); // Cache locally
      onUpdate(employees);
    },
    (err) => {
      console.warn('Employees cloud sync listener error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Push / Update single employee to Cloud
 */
export async function pushEmployeeToCloud(employee: Employee): Promise<void> {
  try {
    const cleaned = sanitizeForFirestore(employee);
    const docRef = doc(EMPLOYEES_COLLECTION_REF, employee.id);
    await setDoc(docRef, cleaned, { merge: true });
  } catch (err) {
    console.error('Failed to push employee to cloud:', err);
    throw err;
  }
}

/**
 * Safely bind device to employee without resurrecting a deleted employee document
 */
export async function bindEmployeeDeviceInCloud(
  employeeId: string,
  deviceId: string,
  deviceName: string
): Promise<void> {
  try {
    const docRef = doc(EMPLOYEES_COLLECTION_REF, employeeId);
    await updateDoc(docRef, {
      boundDeviceId: deviceId,
      boundDeviceName: deviceName,
      boundAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Could not bind employee device in cloud (employee may have been deleted):', err);
  }
}

/**
 * Delete employee from Cloud (with cleanup of duplicate ghost documents matching the same code)
 */
export async function deleteEmployeeFromCloud(employeeId: string, employeeCode?: string): Promise<void> {
  try {
    const docRef = doc(EMPLOYEES_COLLECTION_REF, employeeId);
    await deleteDoc(docRef);

    // If an employee code is provided, also purge any orphan/duplicate docs with that same code
    if (employeeCode && employeeCode.trim()) {
      try {
        const q = query(EMPLOYEES_COLLECTION_REF, where('code', '==', employeeCode.trim()));
        const snap = await getDocs(q);
        for (const d of snap.docs) {
          if (d.id !== employeeId) {
            await deleteDoc(d.ref).catch(() => {});
          }
        }
      } catch (qErr) {
        console.warn('Could not check duplicates for deleted employee:', qErr);
      }
    }
  } catch (err) {
    console.error('Failed to delete employee from cloud:', err);
    throw err;
  }
}

/**
 * 3. Subscribe to Cloud Attendance Records in Realtime
 */
export function subscribeToCloudRecords(
  onUpdate: (records: AttendanceRecord[]) => void,
  onError?: (err: any) => void
): () => void {
  return onSnapshot(
    RECORDS_COLLECTION_REF,
    (snapshot) => {
      if (snapshot.empty) {
        saveRecords([]);
        onUpdate([]);
        return;
      }

      const records: AttendanceRecord[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as AttendanceRecord;
        records.push({
          ...data,
          id: docSnap.id,
        });
      });

      // Sort newest first: prefer ISO createdAt timestamp, fall back to date + checkIn/Out time
      records.sort((a, b) => {
        const timeA = a.createdAt 
          ? new Date(a.createdAt).getTime() 
          : new Date(`${a.date} ${a.checkInTime || a.checkOutTime || '00:00:00'}`).getTime() || 0;
        const timeB = b.createdAt 
          ? new Date(b.createdAt).getTime() 
          : new Date(`${b.date} ${b.checkInTime || b.checkOutTime || '00:00:00'}`).getTime() || 0;
        return timeB - timeA;
      });

      saveRecords(records); // Cache locally
      onUpdate(records);
    },
    (err) => {
      console.warn('Records cloud sync listener error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Push / Update single record to Cloud
 */
export async function pushRecordToCloud(record: AttendanceRecord): Promise<void> {
  try {
    const cleaned = sanitizeForFirestore(record);
    const docRef = doc(RECORDS_COLLECTION_REF, record.id);
    await setDoc(docRef, cleaned, { merge: true });
  } catch (err) {
    console.error('Failed to push record to cloud:', err);
    throw err;
  }
}

/**
 * Delete record from Cloud
 */
export async function deleteRecordFromCloud(recordId: string): Promise<void> {
  try {
    const docRef = doc(RECORDS_COLLECTION_REF, recordId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Failed to delete record from cloud:', err);
    throw err;
  }
}

/**
 * Automatically sync any unsynced local records to Firestore
 * This recovers any records that were saved locally when offline or during prior push issues
 */
export async function syncUnsyncedLocalRecordsToCloud(): Promise<number> {
  try {
    const localRecords = getStoredRecords();
    if (!localRecords || localRecords.length === 0) return 0;

    let synced = 0;
    for (const rec of localRecords) {
      if ((rec as any).isUnsynced === true) {
        try {
          const cleanRec = { ...rec };
          delete (cleanRec as any).isUnsynced;
          await pushRecordToCloud(cleanRec);
          synced++;
        } catch (err) {
          console.warn('Could not auto-sync local record to cloud:', rec.id, err);
        }
      }
    }
    return synced;
  } catch {
    return 0;
  }
}

/**
 * Push all local data (settings, employees, records) to Firebase Cloud
 */
export async function syncAllToCloud(
  settings: SystemSettings,
  employees: Employee[],
  records: AttendanceRecord[]
): Promise<{ success: boolean; count: number }> {
  try {
    await pushSettingsToCloud(settings);

    for (const emp of employees) {
      await pushEmployeeToCloud(emp);
    }

    for (const rec of records) {
      await pushRecordToCloud(rec);
    }

    return { success: true, count: employees.length + records.length };
  } catch (err) {
    console.error('Error uploading all to cloud:', err);
    throw err;
  }
}
