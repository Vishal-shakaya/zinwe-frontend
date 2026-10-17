/**
 * What the owner's plan switches on, from GET me/ `entitlements` (the backend enforces it:
 * z_auth/entitlements.py). Pages ask `has(module)` and show <PlanLock> for what's locked.
 *
 * Until GET me/ answers, or against an older backend without `entitlements`, nothing is
 * locked: a moment of an unlocked page beats a flash of upgrade cards on a paid plan.
 */
import { useAuth } from "../../auth/authContext";
import type { PlanModule } from "../../lib/api";

export interface EntitlementsApi {
  /** False only when the plan is known and doesn't include `module`. */
  has: (module: PlanModule) => boolean;
  /** The cheapest plan that unlocks `module` (null when the plan has it or none does). */
  upgradeFor: (module: PlanModule) => { code: string; name: string } | null;
  planName: string | null;
  /** 0 = no limit. */
  maxDevices: number;
  devicesUsed: number;
  /** Every PC slot on the plan is taken (adding another will be refused). */
  atDeviceLimit: boolean;
  /** Days of history the plan keeps (0 = no limit): older alerts, usage and work log are hidden. */
  historyDays: number;
}

/** Short, owner-language name of each module, for lock cards. */
export const MODULE_TITLES: Record<PlanModule, string> = {
  usb_alerts: "USB drive and file-copy alerts",
  usb_control: "Block USB drives",
  data_transfer: "Files leaving by network, Outlook or upload",
  remote_access: "Remote-access tools",
  software_installs: "New software alerts",
  web: "Website protection",
  work_time: "Work hours and breaks",
  app_usage: "App usage",
  team_chat: "Chat with your team",
  alert_to_employee: "Email an alert to the employee",
};

export function useEntitlements(): EntitlementsApi {
  const { account } = useAuth();
  const ent = account?.entitlements;
  const maxDevices = ent?.max_devices ?? 0;
  const devicesUsed = ent?.devices_used ?? 0;
  return {
    has: (module) => !ent || ent.modules.includes(module),
    upgradeFor: (module) => (ent && !ent.modules.includes(module) ? (ent.upgrade_for[module] ?? null) : null),
    planName: ent?.plan_name ?? null,
    maxDevices,
    devicesUsed,
    atDeviceLimit: maxDevices > 0 && devicesUsed >= maxDevices,
    historyDays: ent?.history_days ?? 0,
  };
}
