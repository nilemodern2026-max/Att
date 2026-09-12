import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  getDoc,
  getDocs,
  enableIndexedDbPersistence
} from 'firebase/firestore';
import { Employee, AttendanceRecord, SystemSettings } from '../types';
import { DEFAULT_SETTINGS, saveSettings, saveEmployees, saveRecords } from './storage';

// Firebase Client Configuration
export const firebaseConfig = {
  projectId: "ai-studio-applet-webapp-ceedb",
  appId: "1:657921917073:web:0d3a861a153bd3c2d33f30",
  apiKey: "AIzaSyCYViM7Vpt01fOGaTpUIXZPc65fkOs6mnc",
  authDomain: "ai-studio-applet-webapp-ceedb.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-att-d446b4ef-47dc-4bff-8473-3579e810cd2e",
  storageBucket: "ai-studio-applet-webapp-ceedb.firebasestorage.app",
  messagingSenderId: "657921917073",
};

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with specific database ID
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Cloud Collections
const SETTINGS_DOC_REF = doc(db, 'settings', 'system_config');
const EMPLOYEES_COLLECTION_REF = collection(db, 'employees');
const RECORDS_COLLECTION_REF = collection(db, 'attendance_records');

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
        saveSettings(merged); // Cache locally
        onUpdate(merged);
      } else {
        // If settings not yet in cloud, seed them once with current default
        pushSettingsToCloud(DEFAULT_SETTINGS).catch(console.error);
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
  saveSettings(settings); // update local cache immediately
  try {
    await setDoc(SETTINGS_DOC_REF, settings, { merge: true });
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
      const employees: Employee[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Employee;
        employees.push({
          ...data,
          id: docSnap.id,
        });
      });

      // Sort by code or creation
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
    const docRef = doc(EMPLOYEES_COLLECTION_REF, employee.id);
    await setDoc(docRef, employee, { merge: true });
  } catch (err) {
    console.error('Failed to push employee to cloud:', err);
    throw err;
  }
}

/**
 * Delete employee from Cloud
 */
export async function deleteEmployeeFromCloud(employeeId: string): Promise<void> {
  try {
    const docRef = doc(EMPLOYEES_COLLECTION_REF, employeeId);
    await deleteDoc(docRef);
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
      const records: AttendanceRecord[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as AttendanceRecord;
        records.push({
          ...data,
          id: docSnap.id,
        });
      });

      // Sort newest first
      records.sort((a, b) => {
        const timeA = new Date(`${a.date} ${a.checkInTime || '00:00:00'}`).getTime() || 0;
        const timeB = new Date(`${b.date} ${b.checkInTime || '00:00:00'}`).getTime() || 0;
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
    const docRef = doc(RECORDS_COLLECTION_REF, record.id);
    await setDoc(docRef, record, { merge: true });
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
