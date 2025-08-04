// import { backupAllDataToSheets, isUserAuthenticated } from './google-sheets';

// GOOGLE BACKUP TEMPORARILY DISABLED
// Backup service configuration
const BACKUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const BACKUP_STORAGE_KEY = 'sales_app_last_backup';

export class AutoBackupService {
  private static instance: AutoBackupService;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  private constructor() {}

  public static getInstance(): AutoBackupService {
    if (!AutoBackupService.instance) {
      AutoBackupService.instance = new AutoBackupService();
    }
    return AutoBackupService.instance;
  }

  // Start automatic backup service - DISABLED
  public start(): void {
    console.log('AutoBackupService: Google backup temporarily disabled');
    return; // Early return to disable the service
    
    if (this.isRunning) return;

    this.isRunning = true;
    this.scheduleNextBackup();
    console.log('AutoBackupService started');
  }

  // Stop automatic backup service
  public stop(): void {
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('AutoBackupService stopped');
  }

  // Check if backup is needed and schedule next backup
  private scheduleNextBackup(): void {
    // DISABLED - return early to prevent Google Sheets backup
    return;
    
    const lastBackup = this.getLastBackupTime();
    const now = Date.now();
    const timeSinceLastBackup = now - lastBackup;

    let nextBackupDelay = BACKUP_INTERVAL - timeSinceLastBackup;

    // If it's been more than 24 hours, backup immediately
    if (nextBackupDelay <= 0) {
      nextBackupDelay = 5000; // Wait 5 seconds then backup
    }

    this.intervalId = setTimeout(async () => {
      await this.performBackup();
      this.scheduleNextBackup(); // Schedule the next backup
    }, nextBackupDelay);

    console.log(`Next backup scheduled in ${Math.round(nextBackupDelay / 1000 / 60)} minutes`);
  }

  // Perform the actual backup
  private async performBackup(): Promise<void> {
    console.log('Google backup temporarily disabled');
    return;
    
    // Disabled Google backup functionality
    /*
    try {
      // Only backup if user is authenticated
      if (!isUserAuthenticated()) {
        console.log('User not authenticated for Google Sheets, skipping auto backup');
        return;
      }

      console.log('Starting automatic backup to Google Sheets...');
      const results = await backupAllDataToSheets();

      const successCount = Object.values(results).filter(Boolean).length;
      const totalCount = Object.keys(results).length;

      if (successCount === totalCount) {
        console.log('Automatic backup completed successfully');
        this.setLastBackupTime(Date.now());
      } else {
        console.warn(`Automatic backup completed with some issues: ${successCount}/${totalCount} successful`);
      }

      // Store backup status for UI
      this.storeBackupStatus(results);

    } catch (error) {
      console.error('Error during automatic backup:', error);
    }
    */
  }

  // Get last backup timestamp
  private getLastBackupTime(): number {
    try {
      const lastBackup = localStorage.getItem(BACKUP_STORAGE_KEY);
      return lastBackup ? parseInt(lastBackup, 10) : 0;
    } catch {
      return 0;
    }
  }

  // Set last backup timestamp
  private setLastBackupTime(timestamp: number): void {
    try {
      localStorage.setItem(BACKUP_STORAGE_KEY, timestamp.toString());
    } catch (error) {
      console.error('Error storing backup timestamp:', error);
    }
  }

  // Store backup status for UI display
  private storeBackupStatus(results: any): void {
    try {
      const status = {
        timestamp: Date.now(),
        results,
        success: Object.values(results).every(Boolean)
      };
      localStorage.setItem('sales_app_backup_status', JSON.stringify(status));
    } catch (error) {
      console.error('Error storing backup status:', error);
    }
  }

  // Get backup status for UI
  public static getBackupStatus(): {
    lastBackup: Date | null;
    nextBackup: Date | null;
    isSuccessful: boolean;
    results: any;
  } {
    try {
      const statusStr = localStorage.getItem('sales_app_backup_status');
      const lastBackupStr = localStorage.getItem(BACKUP_STORAGE_KEY);

      let lastBackup: Date | null = null;
      let isSuccessful = false;
      let results = null;

      if (statusStr) {
        const status = JSON.parse(statusStr);
        lastBackup = new Date(status.timestamp);
        isSuccessful = status.success;
        results = status.results;
      } else if (lastBackupStr) {
        lastBackup = new Date(parseInt(lastBackupStr, 10));
        isSuccessful = true; // Assume successful if no detailed status
      }

      const nextBackup = lastBackup 
        ? new Date(lastBackup.getTime() + BACKUP_INTERVAL)
        : new Date(Date.now() + BACKUP_INTERVAL);

      return {
        lastBackup,
        nextBackup,
        isSuccessful,
        results
      };
    } catch (error) {
      console.error('Error getting backup status:', error);
      return {
        lastBackup: null,
        nextBackup: null,
        isSuccessful: false,
        results: null
      };
    }
  }

  // Force an immediate backup
  public async forceBackup(): Promise<boolean> {
    console.log('Google backup temporarily disabled');
    return false;
    
    // Disabled Google backup functionality
    /*
    try {
      if (!isUserAuthenticated()) {
        throw new Error('User not authenticated for Google Sheets');
      }

      const results = await backupAllDataToSheets();
      const successCount = Object.values(results).filter(Boolean).length;
      const totalCount = Object.keys(results).length;

      if (successCount === totalCount) {
        this.setLastBackupTime(Date.now());
        this.storeBackupStatus(results);
        return true;
      } else {
        this.storeBackupStatus(results);
        return false;
      }
    } catch (error) {
      console.error('Error during forced backup:', error);
      return false;
    }
    */
  }

  // Get service status
  public isServiceRunning(): boolean {
    return this.isRunning;
  }
}

// Export singleton instance
export const autoBackupService = AutoBackupService.getInstance();
